import {test,expect} from '@playwright/test'
import {questions} from '../src/quiz'
const config={collectionEnabled:true,consentVersion:'plum-responses-v1',retentionDays:90,privacyContact:'privacy@example.com',auth:null}
const escape=(s:string)=>new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
test('consent gates collection; full answers, withdrawal and refresh do not leak stored identity',async({page})=>{
 const events:any[]=[]
 await page.route('**/api/config',r=>r.fulfill({json:config}))
 await page.route('**/api/events',r=>{const e=r.request().postDataJSON();events.push(e);return r.fulfill({json:e.kind==='withdraw'?{deleted:true}:{stored:true,eventId:e.eventId}})})
 await page.goto('/')
 await expect(page.getByRole('checkbox',{name:/익명 참여 통계/})).toBeVisible()
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.waitForTimeout(100);expect(events).toHaveLength(0)
 await page.getByRole('checkbox',{name:/익명 참여 통계/}).check();await expect.poll(()=>events.filter(e=>e.kind==='visit').length).toBe(1)
 await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 for(let i=0;i<18;i++){
  await page.getByRole('radio',{name:escape(questions[i].options[0].text)}).check()
  await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
 }
 await expect(page.locator('.plum-result-code')).toHaveText('BTP')
 await expect.poll(()=>events.filter(e=>e.kind==='complete').length).toBe(1)
 expect(events.filter(e=>e.kind==='answer')).toHaveLength(18)
 expect(Object.keys(events.find(e=>e.kind==='complete').answers)).toHaveLength(18)
 expect(events.every(e=>!('email' in e)&&!('result' in e))).toBe(true)
 await page.getByRole('checkbox',{name:/익명 참여 통계/}).uncheck()
 await expect.poll(()=>events.filter(e=>e.kind==='withdraw').length).toBe(1)
 await expect(page.getByText('수집을 중단하고 현재 참여 세션의 저장 기록을 삭제했어요.')).toBeVisible()
 const count=events.length;await page.reload();await page.waitForTimeout(200);expect(events).toHaveLength(count)
 expect(await page.evaluate(()=>localStorage.length)).toBe(0)
})
test('without consent, completing all questions sends zero collection events',async({page})=>{
 const events:any[]=[]
 await page.route('**/api/config',r=>r.fulfill({json:config}));await page.route('**/api/events',r=>{events.push(r.request().postDataJSON());return r.fulfill({json:{stored:true}})})
 await page.goto('/');await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 for(let i=0;i<18;i++){await page.getByRole('radio',{name:escape(questions[i].options[1].text)}).check();await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()}
 await expect(page.locator('.plum-result-code')).toHaveText('SMR');expect(events).toHaveLength(0)
})
test('admin login gate, forbidden user and aggregate dashboard',async({page})=>{
 let allowed=false,queries=0
 await page.route('**/api/config',r=>r.fulfill({json:{...config,auth:{url:'https://plum-test.supabase.co',key:'public-test-key'}}}))
 await page.route('**/api/login',r=>r.fulfill({json:{access_token:'test-only-token',expires_in:3600}}))
 await page.route('**/api/admin?**',r=>{queries++;return r.fulfill({status:allowed?200:403,json:allowed?{visits:3,starts:2,completions:1,dropoffs:1,daily:[{date:'2026-11-03',visits:3,starts:2,completions:1}],results:[{code:'BTP',count:1}],answers:[{question_id:'bs1',pole:'B',count:1},{question_id:'bs1',pole:'S',count:1}]}:{error:'Administrator access required'}})})
 await page.goto('/admin');await expect(page.getByRole('heading',{name:'관리자 로그인'})).toBeVisible();expect(queries).toBe(0)
 await page.getByLabel('이메일',{exact:true}).fill('admin@example.com');await page.getByLabel('비밀번호',{exact:true}).fill('test-password-only');await page.getByRole('button',{name:'로그인',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('관리자로 등록되지');await expect(page.locator('table')).toHaveCount(0)
 await page.getByRole('button',{name:'로그아웃'}).click();allowed=true
 await page.getByLabel('비밀번호',{exact:true}).fill('test-password-only');await page.getByRole('button',{name:'로그인',exact:true}).click()
 await expect(page.locator('table')).toHaveCount(3);await expect(page.getByText('50.0%').first()).toBeVisible()
 await page.screenshot({path:'test-results/plum-admin.png',fullPage:true})
 await page.reload();await expect(page.getByRole('heading',{name:'관리자 로그인'})).toBeVisible()
})

test('admin distinguishes a server API failure from missing environment variables',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({status:500,json:{error:'server failed'}}))
 await page.goto('/admin')
 await expect(page.getByRole('alert')).toContainText('HTTP 500')
 await expect(page.getByRole('heading',{name:'관리자 로그인'})).toHaveCount(0)
})
test('valid public login settings display login with collection locked; diagnostics show no values',async({page})=>{
 const checks={SUPABASE_URL:'ready',SUPABASE_ANON_KEY:'ready',SUPABASE_SERVICE_ROLE_KEY:'present',SITE_ORIGIN:'ready',PRIVACY_CONTACT:'present',RETENTION_JOB_READY:'disabled',DATA_COLLECTION_ENABLED:'disabled'}
 await page.route('**/api/config',r=>r.fulfill({json:{...config,collectionEnabled:false,collectionLocked:true,configVersion:'plum-config-2',checks,auth:{url:'https://plum-test.supabase.co',key:'sb_publishable_test'}}}))
 await page.goto('/admin')
 await expect(page.getByRole('heading',{name:'관리자 로그인'})).toBeVisible()
 await page.getByText('서버 설정 진단 · 키 값은 표시하지 않습니다').click()
 await expect(page.getByRole('cell',{name:'false 설정'})).toHaveCount(2)
 await expect(page.getByRole('link',{name:/값 없는 진단 결과/})).toHaveAttribute('href','/api/config?diagnostics=1')
 expect(await page.locator('body').innerText()).not.toContain('sb_publishable_test')
})

test('admin login stays same-origin and explains authentication versus connection failures',async({page})=>{
 await page.route('**/api/config',r=>r.fulfill({json:{...config,auth:{url:'https://plum-test.supabase.co',key:'public-test-key'}}}))
 let errorCode='INVALID_CREDENTIALS'
 await page.route('**/api/login',r=>{expect(r.request().method()).toBe('POST');return r.fulfill({status:errorCode==='INVALID_CREDENTIALS'?400:502,json:{errorCode}})})
 let externalRequests=0
 await page.route('https://plum-test.supabase.co/**',r=>{externalRequests++;return r.abort()})
 await page.goto('/admin');await page.getByLabel('이메일',{exact:true}).fill('admin@example.com');await page.getByLabel('비밀번호',{exact:true}).fill('test-only-password')
 await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByRole('status')).toContainText('비밀번호가 일치하지')
 errorCode='AUTH_DNS_FAILED'
 await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByRole('status')).toContainText('도메인을 찾지 못했어요')
 errorCode='AUTH_NETWORK_FAILED'
 await page.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByRole('status')).toContainText('Vercel 서버가 Supabase에 연결하지')
 expect(externalRequests).toBe(0);await expect(page.locator('table')).toHaveCount(0)
})
