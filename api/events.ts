import {verifyStoredEvent} from '../server/storage-verification.js'
import {createHash,randomUUID} from 'node:crypto'
import {json,body,enabled,sameOrigin,db,databaseFailure,type Request,type Response} from '../server/http.js'
import {validate} from '../server/events.js'
export default async function handler(req:Request,res:Response){
 const requestId=randomUUID()
 let stage='request'
 function fail(status:number,errorCode:string,extra:Record<string,unknown>={}){
  const safe={scope:'plum.events',requestId,stage,errorCode,...extra}
  console.warn(JSON.stringify(safe))
  return json(res,status,{error:'Event was not stored',requestId,stage,errorCode,...extra})
 }
 if(req.method!=='POST')return fail(405,'METHOD_NOT_ALLOWED')
 if(!sameOrigin(req))return fail(403,'ORIGIN_REJECTED')
 let data:ReturnType<typeof validate>
 try{data=validate(body(req));stage=data.event.kind}catch{return fail(400,'INVALID_EVENT')}
 if(data.event.kind!=='withdraw'&&!enabled())return fail(503,'COLLECTION_DISABLED')
 try{
  const {event:e,result}=data
  const hash=createHash('sha256').update(e.token).digest('hex')
  if(e.kind==='withdraw'){
   await db('/rest/v1/rpc/plum_withdraw',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:hash})})
   await verifyStoredEvent(e,hash,result)
   console.info(JSON.stringify({scope:'plum.events',requestId,stage,outcome:'deleted',verified:true}))
   return json(res,200,{deleted:true,verified:true,eventId:e.eventId,requestId})
  }
  const receipt=e.kind==='share'?null:await db('/rest/v1/rpc/plum_ingest_v3',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:hash,p_event:e.eventId,p_kind:e.kind,p_answers:e.answers??null,p_question:e.questionId??null,p_result:result,p_consent:e.consentVersion,p_visit_event:stableId(e.sessionId,'visit'),p_start_event:stableId(e.sessionId,'start')})})
  if(e.kind==='share')await db('/rest/v1/rpc/plum_record_share',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:hash,p_event:e.eventId})})
  const storedEventId=e.kind==='share'?e.eventId:receipt?.event_id
  if(typeof storedEventId!=='string'||!/^[a-f0-9-]{36}$/i.test(storedEventId))return fail(503,'INVALID_STORAGE_RECEIPT')
  await verifyStoredEvent({...e,eventId:storedEventId},hash,result)
  console.info(JSON.stringify({scope:'plum.events',requestId,stage,outcome:'stored',verified:true}))
  return json(res,200,{stored:true,verified:true,eventId:e.eventId,requestId})
 }catch(error){const {errorCode,...details}=databaseFailure(error);return fail(503,('databaseCode' in details&&details.databaseCode==='PGRST202')?(stage==='share'?'SHARE_SETUP_REQUIRED':'PARTICIPATION_SETUP_REQUIRED'):errorCode,details)}
}

function stableId(session:string,kind:string){const h=createHash('sha256').update(`plum-v3:${session}:${kind}`).digest('hex').slice(0,32).split('');h[12]='4';h[16]='8';const s=h.join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`}
