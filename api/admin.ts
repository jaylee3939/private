import {authorizeAdmin} from '../server/admin-auth.js'
import {json,db,DatabaseError,type Request,type Response} from '../server/http.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
 try{
  if(!await authorizeAdmin(req,res))return
  const url=new URL(req.url||'/api/admin','https://local.invalid');const from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||''
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||new Date(from).toISOString().slice(0,10)!==from||new Date(to).toISOString().slice(0,10)!==to||from>to||(Date.parse(to)-Date.parse(from))/86400000>92)return json(res,400,{error:'Select a date range of up to 93 days'})
  const metrics=await db('/rest/v1/rpc/plum_metrics',{method:'POST',body:JSON.stringify({p_from:from,p_to:to})})
  return json(res,200,metrics)
 }catch(e){const code=e instanceof DatabaseError?(e.errorCode||(e.status===401?'DATABASE_AUTH_FAILED':e.status===403?'DATABASE_ACCESS_DENIED':e.status===404?'DATABASE_SCHEMA_MISSING':'DATABASE_UNAVAILABLE')):'SERVICE_UNAVAILABLE';return json(res,503,{error:'Unable to load dashboard',errorCode:code})}
}
