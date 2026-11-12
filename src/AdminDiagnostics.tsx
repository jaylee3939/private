import * as React from 'react'
import ConfigDiagnostics from './ConfigDiagnostics.tsx'
import type {PublicConfig} from './telemetry.ts'
import type {ParticipationSnapshot} from './participation-protocol.ts'
type Session={id:string;created_at:string}
export default function AdminDiagnostics({token,config}:{token:string;config:PublicConfig}){
 const [settings,setSettings]=React.useState<PublicConfig|null>(null),[sessions,setSessions]=React.useState<Session[]>([]),[snapshot,setSnapshot]=React.useState<ParticipationSnapshot|null>(null),[selected,setSelected]=React.useState(''),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false)
 async function read(url:string){const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)});const v=await r.json();if(!r.ok)throw Error(r.status===401||r.status===403?'관리자 인증이 필요해요. 다시 로그인해 주세요.':`진단 조회 실패: ${v.errorCode||'REQUEST_FAILED'}`);return v}
 async function inspect(id:string){setSnapshot(null);setSelected(id);setError('');try{setSnapshot(await read(`/api/participation?session=${encodeURIComponent(id)}`))}catch(e){setError(e instanceof Error?e.message:'진단 조회에 실패했어요.')}}
 async function load(){setBusy(true);setError('');setSettings(null);setSnapshot(null);try{const c=await read('/api/config?diagnostics=1');const list=await read('/api/participation');setSettings({...config,...c});setSessions(list.sessions);if(list.sessions.length)await inspect(list.sessions[0].id)}catch(e){setError(e instanceof Error?e.message:'진단 조회에 실패했어요.')}finally{setBusy(false)}}
 return <details onToggle={e=>{if(e.currentTarget.open&&!settings&&!busy)void load()}}><summary>관리자 저장 진단</summary>
 {busy&&<p>확인 중…</p>}{error&&<p role="alert">{error}</p>}
 {settings&&<><ConfigDiagnostics config={settings}/><p>배포 버전: {settings.deploymentCommit||'확인 불가'} · 수집 흐름: {settings.flowVersion||'확인 불가'}</p><button disabled={busy} onClick={load}>진단 새로고침</button><label>최근 참여 세션<select aria-label="진단할 참여" value={selected} onChange={e=>void inspect(e.target.value)}>{sessions.map(s=><option key={s.id} value={s.id}>{new Date(s.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · {s.id.slice(0,8)}</option>)}</select></label>{!sessions.length&&<p>저장된 참여 세션이 없습니다.</p>}
 {snapshot&&<p role="note">DB 확인: 시작 {snapshot.startEvents} · 답변 {snapshot.answerCount} · 완료 {snapshot.completeEvents} · 공유 {snapshot.shares??'확인 불가'} · 결과 저장 {snapshot.resultRecorded?'확인':'미확인'}</p>}</>}
 </details>
}
