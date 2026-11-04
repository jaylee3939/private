# PLUM 실제 참여 데이터 연결 — 운영자 안내

## 현재 상태

**관리자 연결 진단 중에는 `server/http.ts`의 `COLLECTION_RELEASE_READY=false`로 응답 저장을 추가 차단합니다.** Vercel의 DATA_COLLECTION_ENABLED를 true로 바꿔도 이 잠금이 풀리기 전에는 저장하지 않습니다. 이번 진단에서는 수집을 활성화하지 않습니다. 관리자가 로그인할 수 있는지는 이 잠금과 별개입니다.

안전한 상태 확인 주소: `https://private-atv6.vercel.app/api/config?diagnostics=1` — 알려진 환경변수 7개의 존재·형식 상태만 반환하며 공개 키를 포함한 실제 값과 문의처는 포함하지 않습니다. 이 응답에서 configVersion이 `plum-config-2`인지 확인하세요. API 404/500 또는 HTML 응답이면 관리자 페이지에서 해당 오류를 구분해 표시합니다.


코드·SQL·관리자 화면이 구현되어 있습니다. 실제 Supabase 프로젝트 실행·계정·비밀키는 자동 연결되지 않습니다. 외부 설정이 모두 끝나기 전에는 수집을 비활성화합니다. 사용자에게 비밀번호·service_role 키를 채팅에 보내도록 요청하지 않습니다.

기존 18문항·8개 유형·채점·Framer 편집 기능은 유지합니다. 별도의 제품 관심 설문/마케팅 구독은 여전히 mock이며 이 기능이 실제 저장으로 바뀐 것은 아닙니다. GA4에는 답변·결과를 보내지 않습니다.

## 1단계 · 테이블과 접근 제한 생성

1. Supabase → `plumtest` 프로젝트를 엽니다.
2. 왼쪽 **SQL Editor → New query**를 선택합니다.
3. `supabase/01_setup.sql` 내용을 전체 복사하여 붙여넣고 **Run**을 누릅니다.
4. 오류가 없다면 Table Editor에 `plum_sessions`, `plum_events`, `plum_answers`, `plum_admins` 네 테이블이 생깁니다. 이 단계에서 직접 RLS 정책을 추가하거나 공개 읽기를 허용하지 마세요.
5. 같은 이름의 테이블이 원래 있다면 구조를 먼저 확인합니다. 이 스크립트는 기존 테이블을 삭제하지 않지만, 같은 이름의 PLUM 함수를 교체합니다.

아래 단계는 1단계 성공을 확인한 뒤 순서대로 진행합니다. 아직 SQL을 실행하지 않았다면 모든 설정을 한꺼번에 진행할 필요가 없습니다.

## 2단계 · 관리자 계정과 허용 목록

1. Supabase **Authentication → Users → Add user**에서 실제 관리자 이메일과 강한 비밀번호로 사용자를 만듭니다. 이메일 확인 여부도 설정합니다. 공개 회원가입은 사용하지 않으므로 Authentication 설정에서 새 회원가입을 비활성화하는 것을 권장합니다.
2. `supabase/02_admin.sql`의 `CHANGE_ME@example.com`을 방금 만든 이메일로 바꾸고 SQL Editor에서 실행합니다. 비밀번호는 SQL에 넣지 않습니다.
3. 이메일 이름만 검사하는 것이 아니라 Supabase 사용자 ID를 관리자 허용 목록에 넣습니다. 다른 계정은 정상 로그인해도 통계를 볼 수 없습니다.
4. 관리자 삭제/해제는 Table Editor의 `plum_admins`에서 해당 사용자 ID의 행만 삭제하면 됩니다.

## 3단계 · 자동 보관 기간 정리

1. SQL Editor에서 `supabase/03_retention.sql`을 실행합니다.
2. 결과의 `plum-retention-90-days` 작업이 `active=true`인지 확인합니다. 하루 한 번 90일이 지난 세션과 연결된 응답/이벤트를 삭제합니다.
3. pg_cron 활성화 오류가 나면 오류 문구를 확인해야 합니다. 성공하기 전에는 다음 단계의 `RETENTION_JOB_READY`를 true로 설정하지 않습니다.

## 4단계 · Vercel 환경변수

Vercel의 해당 프로젝트 → **Settings → Environment Variables**에 아래 값을 넣고 **Production**에 적용합니다. `.env.example`은 키 이름만 보여 주는 예시이며 실제 값을 GitHub에 올리지 않습니다.

| 이름 | 입력할 값 |
| --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 Settings/API의 Project URL (`https://프로젝트참조.supabase.co`) |
| `SUPABASE_ANON_KEY` | publishable key 또는 Legacy `anon` 키. 공개 가능한 키이며 service_role 키를 넣으면 안 됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy `service_role` 키 또는 서버용 secret key. **서버 전용 비밀값**으로 저장 |
| `SITE_ORIGIN` | `https://private-atv6.vercel.app` |
| `PRIVACY_CONTACT` | 실제 운영자 문의 이메일 또는 연락 방법. 공개 개인정보 안내에 표시됨 |
| `RETENTION_JOB_READY` | 3단계가 성공했다면 `true` |
| `DATA_COLLECTION_ENABLED` | 처음에는 `false`. 최종 검증·고지 확인 후 `true` |

키는 Supabase의 **Project Settings → API Keys**에서 확인합니다. Legacy 키가 별도 탭에 있을 수 있습니다. Vercel의 secret/service_role 값에는 **절대 `VITE_` 접두사를 붙이지 않습니다.** 변수 저장 후 새 배포가 필요합니다. 프론트엔드에는 공개 URL과 publishable/anon 키만 설정 API가 반환하며, service_role 키는 반환하지 않습니다. Supabase URL은 기본 `.supabase.co` 주소를 사용합니다.

실제 수집 전 운영 주체/문의처, Supabase 프로젝트 지역, 외부 서비스·국외 이전 관련 고지와 민감한 취향 응답의 별도 동의 요건을 운영자가 확인해야 합니다. 제공 문구가 법률 검토를 대체하지는 않습니다.

## 5단계 · 관리자 로그인 확인

1. 새 배포 후 `https://private-atv6.vercel.app/admin`을 엽니다.
2. 2단계에서 지정한 계정으로 로그인합니다. 실제 통계가 없으면 0으로 표시됩니다. 관리자 로그인은 같은 사이트의 /api/login을 거쳐 Supabase Auth에 요청하며 비밀번호를 저장하지 않습니다.
3. 일반 계정이나 로그인하지 않은 브라우저에서는 원본/집계 조회가 차단되는지 확인합니다. 관리자 토큰은 화면 메모리만 사용하므로 새로고침하면 다시 로그인해야 합니다. 데이터가 삭제되는 것은 아닙니다.
4. 공개 회원가입·분석 대상 참여자 로그인은 없습니다.

## 6단계 · 수집을 끈 채 실제 저장 검증

**현재 `DATA_COLLECTION_ENABLED=false`와 코드 잠금을 모두 유지합니다. 검증을 위해 공개 수집을 켜지 않습니다.**

1. Supabase **SQL Editor → New query**에서 `supabase/04_verify_without_collection.sql` 전체를 실행합니다.
2. `PASS: 8 results, 18 answers each...` 결과를 확인합니다. 이 스크립트는 사람의 응답 대신 합성 세션 8개를 생성하여 각 18개 응답·8개 유형·집계·원본 접근 차단·철회 삭제를 확인합니다. 마지막에 전체 트랜잭션을 롤백하므로 기존 데이터와 검증 행 모두 변경사항이 남지 않습니다. 오류가 나면 `ROLLBACK;`을 실행하고 오류 문구만 확인합니다.
3. `/admin`에 로그인하여 기간을 오늘로 선택하고 조회합니다. 기존 응답이 없으면 통계는 0이 정상입니다. SQL의 검증 행은 롤백되므로 관리자 통계에 남지 않습니다. 이 조회가 성공해야 Vercel 서버 키·Supabase 인증·관리자 허용 목록·집계 RPC 연결이 함께 확인된 것입니다.
4. `supabase/03_retention.sql` 실행 결과에서 `plum-retention-90-days`의 `active=true`를 확인한 경우에만 `RETENTION_JOB_READY=true`로 설정합니다. 아직 확인하지 못했다면 `false`입니다. `invalid`는 허용 값이 아니며 한글 설명·따옴표 없이 소문자 `true` 또는 `false`만 입력합니다.
5. 공개 사이트에서 18문항을 완료하되, 네트워크에 `/api/events` 요청이 없고 테이블에 새 행이 생기지 않는지 확인합니다. 재배포·재로그인 후 기존 통계가 유지되는지도 확인합니다.

SQL 검증은 실제 DB 저장 함수를 검사하지만 **Production의 브라우저 → 수집 API → DB 전체 흐름 검증과 동일하지 않습니다.** 코드 잠금 해제는 이번 작업에 포함하지 않습니다. SQL PASS, 관리자 실제 조회, 자동 삭제 작업, 문의처·지역·동의 고지 확인 후 운영자만 참여하는 제한된 통합 검증과 별도의 수집 개시 판단이 필요합니다. 이 조건을 확인하기 전에는 DATA_COLLECTION_ENABLED를 true로 바꾸지 않습니다.

### 서버 키 오류를 해결하는 순서

1. Supabase `plumtest` → **Settings → API Keys**에서 같은 프로젝트의 활성 **Secret key**를 확인합니다. Legacy 탭을 사용한다면 `service_role` 키입니다. `publishable` / `anon` 키는 서버용 칸에 넣지 않습니다.
2. Vercel `private-atv6` → **Settings → Environment Variables** → `SUPABASE_SERVICE_ROLE_KEY` → **Edit** → **Production**에 키만 직접 붙여넣습니다. `Bearer `·따옴표·설명 문구를 붙이지 않습니다. 비밀값을 채팅이나 GitHub에 보내지 않습니다.
3. 과거 비밀키가 터미널 출력·대화·로그에 노출되었다면 새 secret 키를 생성하여 Vercel에 직접 반영한 다음, 새 배포에서 통계 조회 성공을 확인하고 기존 노출 키를 폐기합니다. Legacy JWT signing secret의 일괄 교체는 다른 키/로그인에도 영향을 주므로 임의로 실행하지 않습니다. 이 저장소는 키를 교체하지 않습니다.
4. **Deployments → 최신 Production → Redeploy** 후 `/admin`에서 확인합니다.
5. 진단의 `ready`는 형식만 확인한 것이며 서명·폐기 여부를 검증하지 않습니다. Legacy 키의 역할·만료·프로젝트가 잘못되면 화면에서 구분합니다. opaque secret 키가 다른 프로젝트 것이거나 폐기되었다면 Supabase의 실제 401 거절로만 확인됩니다.
6. 계속 `DATABASE_AUTH_FAILED`이면 같은 프로젝트의 활성 키인지 확인합니다. `DATABASE_ACCESS_DENIED`는 테이블/함수 권한, `DATABASE_SCHEMA_MISSING`은 SQL 설치 상태를 확인합니다. 인증을 통과시키기 위해 RLS를 해제하거나 anon 권한을 추가하지 않습니다.

작업 공간에는 실제 Supabase/Vercel 자격 증명이 연결되어 있지 않습니다. 로컬 검증 성공을 실제 프로젝트 검증 성공으로 간주하지 않습니다.

## 집계 기준 및 제한

- **방문:** 성인 확인과 수집 동의를 한 익명 방문 세션. 동의하지 않은 전체 방문자 수를 수집하지 않습니다.
- **참여자:** 실제 사람 수가 아니라 시작한 익명 참여 세션입니다. 새로고침·다시 시작·재방문은 중복 포함될 수 있습니다. 사람을 식별하는 쿠키·지문을 만들지 않습니다.
- **완료율:** 한국 시간 기준 선택 기간에 시작한 세션 중 완료한 비율. 기간 종료 뒤에 완료한 세션도 나중 조회 시 반영됩니다.
- **질문별 비율:** 해당 질문에 답한 시작 세션의 마지막 선택 기준. 미완료 세션도 포함합니다. 화면 A/B 위치가 아니라 고정 질문 ID와 선택 코드로 기록합니다.
- **결과 비율:** 같은 시작 코호트의 완료 결과 8개 분포. 공유 결과 링크 열기는 완료로 집계하지 않습니다.
- **이탈:** 시작 후 미완료이며 마지막 활동이 30분 이상 지난 세션의 추정치. 종료 이벤트는 전달이 보장되지 않아 이탈 판정의 유일한 기준으로 쓰지 않습니다. 진행 중에는 분당 활동 신호를 보내며 숨겨진 탭/오프라인/브라우저 종료의 한계가 있습니다.
- 종료 시점의 미전송 응답은 유실될 수 있습니다. 일반 요청은 제한 횟수 재시도하고 같은 이벤트 ID를 사용해 중복 저장을 방지합니다.
- 응답값은 브라우저 메모리에서만 사용하며 서버 저장에 동의한 경우에만 전송합니다. 서버에는 세션 토큰 원문 대신 해시를 저장합니다. 이름·이메일·IP·User-Agent를 분석 테이블에 저장하지 않습니다. Vercel/Supabase 자체 접속 로그는 별도 관리 대상입니다.
- 익명 공개 수집 API는 실제 사람 여부를 증명하지 않습니다. 무료 사용량 보호를 위해 새 세션 분당 120개와 세션별 이벤트 600개 제한이 있습니다. 트래픽이 늘면 레이트리밋·봇 방지와 비용 제한을 별도로 조정해야 합니다.
- SQL을 변경하거나 질문의 뜻/점수를 바꾸면 설문 버전·동의 버전·과거 통계 비교 기준을 함께 관리해야 합니다.

## 로컬 검증

`npm test`는 채점, 편집 속성, 수집 동의/철회/중복 방지, API 권한, 로컬 PostgreSQL(PGlite)에서 SQL·8개 결과·RLS/권한 차단·디스크 재시작 후 유지·보관 기간 삭제를 검사합니다. `npm run test:browser`는 기존 테스트와 동의/비동의/관리자 화면을 검사합니다. 브라우저의 Supabase/Auth 요청은 모의 응답을 사용하므로 실제 Supabase 연결 성공의 증거는 아닙니다. pg_cron 작업은 실제 Supabase에서 확인해야 합니다.
