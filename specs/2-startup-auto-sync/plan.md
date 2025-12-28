# Implementation Plan: Startup Auto Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28
**Status**: Ready for Implementation

---

## Technical Context

| Category | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | 기존 프로젝트 표준 |
| Build Tool | esbuild | 기존 설정 유지 |
| Layout Ready API | workspace.onLayoutReady | Obsidian 공식 API |
| Timer API | window.setTimeout/clearTimeout | 기존 패턴과 일관성 |
| UI Component | SliderComponent | 범위 입력에 최적 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      main.ts (Plugin)                            │
│  - initStartupSync()      새로운 시작 동기화 초기화              │
│  - scheduleStartupSync()  지연 후 동기화 예약                    │
│  - cancelStartupSync()    예약된 동기화 취소                     │
└─────────────────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│ Obsidian API     │        │ Existing Services│
│                  │        │                  │
│ - workspace      │        │ - SyncService    │
│   .onLayoutReady │        │ - performSync()  │
│ - layoutReady    │        │                  │
└──────────────────┘        └──────────────────┘
```

---

## File Changes

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| src/types.ts | 수정 | `startupSyncDelay` 필드 추가 |
| src/constants.ts | 수정 | 상수 및 기본값 추가 |
| src/utils/validation.ts | 수정 | 검증 함수 추가 |
| src/main.ts | 수정 | 시작 동기화 로직 개선 |
| src/ui/settings-tab.ts | 수정 | 지연 시간 설정 UI 추가 |

---

## Implementation Phases

### Phase 1: Foundation (타입 및 상수)

**목표**: 새 설정 필드 및 상수 추가

| Task | File | Description |
|------|------|-------------|
| 1.1 | types.ts | `startupSyncDelay: number` 필드 추가 |
| 1.2 | constants.ts | DEFAULT_SETTINGS에 기본값 추가 |
| 1.3 | constants.ts | CONFIG에 상수 추가 |
| 1.4 | validation.ts | `isValidStartupSyncDelay` 함수 추가 |

**완료 기준**: 타입 체크 통과, 기본값 적용 확인

---

### Phase 2: Core Logic (시작 동기화 로직)

**목표**: 시작 동기화 메커니즘 구현

| Task | File | Description |
|------|------|-------------|
| 2.1 | main.ts | 시작 동기화 상태 변수 추가 |
| 2.2 | main.ts | `initStartupSync()` 메서드 구현 |
| 2.3 | main.ts | `scheduleStartupSync()` 메서드 구현 |
| 2.4 | main.ts | `cancelStartupSync()` 메서드 구현 |
| 2.5 | main.ts | `onload()`에서 기존 setTimeout 대체 |
| 2.6 | main.ts | `onunload()`에서 타이머 정리 추가 |
| 2.7 | main.ts | `performSync()`에서 수동 동기화 시 취소 처리 |

**완료 기준**: 레이아웃 준비 후 지연 동기화 동작

---

### Phase 3: Settings UI (설정 화면)

**목표**: 사용자가 지연 시간을 설정할 수 있는 UI 추가

| Task | File | Description |
|------|------|-------------|
| 3.1 | settings-tab.ts | 지연 시간 슬라이더 추가 |
| 3.2 | settings-tab.ts | syncOnStartup 변경 시 UI 새로고침 |
| 3.3 | settings-tab.ts | 조건부 렌더링 (syncOnStartup 활성화 시만 표시) |

**완료 기준**: 설정 UI에서 지연 시간 변경 가능

---

### Phase 4: Testing & Polish

**목표**: 테스트 및 안정화

| Task | Description |
|------|-------------|
| 4.1 | 시작 동기화 기능 테스트 |
| 4.2 | 지연 시간 설정 테스트 |
| 4.3 | 수동 동기화 충돌 테스트 |
| 4.4 | 폴백 타임아웃 테스트 |
| 4.5 | 성능 영향 측정 |

**완료 기준**: 모든 테스트 통과

---

## Dependencies Between Phases

```
Phase 1 ────► Phase 2 ────► Phase 3 ────► Phase 4
(타입)        (로직)        (UI)          (테스트)
```

- Phase 2는 Phase 1의 타입 정의 필요
- Phase 3은 Phase 1의 상수 필요
- Phase 4는 모든 구현 완료 후 진행

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| layout-ready 미발생 | 30초 폴백 타이머 구현 |
| 타이머 누수 | onunload에서 모든 타이머 정리 |
| 중복 동기화 | executed 플래그로 방지 |
| 설정 마이그레이션 | Object.assign 패턴으로 자동 처리 |

---

## Generated Artifacts

| File | Description |
|------|-------------|
| [spec.md](./spec.md) | 기능 명세서 |
| [research.md](./research.md) | 기술 조사 결과 |
| [data-model.md](./data-model.md) | 데이터 모델 정의 |
| [contracts/startup-sync-api.md](./contracts/startup-sync-api.md) | 내부 API 계약 |
| [quickstart.md](./quickstart.md) | 개발 가이드 |
| [checklists/requirements.md](./checklists/requirements.md) | 요구사항 체크리스트 |

---

## Next Steps

1. **`/speckit.tasks`** 실행하여 세부 태스크 생성
2. Phase 1부터 순차 구현
3. 각 Phase 완료 시 기능 테스트

---

## References

- [Obsidian API - Workspace.onLayoutReady](https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady)
- [Obsidian Plugin Development - Optimize plugin load time](https://docs.obsidian.md/Plugins/Guides/Optimize+plugin+load+time)
- [spec.md](./spec.md) - 기능 명세서
