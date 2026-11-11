import * as React from 'react'
import {PARTICIPATION_FLOW} from './participation-protocol.ts'
import type {ParticipationTrace} from './participation-protocol.ts'
import type {PublicConfig} from './telemetry.ts'
export type RunTrace={started:boolean;finished:boolean;allowed:boolean|null;answers:number;shares:number}
export const emptyRunTrace:RunTrace={started:false,finished:false,allowed:null,answers:0,shares:0}
export default function ParticipationStatus({config,loaded,adult,consent,run,trace,notice}:{config:PublicConfig;loaded:boolean;adult:boolean;consent:boolean;run:RunTrace;trace:ParticipationTrace;notice:string}){
 const [copy,setCopy]=React.useState(''),[manual,setManual]=React.useState(false)
 const snapshot=trace.snapshot,last=trace.failures.at(-1)
 const mismatch=Boolean(config.flowVersion&&config.flowVersion!==PARTICIPATION_FLOW)||Boolean(trace.serverFlowVersion&&trace.serverFlowVersion!==PARTICIPATION_FLOW)
 let summary='수집 동의 전 · 답변을 저장하지 않습니다.'
 if(!loaded)summary='수집 설정 확인 중 · 확인 후 테스트를 시작할 수 있습니다.'
 else if(config.loadError)summary=`수집 설정을 읽지 못해 저장하지 않습니다. [${config.loadError}]`
 else if(!config.collectionEnabled)summary='수집 OFF · 답변을 저장하지 않습니다.'
 else if(run.finished&&run.allowed===false)summary='이 테스트는 수집 동의 없이 시작되어 응답을 저장하지 않았습니다. 지금 동의해도 이전 답변은 소급 저장하지 않습니다.'
 else if(!adult||!consent)summary=run.started?'수집 동의가 없어 저장을 중단했습니다.':'성인 확인과 선택 수집 동의를 모두 체크해야 참여 통계를 저장합니다.'
 else if(mismatch)summary='페이지와 저장 API의 배포 버전이 다릅니다. 새로고침 후 진단 정보를 확인해 주세요.'
 else if(trace.snapshotError)summary=`DB 상태 확인 실패: ${trace.snapshotError.code}${trace.snapshotError.status?' · HTTP '+trace.snapshotError.status:''}. 저장 응답과 별도로 확인하지 못했습니다.`
 else if(snapshot?.completed&&snapshot.answerCount===18&&snapshot.resultRecorded)summary=`DB 확인: 시작 ${snapshot.startEvents} · 답변 ${snapshot.answerCount} · 완료 ${snapshot.completeEvents} · 공유 ${snapshot.shares??'확인 불가'}`
 else if(last)summary=`최근 저장 오류: ${last.stage} · ${last.status?'HTTP '+last.status+' · ':''}${last.code}${last.databaseCode?' · DB '+last.databaseCode:''}`
 else if(run.finished)summary=trace.queued.complete?'완료 저장 요청을 처리하고 있습니다.':'완료 요청이 전송되지 않았습니다. [COMPLETE_NOT_QUEUED]'
 else if(snapshot)summary=`진행 중: 시작 요청 ${trace.sent.start||0} · 응답 요청 ${trace.sent.answer||0}. 최종 DB 건수는 결과 화면에서 확인합니다.`
 else if(run.started)summary=trace.queued.start?'시작 저장 요청을 처리하고 있습니다.':'시작 요청이 전송되지 않았습니다. [START_NOT_QUEUED]'
 else if(adult&&consent)summary='수집 동의 확인 · 방문 세션 저장 중입니다.'
 const safe={storageNotice:notice,clientFlow:PARTICIPATION_FLOW,serverFlow:config.flowVersion||'unknown',eventAPIFlow:trace.serverFlowVersion||'unknown',commit:config.deploymentCommit||'unknown',projectHint:config.projectHint||'unknown',collectionEnabled:config.collectionEnabled,configError:config.loadError||null,adultConfirmed:adult,collectionConsent:consent,run,queued:trace.queued,sent:trace.sent,confirmed:trace.confirmed,failures:trace.failures,snapshot:trace.snapshot||null,snapshotError:trace.snapshotError||null}
 const diagnostic=JSON.stringify(safe,null,2)
 async function copyDiagnostic(){try{await navigator.clipboard.writeText(diagnostic);setCopy('진단 정보를 복사했어요. 답변·유형·토큰·비밀키는 포함되지 않습니다.');setManual(false)}catch{setManual(true);setCopy('아래 진단 정보만 선택해 복사해 주세요.')}}
 return <aside aria-label="참여 데이터 저장 상태" style={{fontSize:12,lineHeight:1.6,overflowWrap:'anywhere',marginBottom:16}}>
 <p className="plum-note" aria-live="polite">{summary}</p>
 {notice&&<p className="plum-note" aria-live="polite">{notice}</p>}
 <details><summary>저장 진단 정보 (답변·비밀키 제외)</summary><p>동의는 이 화면 메모리에만 유지됩니다. 서버는 동의한 세션의 실제 DB 건수만 확인합니다.</p><p>화면 콜백: 시작 {run.started?1:0} · 답변 {run.answers} · 완료 {run.finished?1:0} · 링크 복사 성공 {run.shares}</p><p>요청 전송: 방문 {trace.sent.visit||0} · 시작 {trace.sent.start||0} · 응답 {trace.sent.answer||0} · 완료 {trace.sent.complete||0} · 공유 {trace.sent.share||0}</p>{trace.snapshotError&&<p>DB 상태 확인: {trace.snapshotError.code} {trace.snapshotError.status?`(HTTP ${trace.snapshotError.status})`:''}</p>}<button className="plum-text" type="button" onClick={()=>void copyDiagnostic()}>저장 진단 복사</button><p aria-live="polite">{copy}</p>{manual&&<textarea aria-label="안전한 저장 진단 정보" readOnly value={diagnostic} rows={10} style={{width:'100%',boxSizing:'border-box'}} onFocus={e=>e.target.select()}/>}</details>
 </aside>
}
