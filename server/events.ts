import {questions,supplements,resolveResult} from '../src/quiz.js'
import type {Answers} from '../src/quiz.js'
export const CONSENT_VERSION='plum-responses-v1'
export const kinds=['visit','start','answer','complete','abandon','heartbeat','withdraw'] as const
export type Kind=typeof kinds[number]
export type EventPayload={sessionId:string;token:string;eventId:string;kind:Kind;consentVersion:typeof CONSENT_VERSION;adultConfirmed:true;consent:true;answers?:Answers;questionId?:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function validate(input:unknown):{event:EventPayload;result:string|null}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid event')
 const o=input as Record<string,unknown>
 const allowed=['sessionId','token','eventId','kind','consentVersion','adultConfirmed','consent','answers','questionId']
 if(Object.keys(o).some(k=>!allowed.includes(k))||!uuid.test(String(o.sessionId))||!uuid.test(String(o.eventId))||typeof o.token!=='string'||!/^[a-f0-9]{64}$/.test(o.token)||!kinds.includes(o.kind as Kind)||o.consentVersion!==CONSENT_VERSION||o.consent!==true||o.adultConfirmed!==true)throw Error('Invalid event')
 const event=o as EventPayload
 if(event.kind==='answer'||event.kind==='complete'){
  if(!event.answers||typeof event.answers!=='object'||Array.isArray(event.answers)||Object.keys(event.answers).length>21)throw Error('Invalid answers')
  const all=[...questions,...Object.values(supplements)]
  for(const [id,pole] of Object.entries(event.answers)){const q=all.find(q=>q.id===id);if(!q||!q.options.some(p=>p.pole===pole))throw Error('Invalid option')}
  if(event.kind==='answer'&&(!all.some(q=>q.id===event.questionId)||!event.answers[event.questionId!]))throw Error('Invalid question')
 }else if(event.answers!==undefined||event.questionId!==undefined)throw Error('Unexpected payload')
 if(event.kind==='complete'&&event.questionId!==undefined)throw Error('Unexpected question')
 const result=event.kind==='complete'?resolveResult(event.answers!):null
 if(event.kind==='complete'&&!result)throw Error('Incomplete quiz')
 return {event,result}
}
