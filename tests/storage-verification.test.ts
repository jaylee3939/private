import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash,randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import events from '../api/events.ts'
import admin from '../api/admin.ts'
import {verifyStoredEvent,koreanDateBounds} from '../server/storage-verification.ts'
import {questions} from '../src/quiz.ts'
import {participationTransport} from './participation-db.ts'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(s:string){value=JSON.parse(s)}} as any,get:()=>({status,value})}}
test('operator date range includes KST midnight and excludes the following midnight',()=>{
 assert.deepEqual(koreanDateBounds('2026-11-05','2026-11-11'),{start:'2026-11-04T15:00:00.000Z',end:'2026-11-11T15:00:00.000Z'})
})
test('actual SQL readback proves every write; raw table counts detect false zero RPC and date exclusion',async()=>{
 const db=new PGlite(),before={...process.env},fetchBefore=globalThis.fetch,warn=console.warn,info=console.info
 const user=randomUUID(),sessionId=randomUUID(),token='a'.repeat(64),origin='https://private-atv6.vercel.app'
 try{
  console.warn=()=>{};console.info=()=>{}
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/06_participation_flow.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/07_basic_aggregates.sql',import.meta.url),'utf8'))
  await db.query('insert into auth.users(id) values($1::uuid)',[user]);await db.query('insert into public.plum_admins(user_id) values($1::uuid)',[user]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://verification-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',SITE_ORIGIN:origin,DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'test@example.com'})
  const transport=participationTransport(db,user);globalThis.fetch=transport
  const stats=async(from='2026-11-05',to='2026-11-11')=>{const r=response();await admin({method:'GET',url:`/api/admin?from=${from}&to=${to}`,headers:{authorization:'Bearer synthetic'}} as any,r.res);return r.get()}
  let m=await stats();assert.equal(m.status,200);assert.equal(m.value.audit.diagnosis,'NO_STORED_SESSIONS')
  let last:any
  const send=async(kind:string,answers?:object,questionId?:string)=>{
   const e={sessionId,eventId:randomUUID(),token,kind,consentVersion:'plum-responses-v3',adultConfirmed:true,consent:true,sensitiveConsent:true,...(answers?{answers}:{}),...(questionId?{questionId}:{})}
   const r=response();await events({method:'POST',headers:{origin},body:e} as any,r.res);assert.equal(r.get().status,200);assert.equal(r.get().value.verified,true);last=e
  }
  // A successful RPC that writes nothing must never be acknowledged as stored.
  globalThis.fetch=async(url,init)=>String(url).includes('/rpc/plum_ingest')?new Response(JSON.stringify({event_id:randomUUID()})):transport(url,init)
  let r=response();await events({method:'POST',headers:{origin},body:{sessionId,eventId:randomUUID(),token,kind:'visit',consentVersion:'plum-responses-v3',adultConfirmed:true,consent:true,sensitiveConsent:true}} as any,r.res);assert.equal(r.get().value.errorCode,'SESSION_NOT_CONFIRMED');assert.equal(r.get().value.stored,undefined)
  globalThis.fetch=transport
  await send('visit');await send('start');const answers:Record<string,string>={}
  for(const q of questions){answers[q.id]=q.axis==='BS'?'B':q.axis==='TM'?'M':'R';await send('answer',{...answers},q.id)}
  await send('complete',answers)
  await assert.rejects(verifyStoredEvent(last,'b'.repeat(64),'BMR'),(e:any)=>e.errorCode==='SESSION_NOT_CONFIRMED')
  globalThis.fetch=async(url,init)=>{const res=await transport(url,init);if(String(url).includes('/plum_answers'))return new Response('[]');return res}
  await assert.rejects(verifyStoredEvent(last,createHash('sha256').update(token).digest('hex'),'BMR'),(e:any)=>e.errorCode==='ANSWERS_NOT_CONFIRMED')
  globalThis.fetch=transport
  await db.query("update public.plum_sessions set created_at='2026-11-11T10:00:00+09',started_at='2026-11-11T10:00:00+09',completed_at='2026-11-11T10:05:00+09' where id=$1::uuid",[sessionId])
  m=await stats();assert.equal(m.status,200);assert.equal(m.value.starts,1);assert.equal(m.value.completions,1);assert.equal(m.value.results[0].code,'BMR');assert.equal(m.value.answers.length,18);assert.equal(m.value.audit.diagnosis,'COUNTS_CONFIRMED')
  const zero={shares:0,visits:0,starts:0,completions:0,dropoffs:0,daily:[],results:[],answers:[]}
  globalThis.fetch=async(url,init)=>String(url).includes('/rpc/plum_metrics')?new Response(JSON.stringify(zero)):transport(url,init)
  m=await stats();assert.equal(m.status,503);assert.equal(m.value.errorCode,'METRICS_NOT_CONFIRMED');assert.equal(m.value.audit.starts,1)
  globalThis.fetch=transport
  for(const time of ['2026-11-04T14:59:59Z','2026-11-04T15:00:00Z','2026-11-11T14:59:59Z','2026-11-11T15:00:00Z'])await db.query("insert into public.plum_sessions(id,token_hash,consent_version,created_at,started_at,completed_at,result_code) values($1::uuid,$2,'plum-responses-v1',$3::timestamptz,$3::timestamptz,$3::timestamptz,'BMR')",[randomUUID(),'c'.repeat(64),time])
  m=await stats();assert.equal(m.status,200);assert.equal(m.value.starts,3);assert.equal(m.value.completions,3)
  m=await stats('2026-10-01','2026-10-02');assert.equal(m.status,200);assert.equal(m.value.starts,0);assert.equal(m.value.audit.diagnosis,'OUTSIDE_SELECTED_DATES');assert.equal(m.value.audit.totalSessions,5)
  globalThis.fetch=async(url,init)=>String(url).includes('/plum_sessions')?new Response('[]'):transport(url,init)
  m=await stats();assert.equal(m.status,503);assert.equal(m.value.errorCode,'DATABASE_COUNT_UNCONFIRMED')
  globalThis.fetch=transport;await send('withdraw');assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions')).rows[0].n,4)
 }finally{globalThis.fetch=fetchBefore;console.warn=warn;console.info=info;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
