import {test} from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/config.ts'
import {publicConfig,configurationChecks,enabled} from '../server/http.ts'
import {getConfig} from '../src/telemetry.ts'
function res(){let value:any,status=0;return {response:{set statusCode(n:number){status=n},setHeader:()=>{},end:(s:string)=>{value=JSON.parse(s)}} as any,get:()=>({value,status})}}
test('seven server settings are classified safely; publishable/anon accepted, secret rejected',()=>{
 const before={...process.env}
 try{
  for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SITE_ORIGIN','PRIVACY_CONTACT','RETENTION_JOB_READY','DATA_COLLECTION_ENABLED'])delete process.env[key]
  let r=res();handler({method:'GET',url:'/api/config?diagnostics=1'} as any,r.response);assert.equal(r.get().value.authReady,false);assert.equal(Object.keys(r.get().value.checks).length,7)
  process.env.SUPABASE_URL=' https://PLUM-Test.supabase.co/ ';process.env.SUPABASE_ANON_KEY='sb_publishable_public-test';process.env.SUPABASE_SERVICE_ROLE_KEY='server-secret-do-not-expose';process.env.SITE_ORIGIN='https://private-atv6.vercel.app';process.env.PRIVACY_CONTACT='contact@example.com';process.env.RETENTION_JOB_READY='true';process.env.DATA_COLLECTION_ENABLED='true'
  assert.equal(publicConfig().url,'https://plum-test.supabase.co');assert.equal(publicConfig().key,'sb_publishable_public-test');assert.equal(enabled(),false)
  r=res();handler({method:'GET',url:'/api/config?diagnostics=1'} as any,r.response)
  const safe=JSON.stringify(r.get().value);for(const secret of ['server-secret-do-not-expose','sb_publishable_public-test','contact@example.com','https://plum-test.supabase.co'])assert.equal(safe.includes(secret),false)
  assert.equal(r.get().value.authReady,true);assert.equal(r.get().value.auth,undefined)
  process.env.SUPABASE_ANON_KEY='sb_secret_not-for-browser';r=res();handler({method:'GET'} as any,r.response);assert.equal(r.get().value.auth,null);assert.equal(JSON.stringify(r.get().value).includes('sb_secret_not-for-browser'),false);assert.equal(configurationChecks().SUPABASE_ANON_KEY,'server_key_rejected')
  const jwt=(role:string)=>`e30.${Buffer.from(JSON.stringify({role})).toString('base64url')}.test`
  process.env.SUPABASE_ANON_KEY=jwt('service_role');assert.equal(publicConfig().key,'')
  process.env.SUPABASE_ANON_KEY=jwt('anon');assert.ok(publicConfig().key)
  process.env.SUPABASE_URL='https://supabase.com/dashboard/project/example';assert.equal(configurationChecks().SUPABASE_URL,'invalid')
 }finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
})
test('frontend distinguishes missing/failed API, HTML response and network failure',async()=>{
 const before=globalThis.fetch
 try{
  globalThis.fetch=async()=>new Response('not found',{status:404});assert.equal((await getConfig()).loadError,'CONFIG_HTTP_404')
  globalThis.fetch=async()=>new Response('failed',{status:500});assert.equal((await getConfig()).loadError,'CONFIG_HTTP_500')
  globalThis.fetch=async()=>new Response('<html>page</html>',{headers:{'Content-Type':'text/html'}});assert.equal((await getConfig()).loadError,'CONFIG_NOT_JSON')
  globalThis.fetch=async()=>{throw Error('network')};assert.equal((await getConfig()).loadError,'CONFIG_NETWORK_ERROR')
  globalThis.fetch=async()=>new Response(JSON.stringify({collectionEnabled:false,auth:null}),{headers:{'Content-Type':'application/json'}});assert.equal((await getConfig()).loadError,undefined)
 }finally{globalThis.fetch=before}
})
