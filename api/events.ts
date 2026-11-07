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
  if(e.kind==='withdraw'){
   await db('/rest/v1/rpc/plum_withdraw',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:createHash('sha256').update(e.token).digest('hex')})})
   console.info(JSON.stringify({scope:'plum.events',requestId,stage,outcome:'deleted'}))
   return json(res,200,{deleted:true,eventId:e.eventId,requestId})
  }
  await db('/rest/v1/rpc/plum_ingest',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:createHash('sha256').update(e.token).digest('hex'),p_event:e.eventId,p_kind:e.kind,p_answers:e.answers??null,p_question:e.questionId??null,p_result:result,p_consent:e.consentVersion})})
  console.info(JSON.stringify({scope:'plum.events',requestId,stage,outcome:'stored'}))
  return json(res,200,{stored:true,eventId:e.eventId,requestId})
 }catch(error){const {errorCode,...details}=databaseFailure(error);return fail(503,errorCode,details)}
}
