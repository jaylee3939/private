import {json,db,publicConfig,DatabaseError,type Request,type Response} from '../server/http.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
 const token=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1]
 if(!token)return json(res,401,{error:'Login required'})
 try{
  const config=publicConfig();if(!config.url||!config.key)return json(res,503,{error:'Not configured',errorCode:'PUBLIC_CONFIG_INVALID'})
  const auth=await fetch(`${config.url}/auth/v1/user`,{headers:{apikey:config.key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)})
  if(!auth.ok)return json(res,auth.status===401||auth.status===403?401:503,{error:'Unable to verify login',errorCode:auth.status===401||auth.status===403?'LOGIN_INVALID':'AUTH_UNAVAILABLE'})
  const user=await auth.json();if(typeof user.id!=='string'||!/^[0-9a-f-]{36}$/i.test(user.id))return json(res,401,{error:'Invalid identity'})
  const admins=await db(`/rest/v1/plum_admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`)
  if(!Array.isArray(admins)||admins.length!==1)return json(res,403,{error:'Administrator access required'})
  const url=new URL(req.url||'/api/admin','https://local.invalid');const from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||''
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||from>to||(Date.parse(to)-Date.parse(from))/86400000>92)return json(res,400,{error:'Select a date range of up to 93 days'})
  const metrics=await db('/rest/v1/rpc/plum_metrics',{method:'POST',body:JSON.stringify({p_from:from,p_to:to})})
  return json(res,200,metrics)
 }catch(e){const code=e instanceof DatabaseError?(e.status===401?'DATABASE_AUTH_FAILED':e.status===403?'DATABASE_ACCESS_DENIED':e.status===404?'DATABASE_SCHEMA_MISSING':'DATABASE_UNAVAILABLE'):'SERVICE_UNAVAILABLE';return json(res,503,{error:'Unable to load dashboard',errorCode:code})}
}
