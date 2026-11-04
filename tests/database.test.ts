import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {questions} from '../src/quiz.ts'
test('SQL executes, persists across reopen, isolates browser roles, deduplicates and deletes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'plum-db-'));let db=new PGlite(dir)
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   for(const table of ['plum_sessions','plum_answers','plum_events','plum_admins'])await assert.rejects(db.query(`select * from public.${table}`),(e:any)=>e.code==='42501')
   await assert.rejects(db.query("select public.plum_metrics('2026-01-01','2026-01-02')"))
   await assert.rejects(db.query('insert into public.plum_sessions default values'),(e:any)=>e.code==='42501')
   await assert.rejects(db.query("select public.plum_ingest('11111111-1111-4111-8111-111111111111'::uuid,'a','22222222-2222-4222-8222-222222222222'::uuid,'visit',null,null,null,'plum-responses-v1')"),(e:any)=>e.code==='42501')
   await db.exec('reset role')
  }
  await db.exec(await readFile(new URL('../supabase/04_verify_without_collection.sql',import.meta.url),'utf8'))
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions')).rows[0].n,0)
  const id=randomUUID(),visit=randomUUID(),hash='a'.repeat(64)
  const ingest=async(kind:string,event=randomUUID(),answers:object|null=null,question:string|null=null,result:string|null=null,h=hash)=>db.query('select public.plum_ingest($1::uuid,$2,$3::uuid,$4,$5::jsonb,$6,$7,$8)',[id,h,event,kind,answers?JSON.stringify(answers):null,question,result,'plum-responses-v1'])
  await db.exec('set role service_role')
  await ingest('visit',visit);await ingest('visit',visit);await ingest('start')
  await assert.rejects(ingest('answer',randomUUID(),{bs1:'T'},'bs1'))
  await assert.rejects(ingest('answer',randomUUID(),{bs1:'B'},'bs1',null,'b'.repeat(64)))
  await ingest('answer',randomUUID(),{bs1:'B'},'bs1');await ingest('answer',randomUUID(),{bs1:'S'},'bs1')
  assert.equal((await db.query<{pole:string}>('select pole from public.plum_answers')).rows[0].pole,'S')
  const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole]))
  await assert.rejects(ingest('complete',randomUUID(),answers,null,'SMR'))
  await ingest('complete',randomUUID(),answers,null,'BTP')
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_events where kind=\'visit\'')).rows[0].n,1)
  const stats=await db.query<{m:any}>("select public.plum_metrics((now() at time zone 'Asia/Seoul')::date,(now() at time zone 'Asia/Seoul')::date) m")
  assert.equal(stats.rows[0].m.completions,1);assert.equal(stats.rows[0].m.results[0].code,'BTP')
  for(const code of ['BTP','BTR','BMP','BMR','STP','STR','SMP','SMR']){
   const other=randomUUID();const a=Object.fromEntries(questions.map((q,i)=>[q.id,q.options[i%6<3?0:1].pole]));a.tieBS=code[0];a.tieTM=code[1];a.tiePR=code[2]
   for(const [kind,answer,result] of [['visit',null,null],['start',null,null],['complete',a,code]] as const)await db.query('select public.plum_ingest($1::uuid,$2,$3::uuid,$4,$5::jsonb,$6,$7,$8)',[other,hash,randomUUID(),kind,answer?JSON.stringify(answer):null,null,result,'plum-responses-v1'])
  }
  const all=await db.query<{n:number}>('select count(distinct result_code)::int n from public.plum_sessions where completed_at is not null');assert.equal(all.rows[0].n,8)
  const expired=randomUUID();await db.query("insert into public.plum_sessions(id,token_hash,consent_version,created_at) values($1::uuid,$2,'plum-responses-v1',now()-interval '91 days')",[expired,hash]);await db.query('select public.plum_purge_expired()');assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions where id=$1::uuid',[expired])).rows[0].n,0)
  await db.close();db=new PGlite(dir)
  assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_answers where session_id=$1::uuid',[id])).rows[0].n,18)
  await db.query('select public.plum_withdraw($1::uuid,$2)',[id,hash]);assert.equal((await db.query<{n:number}>('select count(*)::int n from public.plum_events where session_id=$1::uuid',[id])).rows[0].n,0)
 }finally{await db.close();await rm(dir,{recursive:true,force:true})}
})
