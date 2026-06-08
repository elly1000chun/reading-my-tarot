# Refactoring Analysis

분석 기준: `src/*.js`, `package.json`, `test/tarot.test.js`, `decks/en/*.json`을 확인했고, deck JSON은 Node로 파싱해 필드 누락을 검사했습니다. JSON 파싱 오류는 없었습니다.

## 오류 가능성 높음

- `package.json`: `"node.js": "^0.0.1-security"`가 runtime dependency로 들어가 있습니다. Node.js는 npm dependency로 설치하는 패키지가 아니므로 제거하는 게 맞습니다. 보안 placeholder 패키지라 audit noise도 만들 수 있습니다.
- `src/tarot.js`: `initializeDeck()`가 `null`을 유효한 카드처럼 통과시킬 수 있습니다. `typeof null === "object"`라서 현재 검증으로는 걸러지지 않습니다.
- `src/tarot.js`: `drawCards(count)`가 `count` 타입/범위를 검증하지 않습니다. `0`, 음수, 문자열, `NaN`, 소수 입력이 이상한 결과를 만들 수 있습니다.
- `decks/en/default.json`, `decks/en/waites.json`: `Strength`, `Strength Reversed` 카드의 `type`, `value`, `suit`가 누락되어 있습니다.
- `decks/en/default.json`, `decks/en/waites.json`: `Judgement`, `Judgement Reversed` 카드의 `type`, `value`, `suit`가 누락되어 있습니다.

## 리팩토링 필요

- `src/tarot.js`: `InvalidSpreadError`가 정의만 되고 사용되지 않습니다. spread 검증 실패에 이 error를 쓰거나 제거하는 게 좋습니다.
- `src/tarot.js`: `addSpread(name, { positions, description = null })`는 두 번째 인자가 없으면 구조분해 단계에서 일반 `TypeError`가 납니다. 명시적 옵션 검증으로 바꾸는 편이 낫습니다.
- `src/tarot.js`: `shuffleDeck()`은 초기화 때 freeze한 deck을 다시 일반 배열로 바꿉니다. 불변성을 유지할지, 내부 상태는 mutable로 둘지 정책을 통일해야 합니다.
- `src/webpack.config.babel.js`: ESM `import`와 CommonJS `module.exports`가 혼용되어 있습니다. `"type": "module"` 프로젝트이므로 ESM export로 정리하거나 config 파일을 `.cjs`로 바꾸는 편이 안전합니다.
- `src/webpack.config.babel.js`: `mode`가 없어 빌드 시 Webpack warning이 납니다. `mode: "production"`을 명시하면 됩니다.

## JSON 데이터

- `decks/en/default.json`, `decks/en/waites.json` 모두 JSON 파싱은 성공했고 각각 156개 카드입니다.
- `replacement character`는 0개라 파일 자체가 깨진 것은 아닌 것으로 보입니다. PowerShell 출력에서 보였던 문자 깨짐은 콘솔 인코딩 표시 문제일 가능성이 큽니다.
- 카드 스키마가 코드로 검증되지 않습니다. 최소 필드 정책을 정하고 테스트로 고정하는 게 좋습니다.

## 우선순위

1. `node.js` dependency 제거
2. `initializeDeck()`의 `null` 검증 추가
3. `drawCards(count)` 정수/범위 검증 추가
4. deck JSON 누락 필드 보완
5. Webpack config 모듈 방식과 `mode` 정리
6. JSON deck 스키마 테스트 추가
