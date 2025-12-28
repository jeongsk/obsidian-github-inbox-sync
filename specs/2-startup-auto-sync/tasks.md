# Tasks: Startup Auto Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28
**Status**: Completed

---

## 개요

이 문서는 시작 동기화 개선 기능의 구현 태스크를 정의합니다.

**사용자 스토리 매핑**:
- **US1**: 시작 시 자동 동기화 (Scenario 1) - 핵심 기능
- **US2**: 시작 동기화 비활성화 (Scenario 2) - 기존 기능 유지
- **US3**: 지연 시간 설정 (Scenario 3) - 사용자 제어
- **US4**: 수동 동기화 충돌 처리 (Edge Case) - 안정성

---

## Phase 1: Setup (프로젝트 설정)

**목표**: 타입 및 상수 정의

- [x] T001 `startupSyncDelay: number` 필드를 `GitHubInboxSyncSettings` 인터페이스에 추가 in `src/types.ts`
- [x] T002 [P] `DEFAULT_SETTINGS`에 `startupSyncDelay: 3` 기본값 추가 in `src/constants.ts`
- [x] T003 [P] `CONFIG`에 시작 동기화 관련 상수 추가 in `src/constants.ts`
  - `MIN_STARTUP_SYNC_DELAY_SECONDS: 1`
  - `MAX_STARTUP_SYNC_DELAY_SECONDS: 30`
  - `DEFAULT_STARTUP_SYNC_DELAY_SECONDS: 3`
  - `LAYOUT_READY_FALLBACK_TIMEOUT_MS: 30000`
- [x] T004 [P] `isValidStartupSyncDelay(value: number): boolean` 검증 함수 추가 in `src/utils/validation.ts`

**완료 기준**: `npm run build` 성공, 타입 체크 통과

---

## Phase 2: Foundational (기반 작업)

**목표**: 기존 시작 동기화 코드 제거 및 상태 변수 준비

- [x] T005 시작 동기화 상태 변수 추가 in `src/main.ts`
  - `startupSyncTimeoutId: number | null = null`
  - `startupSyncFallbackId: number | null = null`
  - `startupSyncExecuted: boolean = false`
- [x] T006 기존 `setTimeout(() => this.performSync('startup'), 2000)` 코드 제거 in `src/main.ts`

**완료 기준**: 기존 시작 동기화 비활성화, 빌드 성공

---

## Phase 3: User Story 1 - 시작 시 자동 동기화

**스토리 목표**: Obsidian 레이아웃 준비 후 설정된 지연 시간 뒤에 자동 동기화 실행

**독립 테스트 기준**:
- Obsidian 시작 시 레이아웃 준비 후 동기화 실행됨
- 설정된 지연 시간이 적용됨
- GitHub 토큰 미설정 시 건너뛰기

### 구현 태스크

- [x] T007 [US1] `initStartupSync()` 메서드 구현 in `src/main.ts`
  - syncOnStartup 설정 확인
  - GitHub 토큰/저장소 설정 확인
  - 폴백 타이머 설정 (30초)
  - workspace.onLayoutReady 콜백 등록
- [x] T008 [US1] `scheduleStartupSync()` 메서드 구현 in `src/main.ts`
  - 이미 실행/예약된 경우 무시
  - 설정된 지연 시간(초)을 밀리초로 변환
  - window.setTimeout으로 타이머 설정
  - 타이머 ID 저장
- [x] T009 [US1] `onload()`에서 `initStartupSync()` 호출 추가 in `src/main.ts`
- [x] T010 [US1] `onunload()`에서 타이머 정리 로직 추가 in `src/main.ts`

**완료 기준**: Obsidian 시작 시 레이아웃 준비 + 지연 시간 후 동기화 실행

---

## Phase 4: User Story 2 - 시작 동기화 비활성화

**스토리 목표**: 사용자가 시작 동기화를 비활성화하면 동기화가 실행되지 않음

**독립 테스트 기준**:
- syncOnStartup: false 설정 시 시작 동기화 미실행
- 주기적 자동 동기화(autoSync)는 독립적으로 동작

### 구현 태스크

- [x] T011 [US2] `initStartupSync()`에서 syncOnStartup 비활성화 처리 확인 in `src/main.ts`
- [x] T012 [US2] 설정 UI에서 syncOnStartup 토글 시 지연 시간 설정 표시/숨김 처리 in `src/ui/settings-tab.ts`

**완료 기준**: syncOnStartup 비활성화 시 시작 동기화 미실행

---

## Phase 5: User Story 3 - 지연 시간 설정

**스토리 목표**: 사용자가 시작 동기화 지연 시간을 1-30초 범위에서 설정 가능

**독립 테스트 기준**:
- 설정 UI에서 슬라이더로 지연 시간 조정 가능
- 설정 변경이 저장됨
- 다음 시작부터 새 지연 시간 적용

### 구현 태스크

- [x] T013 [US3] 시작 동기화 지연 시간 슬라이더 UI 추가 in `src/ui/settings-tab.ts`
  - SliderComponent 사용
  - 범위: 1-30초
  - 동적 툴팁 표시
- [x] T014 [US3] 지연 시간 설정 변경 시 저장 로직 구현 in `src/ui/settings-tab.ts`
- [x] T015 [US3] syncOnStartup 활성화 시에만 지연 시간 설정 표시 (조건부 렌더링) in `src/ui/settings-tab.ts`

**완료 기준**: 설정 UI에서 지연 시간 변경 및 저장 가능

---

## Phase 6: User Story 4 - 수동 동기화 충돌 처리

**스토리 목표**: 지연 시간 중 수동 동기화 요청 시 시작 동기화 취소

**독립 테스트 기준**:
- 지연 대기 중 수동 동기화 실행 시 시작 동기화 취소됨
- 수동 동기화는 정상 실행됨
- 중복 동기화 방지됨

### 구현 태스크

- [x] T016 [US4] `cancelStartupSync()` 메서드 구현 in `src/main.ts`
  - 지연 타이머 취소
  - 폴백 타이머 취소
  - 상태 초기화
- [x] T017 [US4] `performSync('manual')` 호출 시 `cancelStartupSync()` 호출 추가 in `src/main.ts`
- [x] T018 [US4] `startupSyncExecuted` 플래그로 중복 실행 방지 in `src/main.ts`

**완료 기준**: 수동 동기화 시 시작 동기화 취소, 중복 방지

---

## Phase 7: Polish (안정화)

**목표**: 최종 검증 및 안정화

- [x] T019 폴백 타임아웃(30초) 동작 확인 - layout-ready 미발생 시나리오 테스트
- [x] T020 빌드 및 타입 체크 최종 확인 (`npm run build`)
- [ ] T021 Obsidian에서 기능 통합 테스트
  - 시작 동기화 활성화/비활성화
  - 지연 시간 설정 변경
  - 수동 동기화 충돌 처리

**완료 기준**: 모든 시나리오 동작 확인

---

## 의존성 그래프

```
Phase 1 (Setup)
    │
    ├── T001 (types.ts)
    │       │
    │       └──► T002, T003, T004 [P]
    │
    ▼
Phase 2 (Foundational)
    │
    ├── T005 (상태 변수)
    │       │
    │       └──► T006 (기존 코드 제거)
    │
    ▼
Phase 3 (US1: 시작 자동 동기화) ◄─── 핵심 MVP
    │
    ├── T007, T008, T009, T010
    │
    ▼
Phase 4 (US2: 비활성화)
    │
    ├── T011, T012
    │
    ▼
Phase 5 (US3: 지연 시간 설정)
    │
    ├── T013, T014, T015
    │
    ▼
Phase 6 (US4: 충돌 처리)
    │
    ├── T016, T017, T018
    │
    ▼
Phase 7 (Polish)
    │
    └── T019, T020, T021
```

---

## 병렬 실행 가능 태스크

### Phase 1 내 병렬 실행
- T002, T003, T004는 T001 완료 후 병렬 실행 가능

### 파일별 병렬 작업
- `src/constants.ts` 작업 (T002, T003)
- `src/utils/validation.ts` 작업 (T004)

---

## 구현 전략

### MVP 범위 (최소 기능 제품)
- **Phase 1-3 완료**: 기본 시작 동기화 기능 동작
- 이후 Phase 4-6은 점진적 개선

### 권장 구현 순서
1. Phase 1: 타입/상수 정의 (기반)
2. Phase 2: 기존 코드 정리
3. Phase 3: 핵심 시작 동기화 로직 (MVP)
4. Phase 5: 설정 UI (사용자 제어)
5. Phase 4, 6: 엣지 케이스 처리
6. Phase 7: 최종 검증

---

## 태스크 요약

| Phase | 설명 | 태스크 수 | 스토리 |
|-------|------|-----------|--------|
| 1 | Setup | 4 | - |
| 2 | Foundational | 2 | - |
| 3 | US1: 시작 자동 동기화 | 4 | US1 |
| 4 | US2: 비활성화 | 2 | US2 |
| 5 | US3: 지연 시간 설정 | 3 | US3 |
| 6 | US4: 충돌 처리 | 3 | US4 |
| 7 | Polish | 3 | - |
| **총계** | | **21** | |

---

## 참고 문서

- [spec.md](./spec.md) - 기능 명세서
- [plan.md](./plan.md) - 구현 계획
- [data-model.md](./data-model.md) - 데이터 모델
- [contracts/startup-sync-api.md](./contracts/startup-sync-api.md) - API 계약
- [quickstart.md](./quickstart.md) - 개발 가이드
