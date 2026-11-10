import {test,expect} from '@playwright/test'
import {PGlite} from '@electric-sql/pglite'
import contentHandler from '../api/content.ts'
import uploadHandler from '../api/upload.ts'
import {initializeEditorDB,editorEnvironment,editorTransport} from '../tests/editor-db.ts'
import {questions} from '../src/quiz.ts'
const zero={visits:0,starts:0,completions:0,dropoffs:0,daily:[],results:[],answers:[]}
const config={collectionEnabled:false,collectionLocked:false,consentVersion:'plum-responses-v1',retentionDays:90,privacyContact:'test@example.com',auth:{url:'https://editor-test.supabase.co',key:'sb_publishable_synthetic'}}
test('admin edits, uploads, saves to SQL and public site reload retains content and all result connections',async({page})=>{
 test.setTimeout(90000)
 const db=new PGlite(),before={...process.env},fetchBefore=globalThis.fetch,images=new Map<string,Uint8Array>()
 try{
  await initializeEditorDB(db);await db.exec('set role service_role');editorEnvironment();globalThis.fetch=editorTransport(db,images)
  await page.route('**/api/config',r=>r.fulfill({json:config}))
  await page.route('**/api/login',r=>r.fulfill({json:{access_token:'synthetic-editor-token',expires_in:3600}}))
  await page.route('**/api/admin?**',r=>r.fulfill({json:zero}))
  await page.route('**/api/content**',async route=>{
   const req=route.request();let status=0,text='';const headers:Record<string,string>={}
   await contentHandler({method:req.method(),url:req.url(),headers:await req.allHeaders(),body:req.postData()||undefined} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   await route.fulfill({status,headers,body:text})
  })
  await page.route('**/api/upload',async route=>{
   const req=route.request();let status=0,text='';const headers:Record<string,string>={}
   await uploadHandler({method:req.method(),headers:await req.allHeaders(),body:req.postData()} as any,{set statusCode(n:number){status=n},setHeader(k:string,v:string){headers[k]=v},end(s:string){text=s}} as any)
   await route.fulfill({status,headers,body:text})
  })
  await page.route('https://editor-test.supabase.co/storage/**',route=>{const bytes=images.get(route.request().url().split('/').pop()!);return bytes?route.fulfill({contentType:'image/png',body:Buffer.from(bytes)}):route.abort()})
  await page.goto('/admin');await page.getByLabel('이메일',{exact:true}).fill('editor@example.com');await page.getByLabel('비밀번호',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'로그인',exact:true}).click()
  await page.getByRole('tab',{name:'콘텐츠 편집'}).click()
  await expect(page.getByLabel('인트로 제목',{exact:true})).toBeVisible()
  await page.setViewportSize({width:390,height:844})
  const mobile=await page.locator('.plum-admin').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));expect(mobile.scroll).toBeLessThanOrEqual(mobile.client)
  await page.setViewportSize({width:1280,height:900})
  await page.getByLabel('인트로 제목',{exact:true}).fill('관리자가 저장한 제목\n두 번째 줄')
  await page.getByText('질문 18개 · A/B 선택지',{exact:true}).click();await page.getByText(`질문 1 · ${questions[0].prompt}`,{exact:true}).click()
  await page.getByLabel('질문 1',{exact:true}).fill('저장한 첫 번째 질문');await page.getByLabel('질문 1 선택지 A',{exact:true}).fill('저장한 첫 번째 선택')
  await page.getByText('결과 8개 · 이미지 · 해시태그',{exact:true}).click();await page.getByText('BMR · 로맨틱 디렉터',{exact:true}).click()
  await page.getByLabel('BMR 이름',{exact:true}).fill('관리자가 저장한 결과')
  await page.getByLabel('BMR 한 줄 카피',{exact:true}).fill('직접 편집한 한 줄')
  await page.getByLabel('BMR 표시 코드',{exact:true}).fill('MY BMR')
  await page.getByLabel('BMR 해시태그 1',{exact:true}).fill('저장된태그')
  await page.getByLabel('BMR 결과 이미지 업로드',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')})
  await expect(page.getByRole('status')).toContainText('이미지 업로드 완료')
  await page.getByRole('button',{name:'저장하고 사이트에 반영'}).click();await expect(page.getByRole('status')).toContainText('저장 완료!')
  expect((await db.query<{revision:number}>('select revision from public.plum_content')).rows[0].revision).toBe(1)
  // Save failure does not discard the local draft or alter the published row.
  await page.getByLabel('인트로 제목',{exact:true}).fill('저장하면 안 되는 변경')
  await page.route('**/api/content',async route=>route.request().method()==='PUT'?route.fulfill({status:503,json:{errorCode:'DATABASE_ACCESS_DENIED'}}):route.fallback())
  await page.getByRole('button',{name:'저장하고 사이트에 반영'}).click();await expect(page.getByRole('status')).toContainText('권한을 확인')
  await expect(page.getByLabel('인트로 제목',{exact:true})).toHaveValue('저장하면 안 되는 변경')
  // Public fetch goes to the actual content API and the persisted SQL row.
  await page.goto('/');await expect(page.getByRole('heading',{name:/관리자가 저장한 제목/})).toBeVisible()
  await page.reload();await expect(page.getByRole('heading',{name:/관리자가 저장한 제목/})).toBeVisible()
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
  for(let i=0;i<18;i++){
   const q=questions[i],pole=q.axis==='BS'?'B':q.axis==='TM'?'M':'R'
   const text=i===0?'저장한 첫 번째 선택':q.options.find(o=>o.pole===pole)!.text
   if(i===0)await expect(page.getByRole('heading',{name:'저장한 첫 번째 질문'})).toBeVisible()
   await page.locator('.plum-option').filter({hasText:text}).getByRole('radio').check()
   await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
  }
  await expect(page.locator('.plum-result-code')).toHaveText('MY BMR');await expect(page.getByRole('heading',{name:/관리자가 저장한 결과/})).toBeVisible()
  await expect(page.getByRole('textbox',{name:'공유 링크 (유형 코드 포함)'})).toHaveValue(/#plum=BMR$/)
  await expect(page.locator('.plum-keywords')).toContainText('#저장된태그');await expect(page.locator('.plum-character img')).toHaveAttribute('src',/plum-editor-images/)
  for(const code of ['BTP','BTR','BMP','BMR','STP','STR','SMP','SMR']){
   await page.setViewportSize({width:code==='BMR'?390:1280,height:900});await page.goto('/#plum='+code);await page.reload()
   await expect(page.getByRole('heading',{name:/관리자가 저장한 제목/})).toBeVisible()
   await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'공유된 결과 보기'}).click()
   await expect(page.locator('.plum-result-code')).toHaveText(code==='BMR'?'MY BMR':code)
   const size=await page.locator('.plum-root').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));expect(size.scroll).toBeLessThanOrEqual(size.client)
  }
 }finally{globalThis.fetch=fetchBefore;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);await db.close()}
})
