import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import events from '../api/events.ts'
import admin from '../api/admin.ts'
import config from '../api/config.ts'
const origin='https://private-atv6.vercel.app'
function response(){let status=0,text='';const headers:Record<string,string>={};return {response:{set statusCode(n:number){status=n},setHeader:(k:string,v:string)=>{headers[k]=v},end:(v:string)=>{text=v}} as any,value:()=>({status,body:JSON.parse(text),headers})}}
const payload=()=>({sessionId:randomUUID(),eventId:randomUUID(),token:'a'.repeat(64),kind:'visit',consent:true,adultConfirmed:true,consentVersion:'plum-responses-v1'})
test('Vercel routes fail closed, isolate admins and never return a service key',async()=>{
 const old={...process.env},fetchBefore=globalThis.fetch
 try{
  process.env.SUPABASE_URL='https://plum-test.supabase.co';process.env.SUPABASE_ANON_KEY=`e30.${Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')}.test`;process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_server-only-test-key';process.env.DATA_COLLECTION_ENABLED='false';process.env.RETENTION_JOB_READY='true';process.env.PRIVACY_CONTACT='privacy@example.com';process.env.SITE_ORIGIN=origin
  const paths:string[]=[];globalThis.fetch=async(url:any)=>{paths.push(String(url));return new Response('null',{status:200})}
  let r=response();await events({method:'POST',headers:{origin},body:payload()} as any,r.response);assert.equal(r.value().status,503);assert.equal(paths.length,0)
  process.env.DATA_COLLECTION_ENABLED='true'
  r=response();await events({method:'POST',headers:{origin:'https://wrong.example'},body:payload()} as any,r.response);assert.equal(r.value().status,403)
  r=response();await events({method:'POST',headers:{origin},body:{...payload(),consent:false}} as any,r.response);assert.equal(r.value().status,400)
  r=response();await events({method:'POST',headers:{origin},body:payload()} as any,r.response);assert.equal(r.value().status,200);assert.equal(paths.length,1) // mocked storage only; production settings are never changed
  process.env.DATA_COLLECTION_ENABLED='false'
  r=response();await events({method:'POST',headers:{origin},body:payload()} as any,r.response);assert.equal(r.value().status,503);assert.equal(paths.length,1)
  r=response();config({method:'GET'} as any,r.response);assert.equal(JSON.stringify(r.value().body).includes('sb_secret_server-only-test-key'),false);assert.equal(r.value().body.collectionEnabled,false);assert.equal(r.value().body.collectionLocked,false);assert.equal(r.value().body.authReady,true)
  process.env.SUPABASE_ANON_KEY='sb_secret_server-only-test-key';r=response();config({method:'GET'} as any,r.response);assert.equal(r.value().body.auth,null);process.env.SUPABASE_ANON_KEY=`e30.${Buffer.from('{"role":"anon"}').toString('base64url')}.test`
  r=response();await admin({method:'GET',headers:{},url:'/api/admin'} as any,r.response);assert.equal(r.value().status,401)
  globalThis.fetch=async(url:any)=>new Response(String(url).includes('/auth/v1/user')?JSON.stringify({id:'11111111-1111-4111-8111-111111111111'}):'[]',{status:200})
  r=response();await admin({method:'GET',headers:{authorization:'Bearer test-token'},url:'/api/admin?from=2026-11-01&to=2026-11-03'} as any,r.response);assert.equal(r.value().status,403)
  globalThis.fetch=async(url:any)=>new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'11111111-1111-4111-8111-111111111111'}:String(url).includes('/plum_admins')?[{user_id:'11111111-1111-4111-8111-111111111111'}]:{visits:2,starts:1,completions:1,daily:[],results:[],answers:[]}),{status:200})
  r=response();await admin({method:'GET',headers:{authorization:'Bearer test-token'},url:'/api/admin?from=2026-11-01&to=2026-11-03'} as any,r.response);assert.equal(r.value().status,200);assert.equal(r.value().body.completions,1)
  for(const range of ['from=2026-02-31&to=2026-03-05','from=2026-01-01&to=2026-12-31','from=2026-11-03&to=2026-11-01']){r=response();await admin({method:'GET',headers:{authorization:'Bearer test-token'},url:'/api/admin?'+range} as any,r.response);assert.equal(r.value().status,400)}
 }finally{globalThis.fetch=fetchBefore;for(const name of Object.keys(process.env))if(!(name in old))delete process.env[name];Object.assign(process.env,old)}
})
