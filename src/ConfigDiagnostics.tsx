import type {PublicConfig} from './telemetry.ts'
const names=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SITE_ORIGIN','PRIVACY_CONTACT','RETENTION_JOB_READY','DATA_COLLECTION_ENABLED']
const labels:Record<string,string>={public_key_rejected:'서버용 칸에 공개 키가 들어 있음',project_mismatch:'다른 프로젝트의 Legacy 키',expired:'Legacy 키 만료',missing:'서버에서 읽히지 않음',invalid:'형식 확인 필요',ready:'형식 확인됨',present:'입력됨 · 연결 검증 전',server_key_rejected:'공개용 칸에 서버 비밀키가 들어 있음',enabled:'true 설정',disabled:'false 설정'}
export function configError(code?:string){
 if(!code)return ''
 if(code==='CONFIG_HTTP_404')return '설정 API를 찾지 못했어요(404). 최신 Production 배포에 api/config 함수가 포함됐는지 확인해 주세요.'
 if(code?.startsWith('CONFIG_HTTP_'))return `설정 API가 서버 오류를 반환했어요(${code.replace('CONFIG_HTTP_','HTTP ')}). Vercel의 /api/config Runtime Logs에서 키 값 없이 오류 종류만 확인해 주세요.`
 if(code==='CONFIG_NOT_JSON')return '설정 API 대신 웹페이지가 반환됐어요. /api/config 경로와 Vercel 함수 배포·재작성 설정을 확인해 주세요.'
 if(code==='CONFIG_INVALID_RESPONSE')return '설정 API 응답 형식이 현재 앱과 달라요. 같은 커밋으로 Production을 다시 배포해 주세요.'
 return '설정 API에 연결하지 못했어요. 네트워크 연결과 /api/config 응답을 확인해 주세요.'
}
export default function ConfigDiagnostics({config}:{config:PublicConfig}){return <details open={!config.auth}><summary>서버 설정 진단 · 키 값은 표시하지 않습니다</summary>{config.loadError?<p role="alert">{configError(config.loadError)}</p>:<><p>설정 API: {config.configVersion==='plum-config-2'?'최신 진단 버전':'이전 버전 · 최신 커밋 배포 확인'}</p>{config.checks?<div className="admin-table"><table><caption>서버에서 읽은 7개 설정의 존재·형식 상태이며 실제 연결 성공을 뜻하지는 않습니다.</caption><thead><tr><th>환경변수</th><th>확인 결과</th></tr></thead><tbody>{names.map(name=><tr key={name}><th>{name}</th><td>{labels[config.checks?.[name]||'']||'확인 필요'}</td></tr>)}</tbody></table></div>:<p>상세 상태가 없습니다. 최신 배포의 설정 API인지 확인해 주세요.</p>}<p>로그인 창에는 SUPABASE_URL과 공개용 SUPABASE_ANON_KEY만 필요합니다. 관리자 통계에는 서버 키와 관리자 등록이 추가로 필요해요.</p></>}<p>{config.collectionLocked?'진단 중에는 코드 잠금으로 응답 저장을 중단합니다.':config.collectionEnabled?'응답 수집 설정이 켜져 있습니다.':'응답 수집 설정이 꺼져 있습니다.'} 수집 설정 진단과 관리자 로그인은 별개예요.</p></details>}
