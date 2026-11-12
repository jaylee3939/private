import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import basic from '../api/basic-events.ts'
import admin from '../api/admin.ts'
import events from '../api/events.ts'
import {BasicParticipation} from '../src/basic-telemetry.ts'
import {participationTransport} from './participation-db.ts'
function response(){let status=0,value:any;return {res:{set statusCode(n:number){status=n},setHeader(){},end(s:string){value=JSON.parse(s)}} as any,get:()=>({status,value})}}
test('basic client has no identifier, no auto retry, one start/completion per run and one event per successful copy callback',async()=>{
 const original=globalThis.fetch;const requests:{url:string;init:RequestInit}[]=[]
 globalThis.fetch=async(url,init)=>{requests.push({url:String(url),init:init!});throw Error('synthetic failure')}
 try{
  const c=new BasicParticipation();c.start();c.complete();c.share();assert.equal(requests.length,0)
  c.configure(true);c.configure(true);c.start();c.start();c.complete();c.complete();c.share();await new Promise(r=>setTimeout(r,30))
  assert.deepEqual(requests.map(r=>JSON.parse(r.init.body as string)),[{kind:'visit'},{kind:'start'},{kind:'complete'},{kind:'share'}])
  for(const r of requests){assert.equal(r.init.credentials,'omit');assert.equal(r.init.referrerPolicy,'no-referrer');assert.equal(r.url,'/api/basic-events');assert.deepEqual(r.init.headers,{'Content-Type':'application/json'})}
  c.reset();c.start();c.complete();c.configure(false);c.share();assert.equal(requests.length,6)
 }finally{globalThis.fetch=original}
})
test('aggregate API writes only daily counts; refuses identifiers/results; real DB, admin totals, permissions, retention and two-consent gate',async()=>{
 const db=new PGlite(),before={...process.env},oldFetch=globalThis.fetch,user=randomUUID(),origin='https://private-atv6.vercel.app'
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);')
  for(const file of ['01_setup.sql','06_participation_flow.sql','07_basic_aggregates.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'))
  await db.query('insert into auth.users(id) values($1)',[user]);await db.query('insert into plum_admins(user_id) values($1)',[user]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://basic-test.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'synthetic@example.com',SITE_ORIGIN:origin});globalThis.fetch=participationTransport(db,user)
  const call=async(body:unknown,headers={origin})=>{const r=response();await basic({method:'POST',headers,body} as any,r.res);return r.get()}
  assert.equal((await call({kind:'visit'},{origin:'https://other.invalid'})).status,403)
  for(const value of [{kind:'visit',id:randomUUID()},{kind:'complete',result:'BMR'},{kind:'complete',answers:{}},{kind:'answer'},{kind:'visit',ip:'127.0.0.1'},null])assert.equal((await call(value)).status,400)
  for(const kind of ['visit','start','complete','share'])assert.equal((await call({kind})).value.recorded,true)
  const rows=(await db.query<any>('select * from public.plum_basic_daily')).rows;assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['day','visits','starts','completions','shares'].sort())
  for(const k of ['visits','starts','completions','shares'])assert.equal(Number(rows[0][k]),1)
  for(const table of ['plum_sessions','plum_events','plum_answers','plum_share_events'])assert.equal((await db.query<{n:number}>(`select count(*)::int n from public.${table}`)).rows[0].n,0)
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());let r=response();await admin({method:'GET',headers:{authorization:'Bearer synthetic'},url:`/api/admin?from=${today}&to=${today}`} as any,r.res);assert.equal(r.get().status,200);assert.equal(r.get().value.basic.ready,true);for(const k of ['visits','starts','completions','shares'])assert.equal(r.get().value.basic[k],1)
  const input={sessionId:randomUUID(),token:'a'.repeat(64),eventId:randomUUID(),kind:'visit',adultConfirmed:true,consent:true,consentVersion:'plum-responses-v3'}
  r=response();await events({method:'POST',headers:{origin},body:input} as any,r.res);assert.equal(r.get().status,400)
  r=response();await events({method:'POST',headers:{origin},body:{...input,sensitiveConsent:true}} as any,r.res);assert.equal(r.get().status,200)
  const s=(await db.query<any>('select consent_version from public.plum_sessions')).rows[0];assert.equal(s.consent_version,'plum-responses-v3')
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from plum_basic_daily'),(e:any)=>e.code==='42501');await assert.rejects(db.query("select plum_increment_basic('visit')"),(e:any)=>e.code==='42501');await db.exec('reset role')}
  await db.exec('set role service_role');await db.query("insert into plum_basic_daily(day,visits) values((now() at time zone 'Asia/Seoul')::date-91,7)");await db.query('select plum_purge_expired()');assert.equal((await db.query<{n:number}>('select count(*)::int n from plum_basic_daily')).rows[0].n,1)
  const transport=globalThis.fetch;globalThis.fetch=async(url,init)=>String(url).includes('/rpc/plum_increment_basic')?new Response(JSON.stringify({recorded:false})):transport(url,init);assert.equal((await call({kind:'visit'})).status,503)
  process.env.DATA_COLLECTION_ENABLED='false';assert.equal((await call({kind:'visit'})).status,503)
 }finally{globalThis.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
