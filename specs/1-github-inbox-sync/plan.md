# Implementation Plan: GitHub Inbox Sync

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26
**Status**: Ready for Implementation

---

## Technical Context

| Category | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Obsidian 플러그인 표준 |
| Build Tool | esbuild | 빠른 빌드, 이미 설정됨 |
| Package Manager | npm | package-lock.json 존재 |
| API Client | Obsidian requestUrl | CORS 우회, 플러그인 표준 |
| State Storage | Obsidian loadData/saveData | 플러그인 데이터 관리 표준 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      main.ts (Plugin)                        │
│  - onload/onunload lifecycle                                │
│  - Command registration                                      │
│  - Ribbon icon management                                    │
│  - Settings tab registration                                 │
│  - Auto-sync timer management                                │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ SyncService  │ │GitHubService │ │ FileService  │ │ StateService │
│              │ │              │ │              │ │              │
│ - sync()     │ │ - listFiles  │ │ - createFile │ │ - isAlready  │
│ - isSyncing  │ │ - download   │ │ - handleDup  │ │   Synced     │
│ - cancel     │ │ - delete     │ │ - ensureDir  │ │ - recordSync │
└──────────────┘ │ - move       │ └──────────────┘ │ - cleanup    │
                 │ - testConn   │                   │ - reset      │
                 └──────────────┘                   └──────────────┘
```

---

## File Structure

```
src/
├── main.ts                    # 플러그인 진입점
├── types.ts                   # 타입 정의
├── constants.ts               # 설정 상수
├── services/
│   ├── github-service.ts      # GitHub API
│   ├── sync-service.ts        # 동기화 로직
│   ├── file-service.ts        # Vault 파일 작업
│   └── state-service.ts       # 상태 관리
├── ui/
│   └── settings-tab.ts        # 설정 UI
└── utils/
    ├── backoff.ts             # Retry 로직
    └── validation.ts          # 입력 검증
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**목표**: 기본 구조 및 설정 관리

| Task | File | Description |
|------|------|-------------|
| 1.1 | types.ts | 모든 인터페이스/타입 정의 |
| 1.2 | constants.ts | 설정 상수 및 기본값 |
| 1.3 | main.ts | Settings 로드/저장 개선 |
| 1.4 | settings-tab.ts | 토큰 마스킹, 입력 검증 |

**완료 기준**: 설정이 저장/로드되고 토큰이 마스킹됨

### Phase 2: GitHub Integration

**목표**: GitHub API 연동

| Task | File | Description |
|------|------|-------------|
| 2.1 | github-service.ts | API 클라이언트 구현 |
| 2.2 | backoff.ts | Rate limit 및 재시도 로직 |
| 2.3 | settings-tab.ts | Test Connection 버튼 |

**완료 기준**: 파일 목록 조회 및 다운로드 동작

### Phase 3: Sync Engine

**목표**: 동기화 핵심 로직

| Task | File | Description |
|------|------|-------------|
| 3.1 | state-service.ts | SHA 추적, 이력 관리 |
| 3.2 | file-service.ts | Vault 파일 생성/중복 처리 |
| 3.3 | sync-service.ts | 동기화 오케스트레이션 |

**완료 기준**: 새 파일 동기화, 중복 스킵

### Phase 4: Automation & UX

**목표**: 자동화 및 사용자 경험

| Task | File | Description |
|------|------|-------------|
| 4.1 | main.ts | 시작 시 동기화, 주기적 동기화 |
| 4.2 | main.ts | Ribbon 아이콘 상태 표시 |
| 4.3 | main.ts | Command 등록 |
| 4.4 | sync-service.ts | 알림 통합 |

**완료 기준**: 자동 동기화, 수동 트리거 동작

### Phase 5: Post-Processing

**목표**: GitHub 파일 후처리

| Task | File | Description |
|------|------|-------------|
| 5.1 | github-service.ts | 파일 삭제 |
| 5.2 | github-service.ts | 파일 이동 (processed/) |
| 5.3 | sync-service.ts | 후처리 통합 |

**완료 기준**: 동기화 후 GitHub 파일 처리

### Phase 6: Polish & Release

**목표**: 안정화 및 배포 준비

| Task | File | Description |
|------|------|-------------|
| 6.1 | state-service.ts | 이력 정리 (90일) |
| 6.2 | styles.css | 로딩 애니메이션 |
| 6.3 | - | README 작성 |
| 6.4 | - | 버전 업데이트 |

**완료 기준**: 배포 준비 완료

---

## Dependencies Between Phases

```
Phase 1 ────► Phase 2 ────► Phase 3 ────► Phase 4
                │                           │
                └───────────────────────────┼────► Phase 5
                                            │
                                            └────► Phase 6
```

- Phase 2는 Phase 1의 타입 정의 필요
- Phase 3은 Phase 2의 GitHub 서비스 필요
- Phase 4는 Phase 3의 동기화 서비스 필요
- Phase 5는 Phase 2, 4와 병렬 가능
- Phase 6은 모든 기능 완료 후 진행

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Rate Limit | Exponential backoff 구현, 헤더 모니터링 |
| 대용량 파일 | 1MB 이상 경고, 스킵 옵션 고려 |
| 네트워크 불안정 | 재시도 로직, 부분 실패 허용 |
| 토큰 만료 | 명확한 에러 메시지 |

---

## Generated Artifacts

| File | Description |
|------|-------------|
| [spec.md](./spec.md) | 기능 명세서 |
| [research.md](./research.md) | 기술 조사 결과 |
| [data-model.md](./data-model.md) | 데이터 모델 정의 |
| [contracts/github-api.md](./contracts/github-api.md) | GitHub API 계약 |
| [contracts/plugin-api.md](./contracts/plugin-api.md) | 플러그인 내부 API |
| [quickstart.md](./quickstart.md) | 개발 가이드 |

---

## Next Steps

1. **`/speckit.tasks`** 실행하여 세부 태스크 생성
2. Phase 1부터 순차 구현
3. 각 Phase 완료 시 통합 테스트

---

## References

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [GitHub REST API - Contents](https://docs.github.com/en/rest/repos/contents)
- [PRD](../../PRD.md)
