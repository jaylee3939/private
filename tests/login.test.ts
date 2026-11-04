import {test} from 'node:test'
import assert from 'node:assert/strict'
import login from '../api/login.ts'
const origin='https://private-atv6.vercel.app'
function response(){let status=0,value:any;const headers:Record<string,string>={};return {res:{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(v:string){value=JSON.parse(v)}} as any,get:()=>({status,value,headers})}}
test('login uses public credentials only, guards origin, classifies failures and never reflects upstream secrets',async()=>{
 const old={...process.env},oldFetch=globalThis.fetch
 try{
  process.env.SUPABASE_URL='https://login-test.supabase.co';process.env.SUPABASE_ANON_KEY='sb_publishable_test';process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_test-only-private-key';process.env.SITE_ORIGIN=origin
  const req={method:'POST',headers:{origin},body:{email:' admin@example.com ',password:'test-only-password'}} as any
  let calls=0
  globalThis.fetch=async(url,init)=>{calls++;assert.equal(String(url),'https://login-test.supabase.co/auth/v1/token?grant_type=password');assert.equal((init?.headers as any).apikey,'sb_publishable_test');assert.equal(JSON.stringify(init).includes('sb_secret_test-only-private-key'),false);assert.equal(JSON.parse(init?.body as string).email,'admin@example.com');return new Response(JSON.stringify({access_token:'test-only-token',expires_in:3600,refresh_token:'never-return'}),{status:200})}
  let r=response();await login({...req,headers:{}},r.res);assert.equal(r.get().status,403);assert.equal(calls,0)
  r=response();await login({...req,method:'GET'},r.res);assert.equal(r.get().status,405);assert.equal(calls,0)
  r=response();await login({...req,body:{email:'a',password:''}},r.res);assert.equal(r.get().status,400);assert.equal(calls,0)
  r=response();await login(req,r.res);assert.equal(r.get().status,200);assert.deepEqual(r.get().value,{access_token:'test-only-token',expires_in:3600});assert.equal(r.get().headers['Cache-Control'],'no-store')
  for(const [status,code,expected] of [[400,'invalid_credentials','INVALID_CREDENTIALS'],[400,'email_not_confirmed','EMAIL_NOT_CONFIRMED'],[401,'','AUTH_REQUEST_REJECTED'],[429,'','AUTH_RATE_LIMITED'],[500,'','AUTH_UPSTREAM_ERROR']] as const){
   globalThis.fetch=async()=>new Response(JSON.stringify({code,message:'sensitive-upstream-detail'}),{status})
   r=response();await login(req,r.res);assert.equal(r.get().value.errorCode,expected);assert.equal(JSON.stringify(r.get().value).includes('sensitive-upstream-detail'),false)
  }
  for(const [cause,expected] of [['ENOTFOUND','AUTH_DNS_FAILED'],['CERT_HAS_EXPIRED','AUTH_TLS_FAILED'],['ECONNREFUSED','AUTH_NETWORK_FAILED']]){
   globalThis.fetch=async()=>{throw new TypeError('do not reflect',{cause:{code:cause}})}
   r=response();await login(req,r.res);assert.equal(r.get().value.errorCode,expected)
  }
  globalThis.fetch=async()=>{throw new DOMException('hidden','TimeoutError')};r=response();await login(req,r.res);assert.equal(r.get().status,504);assert.equal(r.get().value.errorCode,'AUTH_TIMEOUT')
  globalThis.fetch=async()=>new Response('{}');r=response();await login(req,r.res);assert.equal(r.get().value.errorCode,'AUTH_RESPONSE_INVALID')
 }finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old)}
})
