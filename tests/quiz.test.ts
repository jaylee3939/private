import {test} from 'node:test'
import assert from 'node:assert/strict'
import {questions,supplements,axes,tiedAxes,resolveResult,displayedOptions,questionWithCopy,results,parseSharedCode,legacyCodes} from '../src/quiz.ts'
test('18 final questions: six per axis; score positions are stable',()=>{
 assert.equal(questions.length,18);assert.equal(new Set(questions.map(q=>q.id)).size,18)
 for(const axis of axes)assert.equal(questions.filter(q=>q.axis===axis).length,6)
 for(const q of questions){assert.equal(q.options[0].pole,q.axis[0]);assert.equal(q.options[1].pole,q.axis[1]);assert.deepEqual(displayedOptions(q,true),[...q.options].reverse());const edited=questionWithCopy(q,{prompt:'새 문구',optionA:'새 선택지'});assert.equal(edited.id,q.id);assert.equal(edited.options[0].pole,q.options[0].pole)}
})
test('all 262144 answer combinations and all tie branches resolve without bias or fallback',()=>{
 const counts:Record<string,number>={}
 for(let mask=0;mask<2**18;mask++){
  const answers=Object.fromEntries(questions.map((q,i)=>[q.id,q.options[(mask>>i)&1].pole]))
  const ties=tiedAxes(answers)
  if(ties.length)assert.equal(resolveResult(answers),null)
  for(let t=0;t<2**ties.length;t++){
   const a={...answers};ties.forEach((axis,i)=>a[supplements[axis].id]=supplements[axis].options[(t>>i)&1].pole)
   const result=resolveResult(a);assert.ok(result)
   axes.forEach((axis,i)=>{const qs=questions.filter(q=>q.axis===axis);const n=qs.filter(q=>answers[q.id]===axis[0]).length;assert.equal(result[i],n===3?a[supplements[axis].id]:n>3?axis[0]:axis[1])})
   counts[result]=(counts[result]||0)+1
  }
 }
 assert.equal(Object.keys(counts).length,8);assert.equal(new Set(Object.values(counts)).size,1)
})
test('incomplete, invalid and tied responses cannot silently become a default result',()=>{
 assert.equal(resolveResult({}),null);assert.deepEqual(tiedAxes({}),[])
 const answers=Object.fromEntries(questions.map((q,i)=>[q.id,q.options[i%6<3?0:1].pole]))
 assert.deepEqual(tiedAxes(answers),axes);assert.equal(resolveResult(answers),null)
 for(const axis of axes)answers[supplements[axis].id]=supplements[axis].options[1].pole
 assert.equal(resolveResult(answers),'SMR');delete answers.tieBS;assert.equal(resolveResult(answers),null)
})
test('all eight new and all eight legacy links map explicitly; invalid keys rejected',()=>{
 for(const code of Object.keys(results)){assert.equal(parseSharedCode(code)?.code,code);assert.equal(parseSharedCode(code)?.legacy,false)}
 for(const [old,code] of Object.entries(legacyCodes)){assert.equal(parseSharedCode(old)?.code,code);assert.equal(parseSharedCode(old)?.legacy,true)}
 assert.equal(parseSharedCode('unknown'),null)
})
test('mock API still stores nothing and enforces independent consents',async()=>{
 const {default:api}=await import('../src/api.ts')
 const base={adultConfirmed:true as const,consentVersion:'prototype-1' as const,researchConsent:false,marketingConsent:false}
 await assert.rejects(api.mockAPI.submit({...base,research:{interests:[],price:'',barrier:''}}))
 await assert.rejects(api.mockAPI.submit({...base,email:'person@example.com'}))
 assert.deepEqual(await api.mockAPI.submit(base),{mode:'mock',stored:false})
})
