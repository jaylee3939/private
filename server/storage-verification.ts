import {db,dbCount,DatabaseError} from './http.js'
import type {EventPayload} from './events.js'
// These rows are read only by the server and are never included in responses/logs.
export async function verifyStoredEvent(e:EventPayload,hash:string,result:string|null){
 if(e.kind==='withdraw'){
  const rows=await db(`/rest/v1/plum_sessions?select=id&id=eq.${e.sessionId}`)
  if(!Array.isArray(rows)||rows.length!==0)throw new DatabaseError(502,'DELETE_NOT_CONFIRMED')
  return
 }
 const rows=await db(`/rest/v1/plum_sessions?select=id,token_hash,started_at,completed_at,result_code,plum_events(id,kind),plum_answers(question_id,pole)&id=eq.${e.sessionId}&plum_events.id=eq.${e.eventId}`)
 const s=Array.isArray(rows)&&rows.length===1?rows[0]:null
 if(!s||s.id!==e.sessionId||s.token_hash!==hash)throw new DatabaseError(502,'SESSION_NOT_CONFIRMED')
 if(!Array.isArray(s.plum_events)||s.plum_events.length!==1||s.plum_events[0].id!==e.eventId||s.plum_events[0].kind!==e.kind)throw new DatabaseError(502,'EVENT_NOT_CONFIRMED')
 if(e.kind!=='visit'&&(!s.started_at||!Number.isFinite(Date.parse(s.started_at))))throw new DatabaseError(502,'START_NOT_CONFIRMED')
 if(e.kind==='complete'&&(!s.completed_at||!Number.isFinite(Date.parse(s.completed_at))||s.result_code!==result))throw new DatabaseError(502,'COMPLETION_NOT_CONFIRMED')
 if(e.kind==='answer'||e.kind==='complete'){
  const expected=Object.entries(e.answers!)
  if(!Array.isArray(s.plum_answers)||s.plum_answers.length!==expected.length||!expected.every(([id,pole])=>s.plum_answers.some((a:{question_id:string;pole:string})=>a.question_id===id&&a.pole===pole)))throw new DatabaseError(502,'ANSWERS_NOT_CONFIRMED')
 }
}
export function koreanDateBounds(from:string,to:string){
 const start=new Date(`${from}T00:00:00+09:00`).toISOString()
 const end=new Date(Date.parse(`${to}T00:00:00+09:00`)+86400000).toISOString()
 return {start,end}
}
export async function directParticipationCounts(from:string,to:string){
 const {start,end}=koreanDateBounds(from,to)
 const filter=(column:string)=>`${column}=gte.${encodeURIComponent(start)}&${column}=lt.${encodeURIComponent(end)}`
 const [visits,starts,completions]=await Promise.all([
  dbCount(`/rest/v1/plum_sessions?select=id&${filter('created_at')}`),
  dbCount(`/rest/v1/plum_sessions?select=id&${filter('started_at')}`),
  dbCount(`/rest/v1/plum_sessions?select=id&${filter('started_at')}&completed_at=not.is.null`)
 ])
 return {visits,starts,completions,startUTC:start,endExclusiveUTC:end}
}
export function metricsShape(value:any){
 const count=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
 return value&&['visits','starts','completions','dropoffs'].every(k=>count(value[k]))&&value.completions<=value.starts&&Array.isArray(value.daily)&&Array.isArray(value.results)&&Array.isArray(value.answers)&&value.results.every((r:any)=>r&&/^[BS][TM][PR]$/.test(r.code)&&count(r.count))&&new Set(value.results.map((r:any)=>r.code)).size===value.results.length&&value.results.reduce((n:number,r:any)=>n+r.count,0)===value.completions
}
