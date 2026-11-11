# PLUM 저장 진단 및 1회 확인

이 변경은 기존 문항·디자인·결과·채점을 바꾸지 않습니다. 기존 SQL·환경변수를 재설정하지 않습니다. 새 자동 저장·공유 확장은 PARTICIPATION_FLOW_SETUP_KO.md의 추가 SQL 06만 적용합니다. 운영 데이터 삭제/초기화 SQL은 없습니다. 브라우저 테스트의 합성 데이터는 폐기되는 로컬 PostgreSQL에만 들어갑니다.

## 배포 후 한 번 확인

1. Vercel의 최신 커밋이 Ready인지 확인하고 공개 테스트를 새로고침합니다.
2. 성인 확인과 선택 수집 동의를 모두 체크한 뒤 18문항(필요하면 동점 질문)을 완료합니다.
3. 결과 화면에서 **참여 통계 저장을 완료했어요.** 메시지를 기다립니다. 결과 유형만 보인 것은 저장 성공을 뜻하지 않습니다. 서버는 저장 함수의 HTTP 성공만 믿지 않고 세션·현재 이벤트·답변 행과 완료 결과를 DB에서 다시 읽어 비교합니다. 클라이언트도 verified=true와 일치하는 eventId가 없으면 성공으로 표시하지 않습니다.
4. /admin에서 한국 시간 기준 오늘을 포함한 기간으로 통계를 새로고침합니다. 완료 세션이 하나 늘고 해당 결과에 반영되는지 확인합니다. 통계는 실제 사람 수가 아니라 동의한 참여 세션 수입니다.
5. 실패 안내가 보이면 안내 끝의 `[단계 · HTTP 상태 · 오류 코드 · 조회용 ID]`만 전달합니다. Payload, 토큰, 원본 응답, 비밀키는 보내지 않습니다.

## 안전한 서버 로그

Vercel → 프로젝트 → Logs에서 안내의 조회용 ID를 검색합니다. 저장 API 로그는 scope=plum.events이며 stage(visit/start/answer/complete 등), 고정 오류 코드, 조회용 ID, HTTP/DB 오류 코드만 포함합니다. 답변·결과·세션/이벤트 ID·토큰/해시·비밀키·상위 서비스의 원문 오류는 출력하지 않습니다. 성공 요청에는 outcome=stored, verified=true가 기록됩니다. DB 조회 결과의 답변·결과·토큰 해시는 서버 내부 검증에만 쓰고 반환하거나 로그에 남기지 않습니다.

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
| PARTICIPATION_SETUP_REQUIRED / SHARE_SETUP_REQUIRED | 새 확장 SQL 06 적용 여부 확인 (기존 SQL 재실행 아님) |
| SESSION_NOT_CONFIRMED / EVENT_NOT_CONFIRMED | 저장 응답 후 세션/이벤트 행 확인 실패 |
| START_NOT_CONFIRMED / COMPLETION_NOT_CONFIRMED / ANSWERS_NOT_CONFIRMED | 시작 시각·완료 결과·답변 스냅샷의 DB 재조회 검증 실패 |
| METRICS_NOT_CONFIRMED | 집계 RPC와 테이블의 실제 기간별 건수가 불일치. 숫자를 0으로 대신 표시하지 않음 |
| DATABASE_COUNT_UNCONFIRMED | PostgREST의 정확한 건수(Content-Range)를 확인하지 못함 |
| INVALID_STORAGE_ACK | HTTP 성공이지만 저장 확인 JSON 또는 요청 이벤트 ID가 일치하지 않음 |
| STORAGE_NETWORK_ERROR / STORAGE_TIMEOUT | 브라우저 → 사이트 API 연결 |

로컬 통합 테스트는 실제 React 화면 → 실제 저장 API → 로컬 PostgreSQL의 운영 SQL → 실제 관리자 API/화면을 검사합니다. Supabase HTTP 전송·관리자 인증은 합성 응답으로 대체합니다. 이 성공을 운영 Supabase 저장 성공이라고 보고하지 않습니다. 작업 환경의 운영 도메인 접속은 프록시 정책으로 차단되었으며 운영 자격 증명도 제공되지 않았습니다. 따라서 기존 운영 장애의 근본 원인은 배포 후 실제 오류 코드가 확보되기 전에는 확정하지 않습니다.

## 관리자 0건 판별

관리자 조회는 한국 시간의 시작일 00:00(포함)~종료일 다음 날 00:00(제외)로 변환해 plum_sessions를 직접 count=exact로 조회하고 기존 집계 RPC와 비교합니다. 두 조회 사이 동시 참여로 건수가 바뀔 수 있어 불일치 시 한 번 재조회하며, 계속 다르면 오류를 표시합니다. 기존 시작일 코호트 기준은 바꾸지 않습니다.

- **DB 테이블 직접 조회와 집계 건수 일치**: 세 카운터가 원본과 일치합니다.
- **DB 직접 조회: 전체 참여 세션 0개**: 해당 서버가 연결한 운영 DB에는 저장된 참여 세션이 없습니다. 결과 화면의 실패 단계/코드를 확인합니다.
- **선택 기간에는 없음**: 전체 DB에는 기록이 있으나 선택한 한국 시간 기간에는 없습니다. 최근 세션 생성 시각을 함께 표시합니다.
- **집계 함수와 테이블 직접 조회 건수가 다름**: 집계 또는 조회 중 데이터 변화 문제를 숨기지 않고 실제 직접 조회 건수와 함께 표시합니다.

배포 후 사용자는 테스트 한 번과 관리자 새로고침만 하면 됩니다. 실패 시 결과 화면 안내 또는 관리자 진단 문구만 전달합니다. SQL/키 값을 다시 보낼 필요가 없습니다. 운영 DB를 직접 조회할 자격 증명이 이 작업 환경에는 없으므로 로컬 검증과 운영 검증은 구분합니다.
