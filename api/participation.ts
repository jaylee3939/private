import {json,databaseFailure,DatabaseError,type Request,type Response} from '../server/http.js'
import {readParticipationStatus} from '../server/participation-status.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 const session=new URL(req.url||'/api/participation','https://local.invalid').searchParams.get('session')||''
 const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
 if(!token||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(session))return json(res,401,{errorCode:'SESSION_AUTH_REQUIRED'})
 try{return json(res,200,await readParticipationStatus(session,token))}
 catch(error){return json(res,error instanceof DatabaseError&&error.errorCode==='SESSION_NOT_CONFIRMED'?404:503,databaseFailure(error))}
}
