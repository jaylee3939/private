import {PARTICIPATION_CONSENT} from './participation-protocol.ts'
import type {Answers} from './quiz.ts'
export type PublicConfig={collectionEnabled:boolean;consentVersion:string;retentionDays:number;privacyContact:string;auth:{url:string;key:string}|null;checks?:Record<string,string>;configVersion?:string;collectionLocked?:boolean;loadError?:string}
export const fallbackConfig:PublicConfig={collectionEnabled:false,consentVersion:PARTICIPATION_CONSENT,retentionDays:90,privacyContact:'',auth:null}
export async function getConfig():Promise<PublicConfig>{
 try{
  const r=await fetch('/api/config',{cache:'no-store',signal:AbortSignal.timeout(10000)})
  if(!r.ok)return {...fallbackConfig,loadError:`CONFIG_HTTP_${r.status}`}
  if(!r.headers.get('content-type')?.includes('application/json'))return {...fallbackConfig,loadError:'CONFIG_NOT_JSON'}
  const c=await r.json()
  if(!c||typeof c!=='object'||typeof c.collectionEnabled!=='boolean'||!(c.auth===null||(typeof c.auth==='object'&&typeof c.auth.url==='string'&&typeof c.auth.key==='string')))return {...fallbackConfig,loadError:'CONFIG_INVALID_RESPONSE'}
  return {...fallbackConfig,...c}
 }catch{return {...fallbackConfig,loadError:'CONFIG_NETWORK_ERROR'}}
}
type Kind='visit'|'start'|'answer'|'complete'|'abandon'|'heartbeat'|'withdraw'|'share'
type Session={id:string;token:string;visitId:string;startId:string;completeId:string;completeRequested:boolean;completeQueued:boolean;finalAnswers?:Answers;visited:boolean;started:boolean;startRequested:boolean;active:boolean;complete:boolean}
export class Participation {
 private session:Session|null=null
 private pendingWithdrawal:Session|null=null
 private queue:Promise<void>=Promise.resolve()
 private lastFailure=''
 private report:(text:string)=>void
 constructor(report:(text:string)=>void){this.report=report}
 private payload(s:Session,kind:Kind,eventId:string=crypto.randomUUID(),extra:object={}){return {sessionId:s.id,token:s.token,eventId,kind,consent:true,adultConfirmed:true,consentVersion:PARTICIPATION_CONSENT,...extra}}
 private async post(s:Session,payload:object,force=false){
  const event=payload as {kind:Kind;eventId:string}
  this.lastFailure=''
  for(let attempt=0;attempt<3;attempt++){
   if(!force&&!s.active)return false
   try{
    const r=await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true,signal:AbortSignal.timeout(10000)})
    const value=await r.json().catch(()=>null)
    if(r.ok&&value?.verified===true&&value?.eventId===event.eventId&&(event.kind==='withdraw'?value.deleted===true:value.stored===true)){this.lastFailure='';return true}
    const code=!r.ok&&typeof value?.errorCode==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(value.errorCode)?value.errorCode:r.ok?'INVALID_STORAGE_ACK':'STORAGE_HTTP_ERROR'
    const databaseCode=typeof value?.databaseCode==='string'&&/^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(value.databaseCode)?value.databaseCode:''
    const requestId=typeof value?.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(value.requestId)?value.requestId:''
    this.lastFailure=` [${event.kind} · HTTP ${r.status} · ${code}${databaseCode?' · DB '+databaseCode:''}${requestId?' · '+requestId:''}]`
    console.warn('PLUM storage', {stage:event.kind,status:r.status,errorCode:code,...(requestId?{requestId}:{})})
    if(r.status===400||r.status===403||['COLLECTION_DISABLED','PARTICIPATION_SETUP_REQUIRED','SHARE_SETUP_REQUIRED','INVALID_EVENT','SESSION_REJECTED','SERVER_KEY_INVALID','SERVER_KEY_PUBLIC','SERVER_KEY_MISSING'].includes(code))return false
   }catch(error){
    const code=error instanceof Error&&error.name==='TimeoutError'?'STORAGE_TIMEOUT':'STORAGE_NETWORK_ERROR'
    this.lastFailure=` [${event.kind} · ${code}]`
    console.warn('PLUM storage',{stage:event.kind,errorCode:code})
   }
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))
  }return false
 }
 private failed(text:string,s?:Session){if(!s||this.session===s)this.report(text+this.lastFailure)}
 grant(){if(this.session?.active)return;this.session={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''),visitId:crypto.randomUUID(),startId:crypto.randomUUID(),completeId:crypto.randomUUID(),completeRequested:false,completeQueued:false,visited:false,started:false,startRequested:false,active:true,complete:false};this.send('visit')}
 private send(kind:Kind,extra:object={}){
  const s=this.session;if(!s?.active)return
  const event=this.payload(s,kind,kind==='visit'?s.visitId:kind==='start'?s.startId:kind==='complete'?s.completeId:crypto.randomUUID(),extra)
  this.queue=this.queue.then(async()=>{
   if(!s.active)return
   // A result contains the full final snapshot. Skip superseded queued partial
   // updates; the server atomically repairs visit/start before persisting it.
   if(s.completeRequested&&['answer','heartbeat','start'].includes(kind))return
   if(kind==='share'&&!s.complete){
    if(!s.finalAnswers){this.failed('공유 통계를 저장하지 못했어요.',s);return}
    const saved=await this.post(s,this.payload(s,'complete',s.completeId,{answers:s.finalAnswers}))
    if(!saved){this.failed('공유 전에 완료 저장을 확인하지 못했어요.',s);return}
    s.complete=true;s.visited=true;s.started=true
   }
   const ok=await this.post(s,event)
   if(ok){s.visited=true;if(kind!=='visit')s.started=true}
   if(ok&&kind==='complete'){s.complete=true;if(this.session===s)this.report('참여 통계 저장을 완료했어요.')}
   if(kind==='complete')s.completeQueued=false
   if(ok&&kind==='share'&&this.session===s)this.report('참여 통계 저장을 완료했어요. 친구에게 공유도 기록했어요.')
   if(!ok)this.failed('일부 통계가 저장되지 않았을 수 있어요. 테스트 결과에는 영향이 없어요.',s)
  }).catch(()=>{if(kind==='complete')s.completeQueued=false;this.failed('통계 저장에 연결하지 못했어요.',s)})
 }
 start(){const s=this.session;if(!s?.active||s.startRequested)return;s.startRequested=true;this.send('start')}
 answer(answers:Answers,questionId:string){this.send('answer',{answers:{...answers},questionId})}
 complete(answers:Answers){const s=this.session;if(!s?.active||s.complete||s.completeQueued)return;s.completeRequested=true;s.completeQueued=true;s.finalAnswers={...answers};this.report('참여 통계 저장을 확인하고 있어요.');this.send('complete',{answers:{...answers}})}
 share(){if(this.session?.active&&this.session.completeRequested)this.send('share')}
 retryPendingCompletion(){const s=this.session;if(s?.active&&!s.complete&&s.finalAnswers)this.complete(s.finalAnswers)}
 heartbeat(){if(this.session?.started&&!this.session.complete)this.send('heartbeat')}
 abandon(){const s=this.session;if(!s?.active||!s.visited||!s.started||s.complete)return;try{navigator.sendBeacon('/api/events',new Blob([JSON.stringify(this.payload(s,'abandon'))],{type:'application/json'}))}catch{}}
 close(){const s=this.session;this.session=null;if(s){this.abandonSession(s);this.queue=this.queue.then(()=>{s.active=false})}}
 private abandonSession(s:Session){if(s.active&&s.visited&&s.started&&!s.complete)try{navigator.sendBeacon('/api/events',new Blob([JSON.stringify(this.payload(s,'abandon'))],{type:'application/json'}))}catch{}}
 async revoke(){const s=this.session??this.pendingWithdrawal;if(!s)return true;s.active=false;this.session=null;this.pendingWithdrawal=s;await this.queue;const ok=await this.post(s,this.payload(s,'withdraw'),true);if(ok)this.pendingWithdrawal=null;this.report(ok?'수집을 중단하고 현재 참여 세션의 저장 기록을 삭제했어요.':'수집은 중단했지만 기록 삭제에 연결하지 못했어요. 삭제 재시도를 눌러 주세요.'+this.lastFailure);return ok}
}
