import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {validate,CONSENT_VERSION} from '../server/events.ts'
import {questions} from '../src/quiz.ts'
import {Participation} from '../src/telemetry.ts'
const base=()=>({sessionId:randomUUID(),eventId:randomUUID(),token:'a'.repeat(64),consent:true,adultConfirmed:true,consentVersion:CONSENT_VERSION,kind:'visit'})
test('server validates consent, allowed fields, stable options and recomputed results',()=>{
 const b=base();assert.equal(validate(b).result,null)
 for(const bad of [{...b,consent:false},{...b,adultConfirmed:false},{...b,email:'x@example.com'},{...b,token:'bad'},{...b,answers:{}}])assert.throws(()=>validate(bad))
 assert.throws(()=>validate({...b,kind:'complete',answers:{}}))
 const answers=Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole]))
 assert.equal(validate({...b,kind:'complete',answers}).result,'BTP')
 assert.throws(()=>validate({...b,kind:'complete',answers,result:'SMR'}))
 assert.throws(()=>validate({...b,kind:'answer',answers:{bs1:'T'},questionId:'bs1'}))
})
test('collector sends nothing before consent; retries use same ID; revoke deletes current session',async()=>{
 const original=globalThis.fetch;const calls:any[]=[];let failed=false
 globalThis.fetch=async(_url:any,init:any)=>{const event=JSON.parse(init.body);calls.push(event);if(event.kind==='answer'&&!failed){failed=true;return new Response('',{status:503})}return new Response('{}',{status:200})}
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
 globalThis.fetch=async(_url:any,init:any)=>{calls.push(JSON.parse(init.body));return new Response('{}',{status:200})}
 try{const c=new Participation(()=>{});c.grant();c.start();c.complete(Object.fromEntries(questions.map(q=>[q.id,q.options[0].pole])));c.close();c.grant();c.start();await new Promise(r=>setTimeout(r,30));assert.equal(calls.some(e=>e.kind==='withdraw'),false);assert.equal(calls.filter(e=>e.kind==='complete').length,1);assert.equal(new Set(calls.map(e=>e.sessionId)).size,2)}finally{globalThis.fetch=original}
})

test('starting again from intro uses a new participation instead of overwriting previous answers',async()=>{
 const original=globalThis.fetch;const calls:any[]=[]
 globalThis.fetch=async(_url:any,init:any)=>{calls.push(JSON.parse(init.body));return new Response('{}',{status:200})}
 try{const c=new Participation(()=>{});c.grant();c.start();await new Promise(r=>setTimeout(r,10));c.start();await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(e=>e.kind==='start').length,2);assert.equal(new Set(calls.map(e=>e.sessionId)).size,2)}finally{globalThis.fetch=original}
})
