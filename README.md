# PLUM TYPE 2.0

익명 참여 수집·관리자 대시보드 구현과 외부 설정은 [SUPABASE_SETUP_KO.md](SUPABASE_SETUP_KO.md)를 참고하세요. 실제 수집은 외부 DB·관리자·보관 작업·서버 환경변수 설정 후에만 활성화됩니다. 아래의 기존 mock 설명은 제품 리서치/구독 데모 또는 이전 버전 설명입니다.

## 독립 웹앱 실행·Vercel 배포

이 저장소의 최상위 폴더가 React + TypeScript + Vite 웹앱 루트입니다. Framer 없이 실행되며, `framer/`는 별도의 Framer 연결용 소스입니다.

```sh
npm ci
npm run dev
```

검증: `npm run build`, `npm test`, `npm run test:browser` (브라우저 검사는 Chromium 필요). Node.js 24를 권장합니다.

Vercel에서 이 저장소의 `main`을 Import하고 아래 설정을 사용하세요. `vercel.json`에도 같은 빌드 설정이 들어 있습니다.

| 설정 | 값 |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | 저장소 루트 `./` (기본값) |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

현재는 API 키나 환경변수가 필요하지 않습니다. 응답 저장·구독은 mock이며 실제 데이터를 수집하지 않습니다. 공식 이미지가 설정되지 않은 로컬 기본 화면에는 중립 자리 표시자가 표시됩니다. 실제 Framer 인스턴스의 이미지와 문구 설정이 GitHub에 자동 복사되지는 않습니다. 기존 Framer 사이트는 이 웹앱 배포와 별개입니다.

방문자 로그인을 요구하지 않는 운영 링크에는 Production 도메인을 사용하고, Vercel 프로젝트의 Deployment Protection이 공개 운영 요구사항에 맞는지 확인하세요.


현재 버전은 18문항 / B·S, T·M, P·R 체계입니다. 최신 설치·이전 안내는 [PLUM_TYPE_2_FRAMER_KO.md](PLUM_TYPE_2_FRAMER_KO.md)를 참고하세요. 아래의 1.0 설명은 이전 버전 기록이며 2.0의 문항 수·코드·다운로드 규격과 다릅니다.

# PLUM TYPE

**업데이트된 한국어 설치 안내: [FRAMER_KO.md](FRAMER_KO.md).** 모바일 결과 이미지 축소, 카드 인용/설명/해시태그, Framer 문구·색상·이미지 편집 항목이 추가되었습니다. 공식 첨부 이미지 원본 파일/URL은 아직 실행 환경에 전달되지 않아 연결 대기 상태입니다.

A Korean 19+ quiz prototype for PLUM. React + TypeScript, mobile first, no live backend, no data collection, no deployment. The brand palette is Juicy Orange #F36B38, Soft Cream #FFF0D8, Wine #8A3141, Ink #292522. Orange provides the hero, main controls and footer; cream is the reading surface. The typography pairs bold editorial sans with an italic serif. No invented mascot or purple theme.

## Preview locally

Node 22.6+ (validated with Node 24). Run in the repository:

```sh
npm ci
npm run dev
```

Open the address printed by Vite in your local browser. In a remote workspace use its supported port forwarding for port 5173. This starts a development server; it does not deploy. `npm run build` validates TypeScript and builds `dist/`; `npm test` runs scoring and API-contract tests. For browser coverage run `npx playwright install chromium` (if Chromium is not installed), then `npm run test:browser`. The browser suite starts/stops its own local server and writes screenshots to ignored `test-results/`.

## Install in Framer without publishing

For the current owner-editable controls and optional native text component slots, follow [the Korean guide](FRAMER_KO.md). Question copy, supplementary copy, result names and three separate hashtag controls are now editable. Question-order shuffling is an optional control (off by default); A/B positions still randomize per session. Native canvas layers require manually created Framer components connected to the provided slots; code HTML cannot automatically become native text layers.

1. Open your Framer project, Assets → Code → create code files. Copy `src/quiz.ts` and `src/api.ts` into same-named files, then `src/PlumType.tsx` into `PlumType.tsx`. Keep relative imports pointing at the matching files (Framer can display code file names without extensions; adjust import paths if its editor requires that).
2. Insert the default `PlumType` Code Component on a page. Set width Fill and height Fit Content / Auto. Avoid a fixed-height frame that clips the results. Preview with Framer's Preview control at 375, 768 and 1440px. Do not publish.
3. The core component intentionally has no Framer runtime dependency. To configure assets in Framer's property panel, create `PlumFramer.tsx` using `framer/PlumFramer.tsx`, then insert that wrapper instead. Upload approved images to Framer Assets and paste their URLs into the image controls. Set Share URL to the final quiz page URL when one exists; until then, shared links on ephemeral preview domains may not work for others.
4. Leave Analytics disabled. Framer integrations or project-wide analytics operate independently; disable them on this prototype while reviewing privacy. No API credentials belong in component properties.

## Official character asset required

The neutral orange studio panel is a placeholder, not a new mascot. Upload the official transparent PNG/WebP/SVG master before final visual approval. The single master URL is reused for all results until approved variations are supplied. Eight optional result asset fields accept variations of this SAME master only: preserve silhouette, proportions, palette, texture and style; vary pose, expression and small accessories. No variations have been invented. The downloadable PNG now includes the selected official image when configured, plus a quote, personality description and three hashtags. Images must allow canvas access (same-origin or CORS-enabled, such as Framer Assets). Failures display an accessible error instead of silently replacing the artwork. With no image configured, export explicitly labels the missing artwork. See the Korean guide for current Property Controls and installation steps.

## Full flow acceptance checks

- Intro: start disabled until age checkbox checked; disclaimer visible. This is self-attestation, not identity verification.
- Answer all 12 questions. A/B positions randomize once per session while pole scoring stays fixed. Next requires a selection. Previous preserves selection, supports edits, and invalidates old supplementary answers after any base edit.
- Force all three ties: for each axis's four questions pick the first named pole twice and the second pole twice (E/C, S/M, P/R); the data file identifies stable poles. Three supplementary questions must appear, one per tied axis. A type must not appear before these are answered. Go back and edit a base answer, then complete the recalculated supplements.
- Review each of the eight result types. Copy a link, open it in another tab, confirm age gate precedes shared result, and confirm shared result has no research form. Hash contains only type, never answers or email. A shared type is illustrative, not proof of a completed quiz.
- Download PNG and check Korean text, placeholder label, and dimensions (1080×1350). Copy-link fallback offers selectable text if clipboard permission is unavailable.
- Optional research: leaving both consents unchecked disables submission. Research-only accepts responses without email. Marketing-only requires a valid email and excludes research. Unchecking marketing clears email. Successful mock submission clears form state and explicitly says nothing was stored. Research and marketing are never bundled.
- Restart clears answers, shared type and form values. Refresh clears in-memory answers. No localStorage, cookie or network submission is used by the component.
- Keyboard: Tab, arrows in radio groups, Space on checkboxes, Enter on controls; focus moves to each new question/result heading. Check screen reader labels/status, 200% zoom, 320px width, and reduced-motion preference. Test with VoiceOver/NVDA and contrast tooling before launch. Orange buttons use Ink text for readability.

Automated tests exhaust all 4096 base answer combinations and every tied-axis resolution, confirm all eight types, incomplete-answer rejection, stale-tie handling and score-preserving option flips. Mock API tests enforce separate consent boundaries. These do not replace real-device and assistive-technology review.

## Data and integration

`src/quiz.ts`: editable questions, pole mapping, supplementary questions and all result content. Keep four questions per axis: changing that count also requires changing the majority threshold in `resolveResult` and tests. `src/api.ts`: explicit mock-only interface; no fetch, secret or Supabase connection. Questionnaire answers/type stay in React memory and are excluded from research payloads. Marketing consent can be given independently from research. No real consent notice is asserted: current text is a clearly labeled demo and cannot be used for production storage.

`analyticsEnabled` defaults false. Optional GA4 hooks emit only quiz_start, quiz_complete, quiz_restart, share_click and card_download, with a fixed category. They never send answer, type, email, question, research field or consent parameters. Only enable after applicable analytics consent and project privacy review. Configure GA4 to suppress URL/page-location/hash, form interactions, user-provided data, enhanced measurement and auto-captured dimensions on this route; project-level scripts can otherwise collect sensitive information beyond these hooks. Never use result types as audience, remarketing or user-profile attributes.

## Required backend work before any collection

1. Approve Korean privacy/consent notices: controller/contact, exact purpose, separate fields for research and marketing, retention, deletion/withdrawal, recipients/processors and any international transfers. Decide whether product-interest data needs additional sensitive-data protections/consent. Implement versioned notice links and consent records; current demo notice is insufficient.
2. Create a Supabase project in an approved region. Use separate research, marketing subscription and consent audit tables. Do not join quiz answers/type to identity; do not add these fields to the API. Store marketing identity independently from research records. Minimize timestamps/identifiers and enforce retention/deletion jobs.
3. Place an HTTPS server/Edge Function between the client and database. Keep service-role keys only in server secrets. Never put keys in Framer properties, source, Vite-exposed variables, logs or Git. If using a public Supabase key elsewhere, it still requires RLS; this prototype needs no client database key.
4. Enable RLS on every table, deny anonymous read/write, grant least privilege to the server. Validate an allowlisted versioned JSON schema, enum values, array lengths, email and independent consents server-side; reject unknown fields, missing adult attestation and excessive payloads. An absent research consent must reject research data; absent marketing consent must reject email. Do not trust client validation.
5. Rate limit, add abuse protection appropriate to the service, exact origin/CORS allowlist, request body limit and idempotency. Use CSRF protection if cookie authentication is introduced. Avoid request-body logs, query parameters and third-party session recordings. Encrypt transport/storage, restrict admin access and test unauthorized access explicitly.
6. Implement marketing double opt-in, unsubscribe and deletion flows; keep necessary consent evidence and make retention explicit. Add monitoring without sensitive payloads. Handle timeouts, retries and accessible errors; show real success only after server confirmation. Replace `QuizAPI` with a reviewed live implementation and return an explicit live receipt (the current return type deliberately only allows mock).
7. Run staging integration/security/privacy tests and verify deletion, consent withdrawal, no duplicate subscriptions, strict RLS and network payloads. Complete official-asset and accessibility review before enabling collection. No backend project, database tables or deployment has been created by this prototype.
