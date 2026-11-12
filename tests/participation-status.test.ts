import {test} from 'node:test'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import events from '../api/events.ts'
import status from '../api/participation.ts'
import {questions} from '../src/quiz.ts'
import {participationTransport} from './participation-db.ts'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(s:string){value=JSON.parse(s)}} as any,get:()=>({status,value})}}
test('session status requires administrator authentication and exposes only actual counts, never answers, result code or tokens',async()=>{
 const db=new PGlite(),before={...process.env},oldFetch=globalThis.fetch,info=console.info
 const user=randomUUID(),session=randomUUID(),token='a'.repeat(64),origin='https://private-atv6.vercel.app'
 try{
  console.info=()=>{}
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/06_participation_flow.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/07_basic_aggregates.sql',import.meta.url),'utf8'));await db.query('insert into auth.users(id) values($1)',[user]);await db.query('insert into plum_admins(user_id) values($1)',[user]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://status-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'test@example.com',SITE_ORIGIN:origin});const transport=participationTransport(db,user);globalThis.fetch=async(input,init)=>String(input).includes('/auth/v1/user')&&(init?.headers as any)?.Authorization!=='Bearer admin-test-token'?new Response('{}',{status:401}):transport(input,init)
  let r=response();await status({method:'GET',url:`/api/participation?session=${session}`,headers:{}} as any,r.res);assert.equal(r.get().status,401)
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.axis==='BS'?'B':q.axis==='TM'?'M':'R']))
  r=response();await events({method:'POST',headers:{origin},body:{sessionId:session,token,eventId:randomUUID(),kind:'complete',adultConfirmed:true,consent:true,sensitiveConsent:true,consentVersion:'plum-responses-v3',answers}} as any,r.res);assert.equal(r.get().status,200)
  r=response();await status({method:'GET',url:`/api/participation?session=${session}`,headers:{authorization:`Bearer ${'b'.repeat(64)}`}} as any,r.res);assert.equal(r.get().status,401);assert.equal(r.get().value.answerCount,undefined)
  r=response();await status({method:'GET',url:`/api/participation?session=${session}`,headers:{authorization:`Bearer admin-test-token`}} as any,r.res);const v=r.get().value
  assert.equal(r.get().status,200);assert.equal(v.answerCount,18);assert.equal(v.startEvents,1);assert.equal(v.completeEvents,1);assert.equal(v.completed,true);assert.equal(v.resultRecorded,true)
  await db.query('delete from plum_admins where user_id=$1',[user])
  r=response();await status({method:'GET',url:`/api/participation?session=${session}`,headers:{authorization:'Bearer admin-test-token'}} as any,r.res);assert.equal(r.get().status,403);assert.equal(r.get().value.answerCount,undefined)
  const safe=JSON.stringify(v);for(const privateValue of [session,token,'BMR','token_hash','bs1','sb_secret','sb_publishable','test@example.com'])assert.equal(safe.includes(privateValue),false)
 }finally{globalThis.fetch=oldFetch;console.info=info;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
