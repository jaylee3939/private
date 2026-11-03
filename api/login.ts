import {json,body,sameOrigin,publicConfig,type Request,type Response} from '../server/http.js'
// Passwords/tokens are never logged or persisted. Supabase enforces login limits.
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST')return json(res,405,{errorCode:'METHOD_NOT_ALLOWED'})
 if(!sameOrigin(req))return json(res,403,{errorCode:'ORIGIN_REJECTED'})
 const c=publicConfig()
 if(!c.url||!c.key)return json(res,503,{errorCode:'PUBLIC_CONFIG_INVALID'})
 let credentials:{email:string;password:string}
 try{
  const input=body(req) as Record<string,unknown>|null
  if(!input||typeof input.email!=='string'||typeof input.password!=='string'||!input.email.trim()||input.email.length>320||!input.password||input.password.length>4096)return json(res,400,{errorCode:'INPUT_INVALID'})
  credentials={email:input.email.trim(),password:input.password}
 }catch{return json(res,400,{errorCode:'INPUT_INVALID'})}
 try{
  const r=await fetch(`${c.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(credentials),signal:AbortSignal.timeout(10000),redirect:'error'})
  const value=await r.json().catch(()=>null)
  if(!r.ok){
   const code=value?.code
   const errorCode=r.status===429?'AUTH_RATE_LIMITED':code==='email_not_confirmed'?'EMAIL_NOT_CONFIRMED':code==='invalid_credentials'?'INVALID_CREDENTIALS':r.status===401||r.status===403?'AUTH_REQUEST_REJECTED':r.status>=500?'AUTH_UPSTREAM_ERROR':r.status===400?'INVALID_CREDENTIALS':'AUTH_REQUEST_REJECTED'
   return json(res,r.status>=500?502:r.status,{errorCode,upstreamStatus:r.status})
  }
  if(typeof value?.access_token!=='string'||!value.access_token)return json(res,502,{errorCode:'AUTH_RESPONSE_INVALID'})
  return json(res,200,{access_token:value.access_token,expires_in:typeof value.expires_in==='number'&&value.expires_in>0?value.expires_in:3600})
 }catch(e){
  const timeout=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError')
  const cause=(e as {cause?:{code?:string}})?.cause?.code
  const errorCode=timeout?'AUTH_TIMEOUT':cause==='ENOTFOUND'||cause==='EAI_AGAIN'?'AUTH_DNS_FAILED':cause==='CERT_HAS_EXPIRED'||cause==='UNABLE_TO_VERIFY_LEAF_SIGNATURE'||cause==='ERR_TLS_CERT_ALTNAME_INVALID'?'AUTH_TLS_FAILED':'AUTH_NETWORK_FAILED'
  return json(res,timeout?504:502,{errorCode})
 }
}
