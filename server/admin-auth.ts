import {json,db,publicConfig,type Request,type Response} from './http.js'
// Shared by analytics, content editing and image uploads; membership is server-only.
export async function authorizeAdmin(req:Request,res:Response):Promise<boolean>{
 const token=req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1]
 if(!token){json(res,401,{error:'Login required'});return false}
 const config=publicConfig();if(!config.url||!config.key){json(res,503,{error:'Not configured',errorCode:'PUBLIC_CONFIG_INVALID'});return false}
 const auth=await fetch(`${config.url}/auth/v1/user`,{headers:{apikey:config.key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)})
 if(!auth.ok){json(res,auth.status===401||auth.status===403?401:503,{error:'Unable to verify login',errorCode:auth.status===401||auth.status===403?'LOGIN_INVALID':'AUTH_UNAVAILABLE'});return false}
 const user=await auth.json();if(typeof user.id!=='string'||!/^[0-9a-f-]{36}$/i.test(user.id)){json(res,401,{error:'Invalid identity'});return false}
 const admins=await db(`/rest/v1/plum_admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`)
 if(!Array.isArray(admins)||admins.length!==1){json(res,403,{error:'Administrator access required'});return false}
 return true
}
