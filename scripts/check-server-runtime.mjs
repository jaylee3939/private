// Run emitted JavaScript in Node ESM, without TS loaders or extension-rewriting flags.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import config from '../.server-build/api/config.js'
import admin from '../.server-build/api/admin.js'
import events from '../.server-build/api/events.js'
import login from '../.server-build/api/login.js'
import content from '../.server-build/api/content.js'
import upload from '../.server-build/api/upload.js'
const before={...process.env},originalFetch=globalThis.fetch
function response(){let status=0,value;return {res:{set statusCode(n){status=n},setHeader(){},end(body){value=JSON.parse(body)}},get:()=>({status,value})}}
try{
 for(const file of ['api/config.js','api/admin.js','api/events.js','api/login.js','api/content.js','api/upload.js','server/admin-auth.js','server/storage-verification.js','src/content.js','server/http.js','server/events.js']){
  const source=await readFile(new URL(`../.server-build/${file}`,import.meta.url),'utf8')
  assert.equal(/(?:from\s*["']|import\s*\(\s*["'])[^"']+\.tsx?["']/.test(source),false,`TS runtime import in ${file}`)
 }
 process.env.SUPABASE_URL='https://plum-runtime-test.supabase.co'
 process.env.SUPABASE_ANON_KEY='sb_publishable_runtime-test'
 process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test-only-never-print'
 process.env.DATA_COLLECTION_ENABLED='false'
 let r=response();await config({method:'GET',url:'/api/config?diagnostics=1'},r.res)
 assert.equal(r.get().status,200);assert.equal(r.get().value.configVersion,'plum-config-2');assert.equal(r.get().value.collectionEnabled,false);assert.equal(r.get().value.auth,undefined)
 assert.equal(JSON.stringify(r.get().value).includes(process.env.SUPABASE_SERVICE_ROLE_KEY),false)
 r=response();await config({method:'GET',url:'/api/config'},r.res);assert.equal(r.get().status,200);assert.equal(r.get().value.auth.url,process.env.SUPABASE_URL)
 r=response();await admin({method:'GET',headers:{},url:'/api/admin'},r.res);assert.equal(r.get().status,401)
 globalThis.fetch=async url=>new Response(String(url).includes('/auth/v1/user')?JSON.stringify({id:'11111111-1111-4111-8111-111111111111'}):'[]',{status:200})
 r=response();await admin({method:'GET',headers:{authorization:'Bearer test-only-token'},url:'/api/admin?from=2026-11-01&to=2026-11-03'},r.res);assert.equal(r.get().status,403)
 r=response();await events({method:'GET',headers:{}},r.res);assert.equal(r.get().status,405)
 r=response();await login({method:'POST',headers:{},body:{}},r.res);assert.equal(r.get().status,403)
 r=response();await content({method:'PUT',headers:{},url:'/api/content'},r.res);assert.equal(r.get().status,401)
 r=response();await upload({method:'POST',headers:{}},r.res);assert.equal(r.get().status,401)
 console.log('Server ESM runtime passed: config 200, anonymous admin 401, non-admin 403; no TypeScript runtime imports.')
}finally{
 globalThis.fetch=originalFetch
 for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key]
 Object.assign(process.env,before)
}
