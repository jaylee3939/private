import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {validate,CONSENT_VERSION} from '../server/events.ts'
import {questions} from '../src/quiz.ts'
import {Participation} from '../src/telemetry.ts'
const base=()=>({sessionId:randomUUID(),eventId:randomUUID(),token:'a'.repeat(64),consent:true,sensitiveConsent:true,adultConfirmed:true,consentVersion:CONSENT_VERSION,kind:'visit'})
test('server validates consent, allowed fields, stable options and recomputed results',()=>{
 const b=base();assert.equal(validate(b).result,null)
 for(const bad of [{...b,consent:false},{...b,adultConfirmed:false},{...b,email:'x@example.com'},{...b,token:'bad'},{...b,answers:{}},{...b,consentVersion:[CONSENT_VERSION]}])assert.throws(()=>validate(bad))
 assert.throws(()=>validate({...b,kind:'complete',answers:{}}))
 const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole]))
 assert.equal(validate({...b,kind:'complete',answers}).result,'BTP')
 assert.throws(()=>validate({...b,kind:'complete',answers,result:'SMR'}))
 assert.throws(()=>validate({...b,kind:'answer',answers:{bs1:'T'},questionId:'bs1'}))
})
test('collector sends nothing before consent; retries use same ID; revoke deletes current session',async()=>{
 const original=globalThis.fetch;const calls:any[]=[];let failed=false
 globalThis.fetch=async(_url:any,init:any)=>{const event=JSON.parse(init.body);calls.push(event);if(event.kind==='answer'&&!failed){failed=true;return new Response('',{status:503})}return new Response(JSON.stringify(event.kind==='withdraw'?{deleted:true,verified:true,eventId:event.eventId}:{stored:true,verified:true,eventId:event.eventId}),{status:200})}
 try{
  const collector=new Participation(()=>{})
  collector.start();collector.answer({bs1:'B'},'bs1');await new Promise(r=>setTimeout(r,0));assert.equal(calls.length,0)
  collector.grant();collector.start();collector.answer({bs1:'B'},'bs1');await new Promise(r=>setTimeout(r,700))
  const answers=calls.filter(e=>e.kind==='answer');assert.equal(answers.length,2);assert.equal(answers[0].eventId,answers[1].eventId)
  assert.equal(calls[0].kind,'visit');assert.equal(calls[1].kind,'start')
  assert.equal(await collector.revoke(),true);assert.equal(calls.at(-1).kind,'withdraw')
  const count=calls.length;collector.start();collector.answer({bs1:'S'},'bs1');await new Promise(r=>setTimeout(r,0));assert.equal(calls.length,count)
 }finally{globalThis.fetch=original}
})
test('restarting does not withdraw a previously completed session',async()=>{
 const original=globalThis.fetch;const calls:any[]=[]
 globalThis.fetch=async(_url:any,init:any)=>{const event=JSON.parse(init.body);calls.push(event);return new Response(JSON.stringify({stored:true,verified:true,eventId:event.eventId}),{status:200})}
 try{const c=new Participation(()=>{});c.grant();c.start();c.complete(Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole])));c.close();c.grant();c.start();await new Promise(r=>setTimeout(r,30));assert.equal(calls.some(e=>e.kind==='withdraw'),false);assert.equal(calls.filter(e=>e.kind==='complete').length,1);assert.equal(new Set(calls.map(e=>e.sessionId)).size,2)}finally{globalThis.fetch=original}
})

test('duplicate first-question notifications keep a single participation and start event',async()=>{
 const original=globalThis.fetch;const calls:any[]=[]
 globalThis.fetch=async(_url:any,init:any)=>{const event=JSON.parse(init.body);calls.push(event);return new Response(JSON.stringify({stored:true,verified:true,eventId:event.eventId}),{status:200})}
 try{const c=new Participation(()=>{});c.grant();c.start();await new Promise(r=>setTimeout(r,10));c.start();await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(e=>e.kind==='start').length,1);assert.equal(new Set(calls.map(e=>e.sessionId)).size,1)}finally{globalThis.fetch=original}
})

test('collector rejects HTTP-200 HTML and reports safe error stage without answers or tokens',async()=>{
 const original=globalThis.fetch,warn=console.warn;const messages:string[]=[],logs:unknown[]=[]
 try{
  console.warn=(...args:unknown[])=>{logs.push(args)}
  globalThis.fetch=async()=>new Response('<html>not a storage acknowledgement</html>',{status:200})
  const c=new Participation(text=>messages.push(text));c.grant();await c.revoke()
  assert.ok(messages.some(m=>m.includes('INVALID_STORAGE_ACK')))
  assert.equal(JSON.stringify(logs).includes('token'),false)
  assert.equal(JSON.stringify(logs).includes('sessionId'),false)
 }finally{globalThis.fetch=original;console.warn=warn}
})
test('collector reports API diagnostic reference and only confirms completion after matching acknowledgement',async()=>{
 const original=globalThis.fetch,warn=console.warn;const messages:string[]=[],logs:unknown[]=[]
 try{
  console.warn=(...args:unknown[])=>{logs.push(args)}
  const requestId=randomUUID()
  globalThis.fetch=async(_url:any,init:any)=>{const e=JSON.parse(init.body);return e.kind==='visit'?new Response(JSON.stringify({errorCode:'ORIGIN_REJECTED',requestId}),{status:403}):new Response(JSON.stringify({deleted:true,verified:true,eventId:e.eventId}))}
  const c=new Participation(text=>messages.push(text));c.grant();await new Promise(r=>setTimeout(r,20))
  assert.ok(messages.some(m=>m.includes('visit')&&m.includes('ORIGIN_REJECTED')&&m.includes(requestId)))
  assert.equal(messages.some(m=>m.includes('참여 통계 저장을 완료했어요.')),false)
  await c.revoke()
  globalThis.fetch=async(_url:any,init:any)=>{const e=JSON.parse(init.body);return new Response(JSON.stringify({stored:true,verified:true,eventId:e.eventId}))}
  const ok=new Participation(text=>messages.push(text));ok.grant();ok.start();ok.complete(Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole])))
  await new Promise(r=>setTimeout(r,20));assert.ok(messages.some(m=>m.includes('참여 통계 저장을 완료했어요.')))
 }finally{globalThis.fetch=original;console.warn=warn}
})

test('failed visit/start cannot suppress the automatic final snapshot; completion retries use a stable ID',async()=>{
 const oldFetch=globalThis.fetch,warn=console.warn,calls:any[]=[],messages:string[]=[]
 try{
  console.warn=()=>{};let failComplete=true
  globalThis.fetch=async(_url:any,init:any)=>{const e=JSON.parse(init.body);calls.push(e);if(e.kind==='visit'||e.kind==='start')return new Response(JSON.stringify({errorCode:'INVALID_EVENT'}),{status:400});if(e.kind==='complete'&&failComplete)return new Response(JSON.stringify({errorCode:'PARTICIPATION_SETUP_REQUIRED'}),{status:503});return new Response(JSON.stringify({stored:true,verified:true,eventId:e.eventId}))}
  const c=new Participation(t=>messages.push(t));c.grant();c.start();await new Promise(r=>setTimeout(r,20));const a=Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole]));c.complete(a);c.complete(a);await new Promise(r=>setTimeout(r,20))
  assert.equal(calls.filter(e=>e.kind==='complete').length,1);failComplete=false;c.retryPendingCompletion();await new Promise(r=>setTimeout(r,20))
  const completed=calls.filter(e=>e.kind==='complete');assert.equal(completed.length,2);assert.equal(completed[0].eventId,completed[1].eventId);assert.ok(messages.includes('참여 통계 저장을 완료했어요.'))
  c.share();await new Promise(r=>setTimeout(r,20));assert.equal(calls.filter(e=>e.kind==='share').length,1)
 }finally{globalThis.fetch=oldFetch;console.warn=warn}
})

test('a late completion acknowledgement from a previous attempt does not mark a new attempt saved',async()=>{
 const oldFetch=globalThis.fetch;const messages:string[]=[];let finish:()=>void=()=>{}
 try{
  globalThis.fetch=async(_url:any,init:any)=>{const e=JSON.parse(init.body);if(e.kind==='complete')await new Promise<void>(r=>{finish=r});return new Response(JSON.stringify({stored:true,verified:true,eventId:e.eventId}))}
  const c=new Participation(t=>messages.push(t));c.grant();c.start();await new Promise(r=>setTimeout(r,10));c.complete(Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole])));await new Promise(r=>setTimeout(r,10));c.close();c.grant();c.start();messages.length=0;finish();await new Promise(r=>setTimeout(r,20))
  assert.equal(messages.includes('참여 통계 저장을 완료했어요.'),false)
 }finally{globalThis.fetch=oldFetch}
})
