import * as React from 'react'
import PlumType from './PlumType.tsx'
import {defaultContent,contentProps,loadPublicContent} from './content.ts'
import {getConfig,fallbackConfig,Participation} from './telemetry.ts'
export default function PublicQuiz(){
 const [content,setContent]=React.useState(defaultContent)
 React.useEffect(()=>{let alive=true;void loadPublicContent().then(d=>{if(alive)setContent(d.content)});return()=>{alive=false}},[])
 const [config,setConfig]=React.useState(fallbackConfig),[adult,setAdult]=React.useState(false),[consent,setConsent]=React.useState(false),[notice,setNotice]=React.useState(''),[withdrawFailed,setWithdrawFailed]=React.useState(false),[withdrawing,setWithdrawing]=React.useState(false)
 const [loaded,setLoaded]=React.useState(false)
 const allowedForRun=React.useRef<boolean|null>(null)
 const tracker=React.useRef<Participation|null>(null);if(!tracker.current)tracker.current=new Participation(()=>{})
 const active=React.useRef(false),adultRef=React.useRef(false),consentRef=React.useRef(false)
 function reconcile(){
  if(config.collectionEnabled&&adultRef.current&&consentRef.current){tracker.current!.grant();active.current=true}
  else if(active.current){active.current=false;setWithdrawing(true);setNotice('수집을 중단하고 현재 참여 기록 삭제를 요청하고 있어요.');void tracker.current!.revoke().then(ok=>{setWithdrawFailed(!ok);setWithdrawing(false);setNotice(ok?'현재 참여 기록을 삭제했어요.':'현재 참여 기록을 삭제하지 못했어요. 다시 시도해 주세요.')})}
 }
 function changeAdult(value:boolean){adultRef.current=value;setAdult(value);reconcile()}
 function changeConsent(value:boolean){consentRef.current=value;setConsent(value);reconcile()}
 React.useEffect(()=>{let alive=true;void getConfig().then(c=>{if(alive){setConfig(c);setLoaded(true)}});return()=>{alive=false}},[])
 React.useEffect(()=>{reconcile()},[config.collectionEnabled,adult,consent])
 React.useEffect(()=>{const leave=()=>tracker.current!.abandon();window.addEventListener('pagehide',leave);const online=()=>tracker.current!.retryPendingCompletion();window.addEventListener('online',online);const timer=setInterval(()=>{if(document.visibilityState==='visible')tracker.current!.heartbeat()},60000);return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('online',online);clearInterval(timer)}},[])
 const controls=<div>
 {config.collectionEnabled?<><label className="plum-check"><input type="checkbox" disabled={withdrawing||withdrawFailed} checked={consent} onChange={e=>changeConsent(e.target.checked)}/>익명 참여 통계 및 취향 응답 수집·이용에 동의합니다. (선택)</label><p className="plum-note">방문·시작·질문별 최종 선택·결과·완료 시각·링크 복사 성공 횟수·이탈 추정 정보를 수집하며 90일 후 삭제해요. 이름·연락처와 연결하지 않아요. 취향 응답에는 민감한 정보가 포함될 수 있어요. 동의하지 않아도 전체 테스트를 이용할 수 있어요. 체크를 해제하면 현재 참여 기록 삭제를 요청해요.</p></>:<p className="plum-note">현재 참여 통계 수집은 꺼져 있어요. 답변은 서버로 전송되지 않아요.</p>}
 <a className="plum-text" href="/privacy" target="_blank" rel="noreferrer">응답 수집·보관 안내 ↗</a>
 {notice&&<p className="plum-note" role="status">{notice}</p>}
 {withdrawFailed&&<button className="plum-text" disabled={withdrawing} onClick={()=>{setWithdrawing(true);void tracker.current!.revoke().then(ok=>{setWithdrawFailed(!ok);setWithdrawing(false);setNotice(ok?'현재 참여 기록을 삭제했어요.':'현재 참여 기록을 삭제하지 못했어요. 다시 시도해 주세요.')})}}>현재 참여 기록 삭제 재시도</button>}
 </div>
 return <PlumType {...contentProps(content)} startPending={!loaded} collectionControls={controls} onAdultChange={changeAdult} onQuizStart={()=>{reconcile();allowedForRun.current=active.current;if(active.current)tracker.current!.start()}} onQuizAnswer={(answers,id)=>{reconcile();if(allowedForRun.current===true&&active.current)tracker.current!.answer(answers,id)}} onQuizComplete={answers=>{reconcile();if(allowedForRun.current===true&&active.current)tracker.current!.complete(answers)}} onQuizShare={()=>{if(allowedForRun.current===true&&active.current)tracker.current!.share()}} onQuizReset={()=>{allowedForRun.current=null;adultRef.current=false;consentRef.current=false;active.current=false;tracker.current!.close();setConsent(false);setAdult(false);setNotice('')}} introStorageNotice={config.collectionEnabled?'답변은 화면 메모리에서 사용하며 새로고침하면 테스트 진행은 초기화돼요.\n별도 수집에 동의하면 익명 참여 기록과 질문별 최종 선택·결과를 서버에 90일 보관해요. 새로고침이나 재배포로 서버 기록이 지워지지는 않아요.':'현재 참여 통계 수집은 꺼져 있어요.\n답변은 화면 메모리에서만 사용하며 새로고침하면 사라집니다. 동점이면 추가 질문이 나와요.'}/>
}
