import {participationTransport} from '../tests/participation-db.ts'
import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import eventHandler from '../api/events.ts'
import adminHandler from '../api/admin.ts'
import {questions} from '../src/quiz.ts'
// Disposable local PostgreSQL only. No live project, participant or credential is used.
test('BMR browser flow stores through actual API and SQL, then actual admin API aggregates it',async({page})=>{
 test.setTimeout(60000)
 const db=new PGlite(),before={...process.env},fetchBefore=globalThis.fetch
 const userId=randomUUID(),statuses:{kind:string;status:number}[]=[]
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
  await db.query('insert into auth.users(id,email) values($1::uuid,$2)',[userId,'synthetic@example.com'])
  await db.query('insert into public.plum_admins(user_id) values($1::uuid)',[userId]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://synthetic-local.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'synthetic@example.com',SITE_ORIGIN:'http://127.0.0.1:5173'})
  globalThis.fetch=participationTransport(db,userId)
  const config={collectionEnabled:true,collectionLocked:false,consentVersion:'plum-responses-v1',retentionDays:90,privacyContact:'synthetic@example.com',auth:{url:'https://synthetic-local.supabase.co',key:'sb_publishable_synthetic'}}
  await page.route('**/api/config',r=>r.fulfill({json:config}))
  await page.route('**/api/events',async route=>{
   const req=route.request(),input=req.postDataJSON();let status=0,text='';const headers:Record<string,string>={}
   await eventHandler({method:req.method(),headers:await req.allHeaders(),body:input} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   statuses.push({kind:input.kind,status});await route.fulfill({status,headers,body:text})
  })
  await page.route('**/api/login',r=>r.fulfill({json:{access_token:'synthetic-token',expires_in:3600}}))
  await page.route('**/api/admin?**',async route=>{
   const req=route.request();let status=0,text='';const headers:Record<string,string>={}
   await adminHandler({method:req.method(),url:req.url(),headers:await req.allHeaders()} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   await route.fulfill({status,headers,body:text})
  })
  await page.goto('/')
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('checkbox',{name:/익명 참여 통계/}).check()
  await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
  for(let i=0;i<18;i++){
   const q=questions[i],pole=q.axis==='BS'?'B':q.axis==='TM'?'M':'R'
   await page.locator('.plum-option').filter({hasText:q.options.find(o=>o.pole===pole)!.text}).getByRole('radio').check()
   await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
  }
  await expect(page.locator('.plum-result-code')).toHaveText('BMR')
  await expect(page.getByText('참여 통계 저장을 완료했어요. (complete 확인)')).toBeVisible()
  for(const [kind,n] of [['visit',1],['start',1],['answer',18],['complete',1]] as const)expect(statuses.filter(e=>e.kind===kind)).toHaveLength(n)
  expect(statuses.every(e=>e.status===200)).toBe(true)
  expect((await db.query<{n:number}>('select count(*)::int n from public.plum_answers')).rows[0].n).toBe(18)
  await page.goto('/admin');await page.getByLabel('이메일',{exact:true}).fill('synthetic@example.com');await page.getByLabel('비밀번호',{exact:true}).fill('synthetic-password')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await expect(page.locator('.admin-counters section').filter({has:page.getByRole('heading',{name:'테스트 시작',exact:true})}).locator('strong')).toHaveText('1')
  await expect(page.locator('.admin-counters section').filter({has:page.getByRole('heading',{name:'완료',exact:true})}).locator('strong')).toHaveText('1')
  await expect(page.locator('tr').filter({has:page.getByRole('rowheader',{name:/BMR ·/})})).toContainText('100.0%')
 }finally{globalThis.fetch=fetchBefore;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
