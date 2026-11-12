import {participationTransport} from '../tests/participation-db.ts'
import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import basicHandler from '../api/basic-events.ts'
import eventHandler from '../api/events.ts'
import adminHandler from '../api/admin.ts'
import configHandler from '../api/config.ts'
import statusHandler from '../api/participation.ts'
import {questions} from '../src/quiz.ts'
// Disposable local PostgreSQL only. No live project, participant or credential is used.
test('BMR browser flow stores through actual API and SQL, then actual admin API aggregates it',async({page})=>{
 test.setTimeout(90000)
 const db=new PGlite(),before={...process.env},fetchBefore=globalThis.fetch
 const userId=randomUUID(),statuses:{kind:string;status:number}[]=[]
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);')
  await db.exec(await readFile(new URL('../supabase/01_setup.sql',import.meta.url),'utf8'))
  await db.exec(await readFile(new URL('../supabase/06_participation_flow.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/07_basic_aggregates.sql',import.meta.url),'utf8'))
  await db.query('insert into auth.users(id,email) values($1::uuid,$2)',[userId,'synthetic@example.com'])
  await db.query('insert into public.plum_admins(user_id) values($1::uuid)',[userId]);await db.exec('set role service_role')
  Object.assign(process.env,{SUPABASE_URL:'https://synthetic-local.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_synthetic',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_synthetic',DATA_COLLECTION_ENABLED:'true',RETENTION_JOB_READY:'true',PRIVACY_CONTACT:'synthetic@example.com',SITE_ORIGIN:'http://127.0.0.1:5173'})
  globalThis.fetch=participationTransport(db,userId)
  const config={collectionEnabled:true,collectionLocked:false,consentVersion:'plum-responses-v3',retentionDays:90,privacyContact:'synthetic@example.com',auth:{url:'https://synthetic-local.supabase.co',key:'sb_publishable_synthetic'}}
  await page.route('**/api/config',r=>r.fulfill({json:config}))
  await page.route('**/api/basic-events',async route=>{const req=route.request(),input=req.postDataJSON();expect(Object.keys(input)).toEqual(['kind']);let status=0,body='';await basicHandler({method:req.method(),headers:await req.allHeaders(),body:input} as any,{set statusCode(n:number){status=n},setHeader(){},end(s:string){body=s}} as any);await route.fulfill({status,contentType:'application/json',body})})
  await page.route('**/api/events',async route=>{
   const req=route.request(),input=req.postDataJSON();let status=0,text='';const headers:Record<string,string>={}
   await eventHandler({method:req.method(),headers:await req.allHeaders(),body:input} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   statuses.push({kind:input.kind,status});await route.fulfill({status,headers,body:text})
  })
  await page.route('**/api/participation**',async route=>{
   const req=route.request();let status=0,text='';const headers:Record<string,string>={}
   await statusHandler({method:req.method(),url:req.url(),headers:await req.allHeaders()} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   await route.fulfill({status,headers,body:text})
  })
  await page.route('**/api/login',r=>r.fulfill({json:{access_token:'synthetic-token',expires_in:3600}}))
  await page.route('**/api/admin?**',async route=>{
   const req=route.request();let status=0,text='';const headers:Record<string,string>={}
   await adminHandler({method:req.method(),url:req.url(),headers:await req.allHeaders()} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   await route.fulfill({status,headers,body:text})
  })
  await page.addInitScript(()=>{(window as any).__copyFails=true;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{if((window as any).__copyFails)throw Error('Synthetic clipboard failure');(window as any).__lastCopied=text}}})})
  // First run: no optional consent. Only daily aggregate counters may change.
  await page.goto('/');await expect(page.getByText('18개의 질문 · PLUM TYPE 2.0')).toBeVisible()
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
  for(let i=0;i<18;i++){const q=questions[i];await page.locator('.plum-option').filter({hasText:q.options[0].text}).getByRole('radio').check();await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()}
  await expect(page.locator('.plum-result-code')).toHaveText('BTP')
  await expect.poll(async()=>Number((await db.query<any>('select completions from plum_basic_daily')).rows[0]?.completions||0)).toBe(1)
  expect(statuses).toHaveLength(0);expect((await db.query<{n:number}>('select count(*)::int n from plum_sessions')).rows[0].n).toBe(0)
  await page.evaluate(()=>{(window as any).__copyFails=false});await page.getByRole('button',{name:'결과 링크 복사'}).click()
  await expect.poll(async()=>Number((await db.query<any>('select shares from plum_basic_daily')).rows[0]?.shares||0)).toBe(1)
  await page.reload()
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('checkbox',{name:/익명 참여 통계/}).check();await page.getByRole('checkbox',{name:/성생활·성적 취향에 관한 민감정보/}).check()
  await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
  await expect.poll(async()=>Number((await db.query<{n:number}>('select count(*)::int n from public.plum_sessions where started_at is not null')).rows[0].n)).toBe(1)
  for(let i=0;i<18;i++){
   const q=questions[i],pole=q.axis==='BS'?'B':q.axis==='TM'?'M':'R'
   await page.locator('.plum-option').filter({hasText:q.options.find(o=>o.pole===pole)!.text}).getByRole('radio').check()
   await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
  }
  await expect(page.locator('.plum-result-code')).toHaveText('BMR')
  await expect.poll(()=>statuses.filter(e=>e.kind==='complete').length).toBe(1)
  await expect(page.getByText('참여 통계 저장을 완료했어요.')).toHaveCount(0)
  for(const [kind,n] of [['visit',1],['start',1],['answer',18],['complete',1]] as const)expect(statuses.filter(e=>e.kind===kind)).toHaveLength(n)
  expect(statuses.every(e=>e.status===200)).toBe(true)
  expect((await db.query<{n:number}>('select count(*)::int n from public.plum_answers')).rows[0].n).toBe(18)
  await page.getByRole('button',{name:'결과 링크 복사'}).click();await expect(page.getByRole('status')).toContainText('아래 링크를 선택해 직접 복사')
  expect((await db.query<{n:number}>('select count(*)::int n from public.plum_share_events')).rows[0].n).toBe(0)
  const countBeforeDownload=statuses.length;const download=page.waitForEvent('download');await page.getByRole('button',{name:'카드 다운로드'}).click();await download;expect(statuses.length).toBe(countBeforeDownload)
  await page.evaluate(()=>{(window as any).__copyFails=false})
  await page.getByRole('button',{name:'결과 링크 복사'}).click();await expect.poll(()=>statuses.filter(e=>e.kind==='share').length).toBe(1)
  expect((await db.query<{n:number}>('select count(*)::int n from public.plum_share_events')).rows[0].n).toBe(1)
  await expect(page.locator('aside[aria-label="참여 데이터 저장 상태"]')).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain('DB 확인:')
  expect(statuses.filter(e=>e.kind==='share')).toHaveLength(1)
  const eventCount=statuses.length;await page.reload();await expect(page.getByRole('checkbox',{name:/익명 참여 통계/})).toBeVisible();expect(statuses.length).toBe(eventCount)
  await page.route('**/api/config?diagnostics=1',async route=>{let status=0,body='';await configHandler({method:'GET',url:route.request().url(),headers:await route.request().allHeaders()} as any,{set statusCode(n:number){status=n},setHeader(){},end(s:string){body=s}} as any);await route.fulfill({status,contentType:'application/json',body})})
  await page.goto('/admin');await page.getByLabel('이메일',{exact:true}).fill('synthetic@example.com');await page.getByLabel('비밀번호',{exact:true}).fill('synthetic-password')
  await page.getByRole('button',{name:'로그인',exact:true}).click()
  await expect(page.locator('.admin-counters section').filter({has:page.getByRole('heading',{name:'테스트 시작',exact:true})}).locator('strong')).toHaveText('1')
  await expect(page.locator('.admin-counters section').filter({has:page.getByRole('heading',{name:'완료',exact:true})}).locator('strong')).toHaveText('1')
  await expect(page.locator('.admin-counters section').filter({has:page.getByRole('heading',{name:'친구에게 공유',exact:true})}).locator('strong')).toHaveText('1')
  await expect(page.locator('.admin-basic-counters section').filter({has:page.getByRole('heading',{name:'시작',exact:true})}).locator('strong')).toHaveText('2')
  await expect(page.locator('.admin-basic-counters section').filter({has:page.getByRole('heading',{name:'완료 횟수',exact:true})}).locator('strong')).toHaveText('2')
  await expect(page.locator('.admin-basic-counters section').filter({has:page.getByRole('heading',{name:'링크 복사',exact:true})}).locator('strong')).toHaveText('2')
  await page.getByText('관리자 저장 진단',{exact:true}).click()
  await expect(page.getByText('DB 확인: 시작 1 · 답변 18 · 완료 1 · 공유 1',{exact:false})).toBeVisible()
  await expect(page.locator('tr').filter({has:page.getByRole('rowheader',{name:/BMR ·/})})).toContainText('100.0%')
 }finally{globalThis.fetch=fetchBefore;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
