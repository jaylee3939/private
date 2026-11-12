import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import events from '../api/events.ts'
import admin from '../api/admin.ts'
import {questions} from '../src/quiz.ts'
import {participationTransport} from './participation-db.ts'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(v:string){value=JSON.parse(v)}} as any,get:()=>({status,value})}}
test('visit-only session recovers start and complete atomically; retries and shares deduplicate; consent/RLS/90-day cascade remain enforced',async()=>{
 const db=new PGlite(),old={...process.env},oldFetch=globalThis.fetch,info=console.info,warn=console.warn
 const user=randomUUID(),sid=randomUUID(),origin='https://private-atv6.vercel.app',token='a'.repeat(64)
 try{
  console.info=()=>{};console.warn=()=>{}
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
  const migration=await readFile(new URL('../supabase/06_participation_flow.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(await readFile(new URL('../supabase/07_basic_aggregates.sql',import.meta.url),'utf8'))
  await db.query('insert into auth.users(id) values($1::uuid)',[user]);await db.query('insert into public.plum_admins(user_id) values($1::uuid)',[user]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://flow-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'test@example.com',SITE_ORIGIN:origin});globalThis.fetch=participationTransport(db,user)
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.axis==='BS'?'B':q.axis==='TM'?'M':'R']))
  const call=async(kind:string,extra:object={},sessionId=sid,version='plum-responses-v3',eventId=randomUUID())=>{const r=response();await events({method:'POST',headers:{origin},body:{sessionId,eventId,token,kind,consent:true,sensitiveConsent:true,adultConfirmed:true,consentVersion:version,...extra}} as any,r.res);return r.get()}
  assert.equal((await call('visit')).value.verified,true)
  assert.equal((await db.query('select started_at from public.plum_sessions where id=$1::uuid',[sid])).rows[0].started_at,null)
  const currentDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),beforeStats=response();await admin({method:'GET',url:`/api/admin?from=${currentDay}&to=${currentDay}`,headers:{authorization:'Bearer synthetic'}} as any,beforeStats.res);assert.equal(beforeStats.get().value.visits,1);assert.equal(beforeStats.get().value.audit.diagnosis,'NO_STORED_STARTS')
  // Reproduce the reported visit=1/start=0 state, then finish with no start request.
  const done=await call('complete',{answers});assert.equal(done.status,200);assert.equal(done.value.verified,true)
  for(let i=0;i<3;i++){assert.equal((await call('start')).status,200);assert.equal((await call('complete',{answers})).status,200)}
  const counts=(await db.query<{kind:string;n:number}>('select kind,count(*)::int n from public.plum_events where session_id=$1::uuid group by kind',[sid])).rows
  for(const kind of ['visit','start','complete'])assert.equal(counts.find(r=>r.kind===kind)?.n,1)
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_answers where session_id=$1::uuid',[sid])).rows[0].n,18)
  assert.equal((await db.query('select result_code from public.plum_sessions where id=$1::uuid',[sid])).rows[0].result_code,'BMR')
  const shareId=randomUUID();for(let i=0;i<3;i++)assert.equal((await call('share',{},sid,'plum-responses-v3',shareId)).status,200)
  assert.equal((await call('share')).status,200)
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_share_events')).rows[0].n,2)
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());const r=response();await admin({method:'GET',url:`/api/admin?from=${today}&to=${today}`,headers:{authorization:'Bearer synthetic'}} as any,r.res)
  assert.equal(r.get().status,200);assert.equal(r.get().value.starts,1);assert.equal(r.get().value.completions,1);assert.equal(r.get().value.shares,2);assert.equal(r.get().value.daily[0].shares,2)
  const transport=globalThis.fetch;globalThis.fetch=async(url,init)=>String(url).includes('/rpc/plum_metrics_v3')?new Response(JSON.stringify({code:'PGRST202'}),{status:404}):transport(url,init)
  const legacyStats=response();await admin({method:'GET',url:`/api/admin?from=${today}&to=${today}`,headers:{authorization:'Bearer synthetic'}} as any,legacyStats.res);assert.equal(legacyStats.get().status,200);assert.equal(legacyStats.get().value.starts,1);assert.equal(legacyStats.get().value.shares,null);assert.equal(legacyStats.get().value.audit.shareReady,false);globalThis.fetch=transport
  assert.equal((await call('visit',{consent:false},randomUUID())).status,400)
  const uncompleted=randomUUID();await call('visit',{},uncompleted);assert.equal((await call('share',{},uncompleted)).value.errorCode,'COMPLETION_REQUIRED')
  const legacy=randomUUID();assert.equal((await call('complete',{answers},legacy,'plum-responses-v1')).status,400);assert.equal((await call('share',{},legacy,'plum-responses-v1')).value.errorCode,'INVALID_EVENT')
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from public.plum_share_events'),(e:any)=>e.code==='42501');await assert.rejects(db.query('select public.plum_record_share($1::uuid,$2,$3::uuid)',[sid,'a'.repeat(64),randomUUID()]),(e:any)=>e.code==='42501');await db.exec('reset role')}
  // Reapplying the new additive migration preserves existing records.
  await db.exec(await readFile(new URL('../supabase/07_basic_aggregates.sql',import.meta.url),'utf8'));assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_share_events')).rows[0].n,2)
  await db.query("update public.plum_sessions set created_at=now()-interval '91 days' where id=$1::uuid",[sid]);await db.exec('set role service_role');await db.query('select public.plum_purge_expired()')
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_share_events')).rows[0].n,0)
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions')).rows[0].n,1)
 }finally{globalThis.fetch=oldFetch;console.info=info;console.warn=warn;for(const k of Object.keys(process.env))if(!(k in old))delete process.env[k];Object.assign(process.env,old);await db.close()}
})
