import {basicMetrics} from '../server/basic-metrics.js'
import {directParticipationCounts,metricsShape} from '../server/storage-verification.js'
import {authorizeAdmin} from '../server/admin-auth.js'
import {json,db,dbCount,DatabaseError,type Request,type Response} from '../server/http.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'})
 try{
  if(!await authorizeAdmin(req,res))return
  const url=new URL(req.url||'/api/admin','https://local.invalid');const from=url.searchParams.get('from')||'',to=url.searchParams.get('to')||''
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to))||new Date(from).toISOString().slice(0,10)!==from||new Date(to).toISOString().slice(0,10)!==to||from>to||(Date.parse(to)-Date.parse(from))/86400000>92)return json(res,400,{error:'Select a date range of up to 93 days'})
  let shareReady=true
  const load=async()=>{
   try{return await db('/rest/v1/rpc/plum_metrics_v3',{method:'POST',body:JSON.stringify({p_from:from,p_to:to})})}
   catch(error){if(!(error instanceof DatabaseError)||(error.status!==404&&error.databaseCode!=='PGRST202'))throw error;shareReady=false;return {...await db('/rest/v1/rpc/plum_metrics',{method:'POST',body:JSON.stringify({p_from:from,p_to:to})}),shares:null}}
  }
  let metrics=await load()
  if(!metricsShape(metrics))return json(res,503,{errorCode:'METRICS_RESPONSE_INVALID'})
  let direct=await directParticipationCounts(from,to,shareReady)
  const agrees=()=>['visits','starts','completions',...(shareReady?['shares']:[])].every(k=>metrics[k]===direct[k as 'visits'|'starts'|'completions'|'shares'])
  if(!agrees()){metrics=await load();direct=await directParticipationCounts(from,to,shareReady)}
  if(!metricsShape(metrics)||!agrees())return json(res,503,{errorCode:'METRICS_NOT_CONFIRMED',audit:direct})
  let diagnosis='COUNTS_CONFIRMED',totalSessions:number|undefined,totalStarted:number|undefined,totalCompleted:number|undefined,latestCreatedAt:string|undefined
  if(direct.starts===0&&direct.completions===0){
   totalSessions=await dbCount('/rest/v1/plum_sessions?select=id')
   if(totalSessions>0){[totalStarted,totalCompleted]=await Promise.all([dbCount('/rest/v1/plum_sessions?select=id&started_at=not.is.null'),dbCount('/rest/v1/plum_sessions?select=id&completed_at=not.is.null')])}
   diagnosis=totalSessions===0?'NO_STORED_SESSIONS':totalStarted===0&&totalCompleted===0?'NO_STORED_STARTS':'OUTSIDE_SELECTED_DATES'
   if(totalSessions>0){const rows=await db('/rest/v1/plum_sessions?select=created_at&order=created_at.desc&limit=1');latestCreatedAt=Array.isArray(rows)?rows[0]?.created_at:undefined}
  }
  return json(res,200,{...metrics,basic:await basicMetrics(from,to),audit:{...direct,diagnosis,verification:'table-count-v1',shareReady,...(totalSessions!==undefined?{totalSessions,totalStarted:totalStarted??0,totalCompleted:totalCompleted??0}:{}),...(latestCreatedAt?{latestCreatedAt}:{})}})
 }catch(e){const code=e instanceof DatabaseError?(e.errorCode||(e.status===401?'DATABASE_AUTH_FAILED':e.status===403?'DATABASE_ACCESS_DENIED':e.status===404?'DATABASE_SCHEMA_MISSING':'DATABASE_UNAVAILABLE')):'SERVICE_UNAVAILABLE';return json(res,503,{error:'Unable to load dashboard',errorCode:code})}
}
