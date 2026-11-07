# PLUM 저장 진단 및 1회 확인

이 변경은 기존 문항·디자인·결과·채점을 바꾸지 않습니다. 운영 데이터 삭제/초기화 SQL은 없습니다. 브라우저 테스트의 합성 데이터는 폐기되는 로컬 PostgreSQL에만 들어갑니다.

## 배포 후 한 번 확인

1. Vercel의 최신 커밋이 Ready인지 확인하고 공개 테스트를 새로고침합니다.
2. 성인 확인과 선택 수집 동의를 모두 체크한 뒤 18문항(필요하면 동점 질문)을 완료합니다.
3. 결과 화면에서 **참여 통계 저장을 완료했어요. (complete 확인)** 메시지를 기다립니다. 결과 유형만 보인 것은 저장 성공을 뜻하지 않습니다.
4. /admin에서 한국 시간 기준 오늘을 포함한 기간으로 통계를 새로고침합니다. 완료 세션이 하나 늘고 해당 결과에 반영되는지 확인합니다. 통계는 실제 사람 수가 아니라 동의한 참여 세션 수입니다.
5. 실패 안내가 보이면 안내 끝의 `[단계 · HTTP 상태 · 오류 코드 · 조회용 ID]`만 전달합니다. Payload, 토큰, 원본 응답, 비밀키는 보내지 않습니다.

## 안전한 서버 로그

Vercel → 프로젝트 → Logs에서 안내의 조회용 ID를 검색합니다. 저장 API 로그는 scope=plum.events이며 stage(visit/start/answer/complete 등), 고정 오류 코드, 조회용 ID, HTTP/DB 오류 코드만 포함합니다. 답변·결과·세션/이벤트 ID·토큰/해시·비밀키·상위 서비스의 원문 오류는 출력하지 않습니다. 성공 요청에는 outcome=stored가 기록됩니다.

| 코드 | 확인할 부분 |
| --- | --- |
| ORIGIN_REJECTED | 실제 접속 주소와 SITE_ORIGIN의 origin 일치 여부. 보안 검사를 끄지 않습니다. |
| INVALID_EVENT | 성인/동의·세션 형식·문항 검증. request 단계에서 거절됩니다. |
| COLLECTION_DISABLED | 배포 환경변수와 /api/config의 활성 상태 |
| DATABASE_AUTH_FAILED | 같은 프로젝트의 활성 서버 키 |
| DATABASE_ACCESS_DENIED / 42501 | plum_ingest 함수·테이블에 대한 service_role 권한 |
| DATABASE_RPC_MISSING / PGRST202 | public.plum_ingest 설치·PostgREST 스키마 캐시 |
| DATABASE_REQUEST_FAILED | 함께 나온 고정 DB 오류 코드와 해당 조회용 ID |
| VISIT_REQUIRED / START_REQUIRED | 선행 세션/시작 저장 단계 |
| DATABASE_DNS_FAILED / DATABASE_TIMEOUT | Vercel → Supabase 연결 |
| DATABASE_RESPONSE_INVALID | Supabase 응답이 예상 JSON이 아님 |
| INVALID_STORAGE_ACK | HTTP 성공이지만 저장 확인 JSON 또는 요청 이벤트 ID가 일치하지 않음 |
| STORAGE_NETWORK_ERROR / STORAGE_TIMEOUT | 브라우저 → 사이트 API 연결 |

로컬 통합 테스트는 실제 React 화면 → 실제 저장 API → 로컬 PostgreSQL의 운영 SQL → 실제 관리자 API/화면을 검사합니다. Supabase HTTP 전송·관리자 인증은 합성 응답으로 대체합니다. 이 성공을 운영 Supabase 저장 성공이라고 보고하지 않습니다. 작업 환경의 운영 도메인 접속은 프록시 정책으로 차단되었으며 운영 자격 증명도 제공되지 않았습니다. 따라서 기존 운영 장애의 근본 원인은 배포 후 실제 오류 코드가 확보되기 전에는 확정하지 않습니다.
