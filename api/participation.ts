import {json,db,databaseFailure,DatabaseError,type Request,type Response} from '../server/http.js'
import {authorizeAdmin} from '../server/admin-auth.js'
import {readParticipationStatus} from '../server/participation-status.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 try{
  if(!await authorizeAdmin(req,res))return
  const session=new URL(req.url||'/api/participation','https://local.invalid').searchParams.get('session')||''
  if(!session)return json(res,200,{sessions:await db('/rest/v1/plum_sessions?select=id,created_at,started_at,completed_at&order=created_at.desc&limit=10')})
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(session))return json(res,400,{errorCode:'SESSION_ID_INVALID'})
  return json(res,200,await readParticipationStatus(session))
 }catch(error){return json(res,error instanceof DatabaseError&&error.errorCode==='SESSION_NOT_CONFIRMED'?404:503,databaseFailure(error))}
}
