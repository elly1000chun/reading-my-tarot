# 하이브리드 Tarot 질문 맞춤 해석 개발 계획

## Summary

사용자가 질문을 입력한 뒤 스프레드를 선택하면 기존 카드 리딩은 즉시 생성하고, 먼저 로컬 템플릿 기반 전체 요약을 표시한다. 이후 Cloudflare Worker가 OpenAI Responses API를 호출해 더 자연스러운 “전체 요약만” 생성하고, 성공 시 로컬 요약을 AI 요약으로 교체한다. API 실패, 네트워크 오류, 키 미설정 상황에서는 로컬 요약만으로 앱이 계속 동작한다.

공식 기준: OpenAI는 텍스트 생성에 Responses API 사용을 안내하며, 최신 모델은 Responses API와 Structured Outputs를 지원한다.

## 단계별 개발

### 1. 질문 입력 UI 추가

- `index.html`의 스프레드 선택 영역 위에 질문 입력 폼을 추가한다.
- 구성:
  - `textarea#questionInput`
  - `p#questionHelpText`
  - 선택적 에러 메시지 `p#questionError`
- 질문은 선택 사항으로 둔다. 비어 있으면 “현재 나에게 필요한 메시지” 같은 기본 질문으로 처리한다.
- 언어별 UI 문구를 `copyByLanguage` 객체로 분리해 한국어/영어 전환 시 질문 입력 안내, 로딩 문구, 요약 제목을 갱신한다.

### 2. 로컬 템플릿 요약 생성

- 새 함수 `createLocalInterpretation({ question, spreadType, reading, language })`를 추가한다.
- 반환값은 문자열 하나이며, 현재 요구사항에 맞게 카드별 상세 해석은 만들지 않는다.
- 요약에는 질문, 스프레드 이름, 주요 카드명, 포지션, 카드 의미를 짧게 조합한다.
- 리딩 결과 영역 위에 `section#interpretationPanel`을 추가하고, 로컬 요약을 즉시 렌더링한다.

### 3. AI 해석 API 클라이언트 추가

- 브라우저 코드에 `requestAiInterpretation(payload)` 함수를 추가한다.
- 호출 대상은 `/api/interpret-reading`으로 고정한다.
- 요청 JSON:

```json
{
  "question": "사용자 질문 또는 기본 질문",
  "language": "ko",
  "spreadType": "Three-Card Spread",
  "cards": [
    {
      "position": "Past",
      "name": "The Fool",
      "meanings": ["New beginnings"],
      "description": "..."
    }
  ]
}
```

- 응답 JSON:

```json
{
  "summary": "AI가 생성한 전체 요약",
  "source": "ai"
}
```

- 실패 시 기존 로컬 요약을 유지하고, 화면에는 조용한 상태 메시지 정도만 표시한다.

### 4. Cloudflare Worker 추가

- 새 Worker 엔트리 파일을 추가한다. 예: `worker/src/index.js`.
- `POST /api/interpret-reading`만 처리한다.
- Worker 환경 변수:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`, 기본값은 비용과 지연시간을 고려해 작은 최신 계열 모델로 설정 가능하게 둔다.
  - `ALLOWED_ORIGIN`, 배포 도메인 제한용
- Worker는 브라우저에서 받은 질문과 카드 데이터를 검증한다.
- OpenAI Responses API로 전체 요약만 생성한다.
- 프롬프트 정책:
  - 타로 리딩은 오락/성찰용이라고 표현한다.
  - 의학, 법률, 금융, 안전 관련 단정 조언은 피한다.
  - 질문 언어와 `language` 값에 맞춰 응답한다.
  - 120~180단어 또는 한국어 5~7문장 정도로 제한한다.
  - 카드 이름, 포지션, 카드 의미를 근거로 삼되 운명처럼 단정하지 않는다.
- CORS는 `ALLOWED_ORIGIN`과 로컬 개발 origin만 허용한다.

### 5. 상태 흐름 통합

- `performReading(spreadType)` 흐름을 다음 순서로 조정한다.
  - 질문 값을 읽고 정규화한다.
  - 기존처럼 카드를 뽑고 카드 UI를 렌더링한다.
  - 로컬 요약을 즉시 표시한다.
  - AI 요약 로딩 상태를 표시한다.
  - Worker 응답이 성공하면 요약 텍스트를 교체한다.
  - 실패하면 로컬 요약을 유지한다.
- `viewToken`을 AI 요청에도 적용해 언어 변경이나 New Reading 클릭 후 늦게 도착한 응답이 이전 화면을 덮어쓰지 않게 한다.
- `New Reading` 클릭 시 질문 입력은 유지하되, 결과와 요약 패널만 초기화한다.

### 6. 배포 설정

- GitHub Pages는 기존 정적 앱 호스팅으로 유지한다.
- Cloudflare Worker는 별도 배포하고, GitHub Pages에서 `/api/interpret-reading`로 접근하려면 다음 중 하나를 선택한다.
  - 같은 도메인으로 라우팅 가능한 경우 `/api/*`를 Worker에 연결한다.
  - 어렵다면 `AI_API_BASE_URL` 상수를 Worker URL로 둔다.
- API 키는 Cloudflare secret으로만 저장하고, 브라우저 코드와 저장소에는 절대 포함하지 않는다.

## Test Plan

- 단위 테스트:
  - `createLocalInterpretation`이 질문 없음, 한국어, 영어, 카드 의미 누락 상황에서도 문자열을 반환하는지 확인한다.
  - API payload 생성 시 카드명, 포지션, 의미, 설명만 포함되는지 확인한다.
- Worker 테스트:
  - `POST /api/interpret-reading` 정상 요청에 `{ summary, source: "ai" }`를 반환하는지 확인한다.
  - 잘못된 method, 빈 cards, 너무 긴 question, 허용되지 않은 origin을 거절하는지 확인한다.
  - OpenAI 오류 시 502 계열 JSON 오류를 반환하고 API 키를 노출하지 않는지 확인한다.
- 수동 브라우저 테스트:
  - 질문 입력 후 Single Card, Three Cards, Celtic Cross 각각에서 로컬 요약이 즉시 보이는지 확인한다.
  - Worker 성공 시 전체 요약이 AI 요약으로 교체되는지 확인한다.
  - Worker가 꺼져 있어도 카드 리딩과 로컬 요약이 계속 동작하는지 확인한다.
  - 언어 전환, New Reading, Show Details 모달이 기존처럼 동작하는지 확인한다.

## Assumptions

- 결과 화면에는 “전체 요약만” 추가하고 카드별 AI 해석은 추가하지 않는다.
- `src/tarot.js`는 순수 라이브러리로 유지하고, 질문 맞춤 해석은 데모 앱과 Worker 계층에서 처리한다.
- OpenAI API 키는 Cloudflare Worker secret으로만 관리한다.
- AI 해석은 보조 기능이며, 실패 시 로컬 템플릿 요약을 공식 fallback으로 사용한다.
