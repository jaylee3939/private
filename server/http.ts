import type {IncomingMessage,ServerResponse} from 'node:http'
export type Request=IncomingMessage & {body?:unknown}
export type Response=ServerResponse
export function json(res:Response,status:number,value:unknown){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(value))}
export function env(name:string){return process.env[name]?.trim()||''}
export function publicConfig(){
 const url=env('SUPABASE_URL').replace(/\/+$/,''),key=env('SUPABASE_ANON_KEY')
 let safe=key.startsWith('sb_publishable_')
 try{safe ||= JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role==='anon'}catch{}
 return {url:/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)?url:'',key:safe?key:''}
}
export function enabled(){const c=publicConfig();return Boolean(c.url&&c.key&&env('SUPABASE_SERVICE_ROLE_KEY')&&env('PRIVACY_CONTACT')&&env('DATA_COLLECTION_ENABLED')==='true'&&env('RETENTION_JOB_READY')==='true')}
export function sameOrigin(req:Request){try{return req.headers.origin===new URL(env('SITE_ORIGIN')||'https://private-atv6.vercel.app').origin}catch{return false}}
export function body(req:Request):unknown{const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??null);if(Buffer.byteLength(raw)>8192)throw Error('Too large');return JSON.parse(raw)}
export async function db(path:string,init:RequestInit={}){
 const url=env('SUPABASE_URL').replace(/\/+$/,''),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw Error('Not configured')
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})}
 const response=await fetch(`${url}${path}`,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(10000)})
 if(!response.ok)throw Error('Database request failed')
 return response.status===204?null:response.json()
}
