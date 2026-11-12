import {createHash} from 'node:crypto'
import {db,dbCount,DatabaseError,publicConfig} from './http.js'
import {PARTICIPATION_FLOW} from '../src/participation-protocol.js'
import type {ParticipationSnapshot} from '../src/participation-protocol.js'
import {questions} from '../src/quiz.js'
export function projectHint(){const url=publicConfig().url;return url?createHash('sha256').update(url).digest('hex').slice(0,12):'unconfigured'}
export async function readParticipationStatus(session:string):Promise<ParticipationSnapshot>{
 const rows=await db(`/rest/v1/plum_sessions?select=started_at,completed_at,result_code&id=eq.${session}`)
 const s=Array.isArray(rows)&&rows.length===1?rows[0]:null
 if(!s)throw new DatabaseError(404,'SESSION_NOT_CONFIRMED')
 const bySession=`session_id=eq.${session}`
 const [answerRows,startEvents,completeEvents,shares]=await Promise.all([
  db(`/rest/v1/plum_answers?select=question_id&${bySession}`),
  dbCount(`/rest/v1/plum_events?select=id&${bySession}&kind=eq.start`),
  dbCount(`/rest/v1/plum_events?select=id&${bySession}&kind=eq.complete`),
  dbCount(`/rest/v1/plum_share_events?select=id&${bySession}`).catch(error=>{if(error instanceof DatabaseError&&error.status===404)return null;throw error})
 ])
 if(!Array.isArray(answerRows)||answerRows.some(a=>typeof a?.question_id!=='string'))throw new DatabaseError(502,'SESSION_STATUS_INVALID')
 const ids=new Set(questions.map(q=>q.id)),answerCount=answerRows.filter(a=>ids.has(a.question_id)).length
 return {verified:true,started:Boolean(s.started_at),completed:Boolean(s.completed_at),answerCount,supplementaryCount:answerRows.length-answerCount,startEvents,completeEvents,shares,resultRecorded:typeof s.result_code==='string'&&/^[BS][TM][PR]$/.test(s.result_code),flowVersion:PARTICIPATION_FLOW,projectHint:projectHint()}
}
