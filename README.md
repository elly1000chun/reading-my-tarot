# Reading My Tarot
- 이 프로젝트는 codex를 사용한 개발을 학습하기 위해 기존 프로젝트를 fork하여 구조 분석 및 코드 개선, 코드 추가를 진행했습니다.
   - Fork 대상 프로젝트: [Tarot.js](https://github.com/MarketingPipeline/Tarot.js/) 
- Demo는 아래에서 제공됩니다.
   - https://reading-my-tarot.elly1000chun.workers.dev/
- (2026-06-18) 이제부터 이 앱은 OpenAI API에 기반하여 카드에 대한 해석을 제공합니다.

## Original Features
- **Deck Management**: Easily draw, shuffle, and get details about your Tarot deck.
- **Custom Spreads**: Create and manage unique Tarot spreads tailored to your needs.
- **Readings**: Perform readings using your custom spreads, drawing the specified number of cards for each position.
- **Current Spread Tracking**: View the most recent spread and cards drawn for a convenient reference.
- **Detailed Deck Information**: Retrieve full deck details, including card counts and each card’s metadata.

## Goal
- Codex 활용
   - 프로젝트 구조 분석하여 문서로 저장
   - 테스트 코드 추가
      - 테스트 코드가 없는 프로젝트이므로, 테스트 프레임워크부터 선정해야함
   - 버그 수정, Refactoring 등 코드 수정
   - 위 과정에서 AGENTS.md 파일 생성 및 관리, Skill 또는 템플릿 생성 및 관리 등을 파악
 - 기능 추가
   - 카드 이미지 표시
   - 한국어 지원
   - 상세 카드 해석 표시

## New Features
 - **Display Card Images**: 카드 이미지를 표시 (2026-06-08)
 - **Support Korean**: 한국어 지원 (2026-06-08)
 - **Display Details**: 더 상세한 카드 해석을 제공 (2026-06-08)
 - **LLM Card Reading**: AI에 기반한 카드 해석을 제공 (2026-06-18)

## Other Changes
 - Added test code
 - Refactoring

## Usage
 - In Local
   - run index.html with Integrated Browser in VS Code
