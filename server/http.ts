import type {IncomingMessage,ServerResponse} from 'node:http'
export type Request=IncomingMessage & {body?:unknown}
export type Response=ServerResponse
export function json(res:Response,status:number,value:unknown){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(value))}
export function env(name:string){return process.env[name]?.trim()||''}
export type CheckState='missing'|'invalid'|'ready'|'present'|'server_key_rejected'|'enabled'|'disabled'|'public_key_rejected'|'project_mismatch'|'expired'
// Operator confirmed retention active and storage verification PASS.
// Collection still requires DATA_COLLECTION_ENABLED=true and all runtime prerequisites.
export const COLLECTION_RELEASE_READY=true
function projectURL(){
 try{const u=new URL(env('SUPABASE_URL'));if(u.protocol==='https:'&&/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&(u.pathname==='/'||u.pathname==='')&&!u.search&&!u.hash)return u.origin}catch{}
 return ''
}
function publicKeyState():CheckState{
 const key=env('SUPABASE_ANON_KEY');if(!key)return 'missing'
 if(key.startsWith('sb_secret_'))return 'server_key_rejected'
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return 'ready'
 try{const role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role;if(role==='service_role')return 'server_key_rejected';if(key.split('.').length===3&&role==='anon')return 'ready'}catch{}
 return 'invalid'
}
// Structural checks only. Supabase remains the authority on signature/revocation.
export function serverKeyState():CheckState{
 const key=env('SUPABASE_SERVICE_ROLE_KEY');if(!key)return 'missing'
 if(key.startsWith('sb_publishable_'))return 'public_key_rejected'
 if(/^sb_secret_[A-Za-z0-9_-]+$/.test(key))return 'ready'
 try{
  if(key.split('.').length!==3)return 'invalid'
  const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString())
  if(payload.role==='anon')return 'public_key_rejected'
  if(payload.role!=='service_role')return 'invalid'
  if(typeof payload.exp==='number'&&payload.exp<=Date.now()/1000)return 'expired'
  const url=projectURL()
  if(url&&typeof payload.ref==='string'&&payload.ref!==new URL(url).hostname.split('.')[0])return 'project_mismatch'
  return 'ready'
 }catch{return 'invalid'}
}
export function publicConfig(){return {url:projectURL(),key:publicKeyState()==='ready'?env('SUPABASE_ANON_KEY'):''}}
export function configurationChecks():Record<string,CheckState>{
 const flag=(key:string):CheckState=>!env(key)?'missing':env(key)==='true'?'enabled':env(key)==='false'?'disabled':'invalid'
 let origin:CheckState='missing';if(env('SITE_ORIGIN'))try{const u=new URL(env('SITE_ORIGIN'));origin=u.protocol==='https:'&&!u.username&&!u.password?'ready':'invalid'}catch{origin='invalid'}
 return {SUPABASE_URL:projectURL()?'ready':env('SUPABASE_URL')?'invalid':'missing',SUPABASE_ANON_KEY:publicKeyState(),SUPABASE_SERVICE_ROLE_KEY:serverKeyState(),SITE_ORIGIN:origin,PRIVACY_CONTACT:env('PRIVACY_CONTACT')?'present':'missing',RETENTION_JOB_READY:flag('RETENTION_JOB_READY'),DATA_COLLECTION_ENABLED:flag('DATA_COLLECTION_ENABLED')}
}
export function enabled(){const c=publicConfig();return Boolean(COLLECTION_RELEASE_READY&&c.url&&c.key&&serverKeyState()==='ready'&&env('PRIVACY_CONTACT')&&env('DATA_COLLECTION_ENABLED')==='true'&&env('RETENTION_JOB_READY')==='true')}
export class DatabaseError extends Error {status:number;errorCode?:string;databaseCode?:string;constructor(status:number,errorCode?:string,databaseCode?:string){super('Database request failed');this.status=status;this.errorCode=errorCode;this.databaseCode=databaseCode}}
// Never return/log upstream messages, details, hints, credentials or response bodies.
export function databaseFailure(error:unknown){
 if(error instanceof DatabaseError)return {errorCode:error.errorCode||(error.status===401?'DATABASE_AUTH_FAILED':error.status===403?'DATABASE_ACCESS_DENIED':error.status===404?'DATABASE_RPC_MISSING':error.status===429?'DATABASE_RATE_LIMITED':'DATABASE_REQUEST_FAILED'),upstreamStatus:error.status,...(error.databaseCode?{databaseCode:error.databaseCode}:{})}
 const e=error as {name?:string;cause?:{code?:string}}
 return {errorCode:e?.name==='TimeoutError'||e?.name==='AbortError'?'DATABASE_TIMEOUT':e?.cause?.code==='ENOTFOUND'||e?.cause?.code==='EAI_AGAIN'?'DATABASE_DNS_FAILED':'DATABASE_CONNECTION_FAILED'}
}
export function sameOrigin(req:Request){try{return req.headers.origin===new URL(env('SITE_ORIGIN')||'https://private-atv6.vercel.app').origin}catch{return false}}
export function body(req:Request):unknown{const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null);if(Buffer.byteLength(raw)>8192)throw Error('Too large');return JSON.parse(raw)}
export async function db(path:string,init:RequestInit={}){
 const url=projectURL(),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url)throw new DatabaseError(503,'PUBLIC_CONFIG_INVALID')
 const state=serverKeyState();if(state!=='ready'){const codes:Record<string,string>={missing:'SERVER_KEY_MISSING',public_key_rejected:'SERVER_KEY_PUBLIC',project_mismatch:'SERVER_KEY_PROJECT_MISMATCH',expired:'SERVER_KEY_EXPIRED'};throw new DatabaseError(503,codes[state]||'SERVER_KEY_INVALID')}
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})}
 const response=await fetch(`${url}${path}`,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(10000)})
 if(!response.ok){
  const problem=await response.json().catch(()=>null)
  const databaseCode=typeof problem?.code==='string'&&/^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(problem.code)?problem.code:undefined
  const reasons:Record<string,string>={'Visit required':'VISIT_REQUIRED','Start required':'START_REQUIRED','Invalid session':'SESSION_REJECTED','Incomplete quiz':'INCOMPLETE_QUIZ','Tie answer required':'TIE_ANSWER_REQUIRED','Result mismatch':'RESULT_MISMATCH','New session rate limit':'SESSION_RATE_LIMIT','Session event limit':'EVENT_RATE_LIMIT','Already completed':'ALREADY_COMPLETED'}
  const reason=typeof problem?.message==='string'?reasons[problem.message]:undefined
  throw new DatabaseError(response.status,reason,databaseCode)
 }
 if(response.status===204)return null
 try{return await response.json()}catch{throw new DatabaseError(502,'DATABASE_RESPONSE_INVALID')}
}
