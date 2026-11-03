import {createHash} from 'node:crypto'
import {json,body,enabled,sameOrigin,db,type Request,type Response} from '../server/http.js'
import {validate} from '../server/events.js'
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'})
 if(!sameOrigin(req))return json(res,403,{error:'Origin not allowed'})
 let data:ReturnType<typeof validate>
 try{data=validate(body(req))}catch{return json(res,400,{error:'Invalid event'})}
 if(data.event.kind!=='withdraw'&&!enabled())return json(res,503,{error:'Collection is disabled'})
 try{const {event:e,result}=data;if(e.kind==='withdraw'){await db('/rest/v1/rpc/plum_withdraw',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:createHash('sha256').update(e.token).digest('hex')})});return json(res,200,{deleted:true})}await db('/rest/v1/rpc/plum_ingest',{method:'POST',body:JSON.stringify({p_session:e.sessionId,p_hash:createHash('sha256').update(e.token).digest('hex'),p_event:e.eventId,p_kind:e.kind,p_answers:e.answers??null,p_question:e.questionId??null,p_result:result,p_consent:e.consentVersion})});return json(res,200,{stored:true,eventId:e.eventId})}catch{return json(res,503,{error:'Unable to save event. Retry later.'})}
}
