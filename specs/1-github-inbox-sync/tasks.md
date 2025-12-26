# Implementation Tasks: GitHub Inbox Sync

**Feature**: 1-github-inbox-sync
**Generated**: 2025-12-26
**Total Tasks**: 32
**Status**: Ready for Implementation

---

## User Stories Summary

| ID | Story | Priority | Tasks |
|----|-------|----------|-------|
| US1 | First-time Setup | P0 | 8 |
| US2 | Automatic Sync on Startup | P0 | 5 |
| US3 | Manual Sync via Command | P1 | 4 |
| US4 | Periodic Auto-Sync | P1 | 3 |
| US5 | Handling Duplicate Files | P1 | 3 |
| US6 | Post-Sync File Handling | P2 | 4 |

---

## Phase 1: Setup

프로젝트 구조 및 기본 파일 생성

- [x] T001 Create TypeScript types file at src/types.ts with all interfaces from data-model.md
- [x] T002 [P] Create constants file at src/constants.ts with DEFAULT_SETTINGS and CONFIG values
- [x] T003 [P] Create validation utilities at src/utils/validation.ts with repository, token, path validators
- [x] T004 [P] Create exponential backoff utility at src/utils/backoff.ts for retry logic

**완료 기준**: 모든 타입, 상수, 유틸리티 파일이 생성됨

---

## Phase 2: Foundational

모든 User Story에서 공통으로 사용하는 기반 서비스

- [x] T005 Create GitHubService class at src/services/github-service.ts with constructor and headers
- [x] T006 Implement listFiles method in src/services/github-service.ts using requestUrl
- [x] T007 Implement downloadContent method in src/services/github-service.ts
- [x] T008 [P] Create StateService class at src/services/state-service.ts with load/save methods
- [x] T009 [P] Implement isAlreadySynced and recordSync methods in src/services/state-service.ts

**완료 기준**: GitHub API 연동 및 상태 관리 기본 기능 동작

---

## Phase 3: User Story 1 - First-time Setup

> **Story**: 사용자가 플러그인 설치 후 GitHub 연결 설정을 완료할 수 있다

**독립 테스트 기준**:
- 설정 화면에서 토큰, 저장소, 경로 입력 가능
- 토큰이 마스킹되어 표시됨
- Test Connection 버튼으로 연결 확인
- 설정이 저장되고 재시작 후에도 유지됨

### Tasks

- [x] T010 [US1] Refactor settings loading in src/main.ts to use types from src/types.ts
- [x] T011 [US1] Move SettingsTab to src/ui/settings-tab.ts as separate module
- [x] T012 [US1] Add password masking for token input in src/ui/settings-tab.ts using inputEl.type
- [x] T013 [US1] Add repository format validation in src/ui/settings-tab.ts with error display
- [x] T014 [US1] Implement validateToken method in src/services/github-service.ts
- [x] T015 [US1] Implement validateRepository method in src/services/github-service.ts
- [x] T016 [US1] Implement testConnection method in src/services/github-service.ts combining validations
- [x] T017 [US1] Add Test Connection button with loading state in src/ui/settings-tab.ts

**완료 기준**: 설정 화면 완성, 연결 테스트 동작

---

## Phase 4: User Story 2 - Automatic Sync on Startup

> **Story**: Obsidian 시작 시 자동으로 GitHub에서 새 노트를 동기화한다

**독립 테스트 기준**:
- Obsidian 시작 시 syncOnStartup이 true면 동기화 실행
- 새 마크다운 파일이 vault의 target 폴더에 생성됨
- 이미 동기화된 파일(SHA 일치)은 스킵됨
- 동기화 결과 알림 표시

### Tasks

- [x] T018 [US2] Create FileService class at src/services/file-service.ts with ensureFolder method
- [x] T019 [US2] Implement createFile method in src/services/file-service.ts using vault.create
- [x] T020 [US2] Create SyncService class at src/services/sync-service.ts orchestrating all services
- [x] T021 [US2] Implement sync method in src/services/sync-service.ts with SHA checking
- [x] T022 [US2] Add startup sync trigger in src/main.ts onload method when syncOnStartup is true

**완료 기준**: 시작 시 자동 동기화 동작, 중복 방지

---

## Phase 5: User Story 3 - Manual Sync via Command

> **Story**: 사용자가 Command Palette 또는 Ribbon 아이콘으로 수동 동기화를 실행할 수 있다

**독립 테스트 기준**:
- Command Palette에 "GitHub Inbox Sync: Sync now" 명령 표시
- Ribbon 아이콘 클릭 시 동기화 실행
- 동기화 중 중복 요청 방지
- 동기화 중 로딩 아이콘 표시

### Tasks

- [x] T023 [US3] Implement isSyncing guard in src/services/sync-service.ts to prevent concurrent sync
- [x] T024 [US3] Update ribbon icon in src/main.ts to call sync method with loading state
- [x] T025 [US3] Register sync-now command in src/main.ts with proper callback
- [x] T026 [US3] Add loading animation CSS in styles.css for ribbon icon

**완료 기준**: 수동 동기화 트리거 동작, 동시 실행 방지

---

## Phase 6: User Story 4 - Periodic Auto-Sync

> **Story**: 설정된 간격으로 자동으로 동기화가 실행된다

**독립 테스트 기준**:
- autoSync 활성화 시 설정된 간격으로 동기화
- 간격 변경 시 즉시 적용
- autoSync 비활성화 시 타이머 중지

### Tasks

- [x] T027 [US4] Implement startAutoSync method in src/main.ts using registerInterval
- [x] T028 [US4] Implement stopAutoSync method in src/main.ts clearing interval
- [x] T029 [US4] Update settings-tab.ts to restart auto-sync when interval changes

**완료 기준**: 주기적 자동 동기화 동작

---

## Phase 7: User Story 5 - Handling Duplicate Files

> **Story**: 동일 파일명이 vault에 존재할 때 설정에 따라 처리한다

**독립 테스트 기준**:
- skip: 기존 파일 유지, 새 파일 무시
- overwrite: 기존 파일 덮어쓰기
- rename: 타임스탬프 추가하여 새 파일 생성

### Tasks

- [x] T030 [US5] Implement fileExists method in src/services/file-service.ts
- [x] T031 [US5] Implement handleDuplicate method in src/services/file-service.ts with skip/overwrite/rename
- [x] T032 [US5] Update sync method in src/services/sync-service.ts to use handleDuplicate

**완료 기준**: 중복 파일 처리 옵션 동작

---

## Phase 8: User Story 6 - Post-Sync File Handling

> **Story**: 동기화 후 GitHub의 원본 파일을 삭제하거나 이동할 수 있다

**독립 테스트 기준**:
- moveToProcessed: processed/ 폴더로 이동
- deleteAfterSync: GitHub에서 파일 삭제
- 후처리 실패해도 로컬 파일은 유지됨

### Tasks

- [x] T033 [US6] Implement deleteFile method in src/services/github-service.ts
- [x] T034 [US6] Implement moveToProcessed method in src/services/github-service.ts
- [x] T035 [US6] Update sync method in src/services/sync-service.ts to call post-processing
- [x] T036 [US6] Add error handling for post-processing failures in src/services/sync-service.ts

**완료 기준**: 동기화 후 GitHub 파일 처리 동작

---

## Phase 9: Polish & Cross-Cutting

최종 안정화 및 배포 준비

- [x] T037 Implement cleanup method in src/services/state-service.ts for 90-day retention
- [x] T038 Call cleanup after each sync completion in src/services/sync-service.ts
- [x] T039 Add sync result notification with file count in src/services/sync-service.ts
- [x] T040 Update README.md with installation and usage instructions

**완료 기준**: 배포 준비 완료

---

## Dependencies Graph

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ─────────────────────────────────┐
    │                                                    │
    ├──► Phase 3 (US1: First-time Setup)                │
    │        │                                           │
    │        ▼                                           │
    ├──► Phase 4 (US2: Automatic Sync on Startup)       │
    │        │                                           │
    │        ▼                                           │
    ├──► Phase 5 (US3: Manual Sync via Command)         │
    │        │                                           │
    │        ├──► Phase 6 (US4: Periodic Auto-Sync)     │
    │        │                                           │
    │        └──► Phase 7 (US5: Handling Duplicates)    │
    │                                                    │
    └────────────────────────────────────────────────────┤
                                                         │
                Phase 8 (US6: Post-Sync File Handling) ◄─┘
                        │
                        ▼
                Phase 9 (Polish)
```

---

## Parallel Execution Opportunities

### Phase 1 내 병렬 가능
```
T001 (types.ts)
    ├── T002 (constants.ts) [P]
    ├── T003 (validation.ts) [P]
    └── T004 (backoff.ts) [P]
```

### Phase 2 내 병렬 가능
```
T005 → T006 → T007 (GitHubService - 순차)
T008 → T009 (StateService - 순차)

위 두 그룹은 병렬 실행 가능
```

### Phase 3 내 병렬 가능
```
T010 → T011 → T012, T013 [P]
T014, T015 [P] → T016 → T017
```

---

## MVP Scope

**권장 MVP**: Phase 1-5 (User Story 1-3)

최소 기능 제품으로 다음을 포함:
- 설정 화면 및 연결 테스트
- 시작 시 자동 동기화
- 수동 동기화 명령

Phase 6-9는 점진적으로 추가 가능

---

## Implementation Strategy

1. **Phase 1-2 완료** (Foundation)
   - 모든 타입, 상수, 유틸리티 준비
   - GitHub API 기본 연동

2. **Phase 3 완료** (US1)
   - 설정 화면 완성
   - 연결 테스트 동작 확인

3. **Phase 4-5 완료** (US2, US3)
   - 핵심 동기화 로직 완성
   - MVP 릴리스 가능

4. **Phase 6-9 완료** (US4-6, Polish)
   - 자동화 및 고급 기능
   - 배포 준비

---

## Validation Checklist

- [x] 모든 태스크에 Task ID 포함 (T001-T040)
- [x] 모든 태스크에 파일 경로 포함
- [x] User Story 태스크에 [US#] 라벨 포함
- [x] 병렬 가능 태스크에 [P] 마커 포함
- [x] 각 Phase에 완료 기준 명시
- [x] 각 User Story에 독립 테스트 기준 명시
