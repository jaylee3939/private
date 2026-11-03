import {test,expect} from '@playwright/test'
import {questions,supplements} from '../src/quiz'
test('mobile quiz, three tie breaks, download, research consent and share gate',async({page})=>{
 await page.setViewportSize({width:375,height:812})
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/')
 await expect(page.getByRole('button',{name:'내 PLUM TYPE 찾기'})).toBeDisabled()
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check()
 await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 for(let i=0;i<18;i++){
  // First two questions per axis choose first pole; last two choose second.
  const q=questions[i];const option=q.options[i%6<3?0:1]
  await page.getByRole('radio',{name:new RegExp(option.text)}).check()
  if(i===0){await page.getByRole('button',{name:'다음 질문'}).click();await page.getByRole('button',{name:'← 이전'}).click();await expect(page.getByRole('radio',{name:new RegExp(option.text)})).toBeChecked()}
  await page.getByRole('button',{name:'다음 질문'}).click()
 }
 for(const axis of ['BS','TM','PR'] as const){
  await expect(page.getByRole('heading',{name:supplements[axis].prompt})).toBeVisible()
  await page.getByRole('radio',{name:new RegExp(supplements[axis].options[0].text)}).check()
  await page.getByRole('button',{name:axis==='PR'?'결과 보기':'다음 질문'}).click()
 }
 await expect(page.locator('.plum-result-code')).toHaveText('BTP')
 await expect(page.locator('.plum-result .plum-character')).toHaveCSS('height','170px')
 await page.screenshot({path:'test-results/plum-mobile-result-clean.png',fullPage:true,animations:'disabled'})
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'카드 다운로드'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('PLUM-BTP.png');await download.saveAs('test-results/plum-share-card.png')
 const link=await page.getByRole('textbox',{name:'공유 링크 (유형 코드 포함)'}).inputValue();expect(link).toContain('#plum=BTP')
 await page.getByRole('button',{name:'선택 설문 참여하기'}).click()
 await expect(page.getByRole('button',{name:'동의한 항목만 데모 제출'})).toBeDisabled()
 await page.getByRole('checkbox',{name:/이메일 마케팅/}).check()
 await expect(page.getByRole('textbox',{name:'이메일',exact:true})).toHaveJSProperty('required',true)
 await page.getByRole('textbox',{name:'이메일',exact:true}).fill('test@example.com')
 await page.getByRole('button',{name:'동의한 항목만 데모 제출'}).click()
 await expect(page.getByRole('status')).toContainText('전송·저장되지 않았어요')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/plum-mobile-result.png',fullPage:true,animations:'disabled'})
 await page.goto(link)
 await page.reload() // Open shared URL as a fresh document, as in a new tab.
 await expect(page.getByRole('button',{name:'공유된 결과 보기'})).toBeDisabled()
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check()
 await page.getByRole('button',{name:'공유된 결과 보기'}).click()
 await expect(page.locator('.plum-result-code')).toHaveText('BTP')
 await expect(page.getByRole('button',{name:'선택 설문 참여하기'})).toHaveCount(0)
 expect(errors).toEqual([])
})
test('desktop intro fits and unselected question cannot advance',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/')
 await page.screenshot({path:'test-results/plum-desktop-intro.png',fullPage:true,animations:'disabled'})
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 await expect(page.getByRole('button',{name:'다음 질문'})).toBeDisabled()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('all eight result cards retain descriptions and three hashtags across viewports',async({page})=>{
 for(const code of ['BTP','BTR','BMP','BMR','STP','STR','SMP','SMR']){
  await page.goto('/#plum='+code);await page.reload()
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check()
  await page.getByRole('button',{name:'공유된 결과 보기'}).click()
  await expect(page.locator('.plum-result-code')).toHaveText(code)
  await expect(page.locator('.plum-keywords span')).toHaveCount(3)
  await expect(page.locator('.plum-description')).not.toBeEmpty()
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.screenshot({path:'test-results/plum-desktop-result.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:320,height:740})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.emulateMedia({reducedMotion:'reduce'})
 await expect(page.locator('.plum-keywords span').first()).toHaveCSS('animation-name','none')
})

test('editable copy, native content slots and shuffled questions retain scoring and navigation',async({page})=>{
 // Make question order reproducible without influencing production defaults.
 await page.addInitScript(()=>{Math.random=()=>0})
 await page.setViewportSize({width:375,height:812})
 await page.goto('/browser-tests/editor.html')
 await expect(page.getByRole('heading',{level:1})).toContainText('MY PACE.')
 await expect(page.getByRole('heading',{name:'캔버스 소개 제목'})).toBeVisible()
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check()
 await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 const visited:string[]=[]
 for(let i=0;i<18;i++){
  const heading=await page.getByRole('heading',{level:2}).innerText()
  visited.push(heading)
  const input=page.getByRole('radio',{name:/첫 번째/})
  await input.check()
  if(i===0){await page.getByRole('button',{name:'다음 질문'}).click();await page.getByRole('button',{name:'← 이전'}).click();await expect(page.getByRole('heading',{level:2})).toHaveText(heading);await expect(input).toBeChecked()}
  await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
 }
 expect(new Set(visited).size).toBe(18);expect(visited[0]).not.toBe('편집 질문 bs1')
 await expect(page.getByRole('heading',{name:/BTP.*편집 결과 BTP/})).toBeVisible()
 await expect(page.locator('.plum-description')).toHaveText('속성 패널에서 바꾼 성향 설명')
 await expect(page.locator('.plum-keywords span')).toHaveText(['#편집태그1','#편집태그2','#편집태그3'])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('Framer phone-sized component uses mobile layout inside a desktop canvas',async({page})=>{
 await page.setViewportSize({width:1440,height:1100})
 await page.goto('/')
 await page.addStyleTag({content:'#root{width:375px;margin:20px auto}'})
 await expect(page.locator('.plum-intro-grid')).toHaveCSS('grid-template-columns','330px')
 const widths=await page.locator('.plum-root').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}))
 expect(widths.scroll).toBeLessThanOrEqual(widths.client)
 await page.locator('.plum-root').screenshot({path:'test-results/plum-framer-phone-frame.png',animations:'disabled'})
})

test('all eight codes result from real 18-question answers, not only shared links',async({page})=>{
 test.setTimeout(120000)
 for(const expected of ['BTP','BTR','BMP','BMR','STP','STR','SMP','SMR']){
  await page.goto('/')
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check()
  await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
  for(let i=0;i<18;i++){
   const q=questions[i];const option=q.options.find(o=>o.pole===expected[['BS','TM','PR'].indexOf(q.axis)])!
   await page.getByRole('radio',{name:new RegExp(option.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).check()
   await page.getByRole('button',{name:i===17?'결과 보기':'다음 질문'}).click()
  }
  await expect(page.locator('.plum-result-code')).toHaveText(expected)
  await expect(page.getByLabel('나의 PLUM CODE 해석').locator('.plum-code-chip')).toHaveCount(3)
 }
})
test('base answer edit clears supplementary answers and recalculates only remaining ties',async({page})=>{
 await page.goto('/')
 await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'내 PLUM TYPE 찾기'}).click()
 for(let i=0;i<18;i++){
  await page.getByRole('radio',{name:new RegExp(questions[i].options[i%6<3?0:1].text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).check()
  await page.getByRole('button',{name:'다음 질문'}).click()
 }
 await page.getByRole('radio',{name:/궁금하면 도전/}).check();await page.getByRole('button',{name:'다음 질문'}).click()
 await page.getByRole('button',{name:'← 이전'}).click();await page.getByRole('button',{name:'← 이전'}).click()
 await page.getByRole('radio',{name:/흐름에 맡기고 새롭게 즐긴다/}).check();await page.getByRole('button',{name:'다음 질문'}).click()
 await expect(page.getByRole('button',{name:'다음 질문'})).toBeDisabled()
 for(const axis of ['BS','TM'] as const){await page.getByRole('radio',{name:new RegExp(supplements[axis].options[0].text)}).check();await page.getByRole('button',{name:axis==='TM'?'결과 보기':'다음 질문'}).click()}
 await expect(page.locator('.plum-result-code')).toHaveText('BTP')
})
test('legacy shared URLs keep working and are identified as translated legacy results',async({page})=>{
 for(const old of ['ESP','ESR','EMP','EMR','CSP','CSR','CMP','CMR']){
  await page.goto('/#plum='+old);await page.reload()
  await page.getByRole('checkbox',{name:/만 19세 이상/}).check();await page.getByRole('button',{name:'공유된 결과 보기'}).click()
  await expect(page.getByText(/이전 PLUM TYPE 공유 링크/)).toBeVisible()
  await expect(page.locator('.plum-result-code')).toHaveText(({ESP:'BTP',ESR:'BTR',EMP:'BMP',EMR:'BMR',CSP:'STP',CSR:'STR',CMP:'SMP',CMR:'SMR'} as Record<string,string>)[old])
 }
})
