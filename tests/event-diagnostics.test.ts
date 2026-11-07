import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import events from '../api/events.ts'
const origin='https://private-atv6.vercel.app'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(s:string){value=JSON.parse(s)}} as any,get:()=>({status,value})}}
test('storage failures distinguish origin, consent, disabled collection, RPC permissions and DNS without sensitive logs',async()=>{
 const old={...process.env},fetchBefore=globalThis.fetch,warn=console.warn,info=console.info;const logs:unknown[]=[]
 const input={sessionId:randomUUID(),eventId:randomUUID(),token:'c'.repeat(64),kind:'visit',adultConfirmed:true,consent:true,consentVersion:'plum-responses-v1'}
 const req={method:'POST',headers:{origin},body:input} as any
 try{
  console.warn=(...a:unknown[])=>{logs.push(a)};console.info=console.warn
  Object.assign(process.env,{SUPABASE_URL:'https://diagnostic-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic-private',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'test@example.com',SITE_ORIGIN:origin})
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response(null,{status:204})}
  let r=response();await events({...req,headers:{origin:'https://other.example'}},r.res);assert.equal(r.get().value.errorCode,'ORIGIN_REJECTED');assert.equal(calls,0)
  r=response();await events({...req,body:{...input,consent:false}},r.res);assert.equal(r.get().value.errorCode,'INVALID_EVENT');assert.equal(calls,0)
  process.env.DATA_COLLECTION_ENABLED='false';r=response();await events(req,r.res);assert.equal(r.get().value.errorCode,'COLLECTION_DISABLED');assert.equal(calls,0);process.env.DATA_COLLECTION_ENABLED='true'
  for(const [status,code,expected] of [[401,'PGRST301','DATABASE_AUTH_FAILED'],[403,'42501','DATABASE_ACCESS_DENIED'],[404,'PGRST202','DATABASE_RPC_MISSING'],[400,'P0001','DATABASE_REQUEST_FAILED']] as const){
   globalThis.fetch=async()=>new Response(JSON.stringify({code,message:'sensitive message',details:input.token,hint:process.env.SUPABASE_SERVICE_ROLE_KEY}),{status})
   r=response();await events(req,r.res);assert.equal(r.get().value.errorCode,expected);assert.equal(r.get().value.upstreamStatus,status);assert.equal(r.get().value.databaseCode,code);assert.equal(r.get().value.stage,'visit');assert.match(r.get().value.requestId,/^[a-f0-9-]{36}$/)
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({code:'P0001',message:'Start required'}),{status:400});r=response();await events(req,r.res);assert.equal(r.get().value.errorCode,'START_REQUIRED')
  globalThis.fetch=async()=>{throw new TypeError('secret',{cause:{code:'ENOTFOUND'}})};r=response();await events(req,r.res);assert.equal(r.get().value.errorCode,'DATABASE_DNS_FAILED')
  globalThis.fetch=async()=>new Response('<html>wrong response</html>');r=response();await events(req,r.res);assert.equal(r.get().value.errorCode,'DATABASE_RESPONSE_INVALID')
  globalThis.fetch=async()=>new Response(null,{status:204});r=response();await events(req,r.res);assert.equal(r.get().status,200);assert.equal(r.get().value.stored,true);assert.equal(r.get().value.eventId,input.eventId)
  const safe=JSON.stringify(logs);for(const forbidden of [input.token,input.sessionId,input.eventId,'sb_secret_synthetic-private','sensitive message','answers','BMR'])assert.equal(safe.includes(forbidden),false)
 }finally{globalThis.fetch=fetchBefore;console.warn=warn;console.info=info;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old)}
})
