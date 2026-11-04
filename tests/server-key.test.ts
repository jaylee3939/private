import {test} from 'node:test'
import assert from 'node:assert/strict'
import {db,serverKeyState,configurationChecks,DatabaseError} from '../server/http.ts'
const jwt=(payload:object)=>`e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.synthetic`
test('server keys reject public, malformed, expired and wrong-project values without exposing credentials',async()=>{
 const before={...process.env},fetchBefore=globalThis.fetch;let calls=0
 try{
  process.env.SUPABASE_URL='https://plum-test.supabase.co'
  globalThis.fetch=async(_url,init)=>{calls++;const h=init!.headers as Record<string,string>;assert.equal(h.apikey,process.env.SUPABASE_SERVICE_ROLE_KEY);if(h.apikey.startsWith('sb_secret_'))assert.equal(h.Authorization,undefined);else assert.equal(h.Authorization,`Bearer ${h.apikey}`);return new Response('[]')}
  for(const [key,state,code] of [
   ['', 'missing','SERVER_KEY_MISSING'],['sb_publishable_test','public_key_rejected','SERVER_KEY_PUBLIC'],[jwt({role:'anon'}),'public_key_rejected','SERVER_KEY_PUBLIC'],
   ['Bearer invalid','invalid','SERVER_KEY_INVALID'],['"sb_secret_test"','invalid','SERVER_KEY_INVALID'],
   [jwt({role:'service_role',ref:'another-project'}),'project_mismatch','SERVER_KEY_PROJECT_MISMATCH'],
   [jwt({role:'service_role',exp:1}),'expired','SERVER_KEY_EXPIRED']
  ]){
   process.env.SUPABASE_SERVICE_ROLE_KEY=key;assert.equal(serverKeyState(),state);assert.equal(configurationChecks().SUPABASE_SERVICE_ROLE_KEY,state)
   await assert.rejects(db('/rest/v1/plum_admins'),e=>e instanceof DatabaseError&&e.errorCode===code)
  }
  assert.equal(calls,0)
  for(const key of ['sb_secret_synthetic-test',jwt({role:'service_role',ref:'plum-test',exp:Date.now()/1000+3600})]){process.env.SUPABASE_SERVICE_ROLE_KEY=key;assert.equal(serverKeyState(),'ready');await db('/rest/v1/plum_admins')}
  assert.equal(calls,2)
 }finally{globalThis.fetch=fetchBefore;for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before)}
})
