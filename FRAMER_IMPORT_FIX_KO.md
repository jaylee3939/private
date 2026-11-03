# Framer 미리보기 import/export 오류 수정

## 교체할 파일은 세 개입니다

1. api.ts — 실행용 기본 export 추가. 기존 mockAPI·analytics 이름 export도 유지합니다.
2. PlumType.tsx — API 기본 객체에서 mockAPI·analytics를 가져옵니다. Research는 로컬에서 타입만 추론합니다. quiz 타입은 별도 import type으로 분리합니다.
3. PlumFramer.tsx — PlumType 기본 export만 가져옵니다. PlumProps·ResultCopy는 컴포넌트 타입에서 추론합니다. framer와 quiz 타입도 import type으로 분리합니다.

quiz.ts는 이번 수정에서 변경하지 않았습니다. 최신 관리형 버전의 quiz.ts(12문항과 questionWithCopy·shuffledQuestionIds 포함)를 그대로 사용합니다. 만약 오류에 이 두 함수 이름이 나오면 오래된 quiz.ts일 수 있으므로 해당 오류를 확인한 뒤 관리형 버전 파일로 맞춰야 합니다.

## 왜 이런 오류가 나타날 수 있나요?

Research, ResultCopy는 TypeScript의 타입입니다. 실행 시 JavaScript에는 남지 않으므로 일반 import로 요청하면 `does not provide an export named...`가 발생할 수 있습니다. mockAPI와 analytics는 반대로 실제 실행 값입니다. 이 이름 오류는 잘못 연결된 파일, 누락된 export, 다른 버전의 파일 또는 이전 모듈이 남은 미리보기 등 여러 이유로 발생할 수 있습니다.

현재 로컬 원본에는 두 실행 값이 정상 export되어 있어 사용자의 Framer 오류를 동일하게 재현하지는 못했습니다. 이번 수정은 API 경계를 기본 export로 단순화하고 문제로 보고된 타입 이름을 파일 사이에서 가져오지 않도록 변경합니다. 임의의 가짜 Research/ResultCopy 실행 값을 추가하는 방식은 사용하지 않습니다.

## 초보자용 전체 교체 순서

1. Framer에서 현재 페이지를 복제하고, 직접 수정한 코드나 문구가 있다면 별도로 보관합니다. 제공 파일은 여기서 관리한 최신 버전 전체이므로 Framer에서만 수정한 코드까지 자동 합쳐지지는 않습니다.
2. Assets → Code에서 **api.ts**를 엽니다.
3. 파일 목록이 아니라 **코드 글자가 보이는 영역**을 클릭합니다.
4. Mac은 Cmd+A, Windows는 Ctrl+A로 기존 코드 전체를 선택합니다. 새 api.ts의 전체 내용으로 교체합니다. 기존 코드 아래에 추가하지 마세요. 설명문이나 Markdown의 ``` 표시는 넣지 않습니다.
5. 똑같이 **PlumType.tsx**, **PlumFramer.tsx**를 순서대로 전체 교체합니다. 세 파일이 모두 바뀌기 전의 일시적인 오류는 최종 확인 대상이 아닙니다.
6. 네 파일이 Framer의 같은 코드 폴더에 있는지 확인합니다. 이름은 quiz.ts / api.ts / PlumType.tsx / PlumFramer.tsx이며 대소문자가 중요합니다. 같은 이름의 중복 파일이나 다른 폴더의 오래된 파일을 연결하지 마세요. 코드에서 파일을 못 찾는 오류가 나오면 해당 파일 위치와 import 경로부터 확인합니다.
7. Framer 코드 변경이 저장·반영된 다음 열려 있던 Preview를 닫습니다. Canvas로 돌아가 PlumFramer 인스턴스를 선택합니다. 없다면 Assets에서 페이지로 끌어옵니다.
8. **Preview ▶**를 다시 엽니다. 같은 이전 export 오류가 계속되면 Framer 편집기 페이지를 새로고침한 후 Preview를 다시 엽니다. **Publish는 누르지 않습니다.**
9. 성인 확인 → 12문항 → 필요한 동점 질문 → 결과와 다운로드를 확인합니다. 질문 편집, 결과 이름·이미지·태그 편집도 확인합니다. 데이터 수집은 여전히 꺼져 있습니다.

## 이번에 확인한 것과 확인하지 못한 것

- TypeScript 타입 검사와 Vite 빌드 실행
- 실제 Framer 패키지 타입으로 별도 복사한 네 파일의 타입 검사
- 각 파일을 독립 ES 모듈로 변환해 실행 import에 타입 이름이 남지 않는지 검사
- 변환된 quiz, api, PlumType 모듈을 실제 ES 모듈로 로드하여 export 연결 확인
- 채점·동점·동의·API export 계약 단위 테스트 및 전체 퀴즈·편집·반응형 브라우저 테스트

**확인하지 못한 부분:** 사용자의 실제 Framer 프로젝트 소스, Framer 자체 코드 변환기·캐시, 실제 캔버스/Property Controls 패널에서의 동작은 접근 권한이 없어 직접 검증하지 못했습니다. 로컬 검사를 통과했다는 사실이 Framer Preview의 성공을 확정하지는 않습니다.

그래도 오류가 나면 `The requested module...`의 **전체 문장**(특히 어떤 파일에서 어떤 export 이름을 찾지 못했는지)과 해당 파일 첫 import 줄을 보내 주세요. 빨간 밑줄 사진만으로는 원인을 확정할 수 없습니다. 비밀키나 개인정보는 보낼 필요가 없습니다.
