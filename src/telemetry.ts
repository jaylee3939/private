import type {Answers} from './quiz.ts'
export type PublicConfig={collectionEnabled:boolean;consentVersion:string;retentionDays:number;privacyContact:string;auth:{url:string;key:string}|null;checks?:Record<string,string>;configVersion?:string;collectionLocked?:boolean;loadError?:string}
export const fallbackConfig:PublicConfig={collectionEnabled:false,consentVersion:'plum-responses-v1',retentionDays:90,privacyContact:'',auth:null}
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
type Kind='visit'|'start'|'answer'|'complete'|'abandon'|'heartbeat'|'withdraw'
type Session={id:string;token:string;visitId:string;startId:string;visited:boolean;started:boolean;startRequested:boolean;active:boolean;complete:boolean}
export class Participation {
 private session:Session|null=null
 private pendingWithdrawal:Session|null=null
 private queue:Promise<void>=Promise.resolve()
 private lastFailure=''
 private report:(text:string)=>void
 constructor(report:(text:string)=>void){this.report=report}
 private payload(s:Session,kind:Kind,eventId:string=crypto.randomUUID(),extra:object={}){return {sessionId:s.id,token:s.token,eventId,kind,consent:true,adultConfirmed:true,consentVersion:'plum-responses-v1',...extra}}
 private async post(s:Session,payload:object,force=false){
  const event=payload as {kind:Kind;eventId:string}
  this.lastFailure=''
  for(let attempt=0;attempt<3;attempt++){
   if(!force&&!s.active)return false
   try{
    const r=await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true,signal:AbortSignal.timeout(10000)})
    const value=await r.json().catch(()=>null)
    if(r.ok&&value?.eventId===event.eventId&&(event.kind==='withdraw'?value.deleted===true:value.stored===true)){this.lastFailure='';return true}
    const code=!r.ok&&typeof value?.errorCode==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(value.errorCode)?value.errorCode:r.ok?'INVALID_STORAGE_ACK':'STORAGE_HTTP_ERROR'
    const requestId=typeof value?.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(value.requestId)?value.requestId:''
    this.lastFailure=` [${event.kind} · HTTP ${r.status} · ${code}${requestId?' · '+requestId:''}]`
    console.warn('PLUM storage', {stage:event.kind,status:r.status,errorCode:code,...(requestId?{requestId}:{})})
    if(r.status===400||r.status===403||code==='COLLECTION_DISABLED')return false
   }catch(error){
    const code=error instanceof Error&&error.name==='TimeoutError'?'STORAGE_TIMEOUT':'STORAGE_NETWORK_ERROR'
    this.lastFailure=` [${event.kind} · ${code}]`
    console.warn('PLUM storage',{stage:event.kind,errorCode:code})
   }
   if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))
  }return false
 }
 private failed(text:string){this.report(text+this.lastFailure)}
 grant(){if(this.session?.active)return;this.session={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join(''),visitId:crypto.randomUUID(),startId:crypto.randomUUID(),visited:false,started:false,startRequested:false,active:true,complete:false};this.send('visit')}
 private send(kind:Kind,extra:object={}){
  const s=this.session;if(!s?.active)return
  const event=this.payload(s,kind,kind==='start'?s.startId:crypto.randomUUID(),extra)
  this.queue=this.queue.then(async()=>{
   if(!s.active)return
   if(!s.visited){s.visited=await this.post(s,this.payload(s,'visit',s.visitId));if(!s.visited){this.failed('통계 저장에 연결하지 못했어요. 테스트는 계속 이용할 수 있어요.');return}}
   if(kind==='visit')return
   if(['answer','complete','heartbeat'].includes(kind)&&!s.started){s.started=await this.post(s,this.payload(s,'start',s.startId));if(!s.started){this.failed('통계 시작 정보를 저장하지 못했어요. 테스트는 계속 이용할 수 있어요.');return}}
   const ok=await this.post(s,event)
   if(ok&&kind==='start')s.started=true
   if(ok&&kind==='complete'){s.complete=true;this.report('참여 통계 저장을 완료했어요. (complete 확인)')}
   if(!ok)this.failed('일부 통계가 저장되지 않았을 수 있어요. 테스트 결과에는 영향이 없어요.')
  }).catch(()=>{this.failed('통계 저장에 연결하지 못했어요.')})
 }
 start(){const s=this.session;if(!s?.active)return;if(s.startRequested){this.close();this.grant()}this.session!.startRequested=true;this.send('start')}
 answer(answers:Answers,questionId:string){this.send('answer',{answers:{...answers},questionId})}
 complete(answers:Answers){this.send('complete',{answers:{...answers}})}
 heartbeat(){if(this.session?.started&&!this.session.complete)this.send('heartbeat')}
 abandon(){const s=this.session;if(!s?.active||!s.visited||!s.started||s.complete)return;try{navigator.sendBeacon('/api/events',new Blob([JSON.stringify(this.payload(s,'abandon'))],{type:'application/json'}))}catch{}}
 close(){const s=this.session;this.session=null;if(s){this.abandonSession(s);this.queue=this.queue.then(()=>{s.active=false})}}
 private abandonSession(s:Session){if(s.active&&s.visited&&s.started&&!s.complete)try{navigator.sendBeacon('/api/events',new Blob([JSON.stringify(this.payload(s,'abandon'))],{type:'application/json'}))}catch{}}
 async revoke(){const s=this.session??this.pendingWithdrawal;if(!s)return true;s.active=false;this.session=null;this.pendingWithdrawal=s;await this.queue;const ok=await this.post(s,this.payload(s,'withdraw'),true);if(ok)this.pendingWithdrawal=null;this.report(ok?'수집을 중단하고 현재 참여 세션의 저장 기록을 삭제했어요.':'수집은 중단했지만 기록 삭제에 연결하지 못했어요. 삭제 재시도를 눌러 주세요.'+this.lastFailure);return ok}
}
