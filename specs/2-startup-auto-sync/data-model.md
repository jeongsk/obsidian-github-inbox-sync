# Data Model: Startup Auto Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28

---

## 엔티티 변경 사항

### GitHubInboxSyncSettings (확장)

기존 설정 인터페이스에 시작 동기화 지연 시간 필드 추가

```typescript
interface GitHubInboxSyncSettings {
  // 기존 필드들 (변경 없음)
  githubToken: string;
  repository: string;
  branch: string;
  sourcePath: string;
  targetPath: string;
  syncOnStartup: boolean;      // 기존 유지
  autoSync: boolean;
  syncInterval: number;
  duplicateHandling: DuplicateHandling;
  deleteAfterSync: boolean;
  moveToProcessed: boolean;
  showNotifications: boolean;

  // 신규 추가
  startupSyncDelay: number;    // 시작 동기화 지연 시간 (초), 기본값: 3
}
```

| 필드 | 타입 | 기본값 | 설명 | 검증 규칙 |
|------|------|--------|------|-----------|
| startupSyncDelay | number | 3 | 레이아웃 준비 후 동기화까지 지연 시간 (초) | 1 ≤ value ≤ 30 |

---

### StartupSyncState (신규 - 런타임 전용)

시작 동기화 상태를 관리하는 런타임 전용 상태. 영속화되지 않음.

```typescript
interface StartupSyncState {
  isScheduled: boolean;           // 시작 동기화가 예약되었는지 여부
  timeoutId: number | null;       // 지연 타이머 ID (취소용)
  fallbackTimeoutId: number | null; // 폴백 타이머 ID
  executed: boolean;              // 시작 동기화가 실행되었는지 여부
}
```

| 필드 | 타입 | 초기값 | 설명 |
|------|------|--------|------|
| isScheduled | boolean | false | 시작 동기화가 예약되었는지 여부 |
| timeoutId | number \| null | null | 지연 타이머 ID (취소용) |
| fallbackTimeoutId | number \| null | null | 폴백 타이머 ID |
| executed | boolean | false | 시작 동기화가 이미 실행되었는지 여부 |

---

## 상수 변경 사항

### DEFAULT_SETTINGS (확장)

```typescript
export const DEFAULT_SETTINGS: GitHubInboxSyncSettings = {
  // 기존 필드들...
  syncOnStartup: true,
  startupSyncDelay: 3,  // 신규 추가
  // ...
};
```

### CONFIG (확장)

```typescript
export const CONFIG = {
  // 기존 필드들...

  // Startup Sync (신규)
  MIN_STARTUP_SYNC_DELAY_SECONDS: 1,
  MAX_STARTUP_SYNC_DELAY_SECONDS: 30,
  DEFAULT_STARTUP_SYNC_DELAY_SECONDS: 3,
  LAYOUT_READY_FALLBACK_TIMEOUT_MS: 30000,  // 30초
} as const;
```

---

## 상태 전이 다이어그램

### 시작 동기화 상태 전이

```
┌─────────────────────────────────────────────────────────────────┐
│                         Plugin Load                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  syncOnStartup?  │
                    └──────────────────┘
                      │             │
                   Yes│             │No
                      ▼             ▼
         ┌────────────────┐   ┌──────────┐
         │ Wait for       │   │   Done   │
         │ Layout Ready   │   └──────────┘
         └────────────────┘
                │
                ├─── onLayoutReady 호출됨 ──┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐      ┌────────────────────┐
    │ Start Delay Timer │      │ Cancel Fallback    │
    │ (1-30초)          │      │ Timer              │
    └───────────────────┘      └────────────────────┘
                │
        ┌───────┴───────┐
        │               │
   Timer 완료      수동 동기화 요청
        │               │
        ▼               ▼
┌───────────────┐ ┌──────────────────┐
│ Execute Sync  │ │ Cancel Startup   │
│ (startup)     │ │ Sync Timer       │
└───────────────┘ └──────────────────┘
        │
        ▼
   ┌──────────┐
   │   Done   │
   └──────────┘
```

---

## 데이터 마이그레이션

### 마이그레이션 불필요

- `startupSyncDelay` 필드는 신규 추가
- Obsidian의 `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` 패턴으로 자동 처리
- 기존 사용자 데이터에 필드가 없으면 기본값 3 적용

---

## 검증 규칙

### startupSyncDelay 검증

```typescript
function isValidStartupSyncDelay(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS &&
    value <= CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS
  );
}
```

---

## 영향 분석

### 수정이 필요한 파일

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| src/types.ts | 수정 | `startupSyncDelay` 필드 추가 |
| src/constants.ts | 수정 | 기본값 및 상수 추가 |
| src/main.ts | 수정 | 시작 동기화 로직 개선 |
| src/ui/settings-tab.ts | 수정 | 지연 시간 설정 UI 추가 |
| src/utils/validation.ts | 수정 | 검증 함수 추가 |

### 기존 기능 영향

- 기존 `syncOnStartup` 설정 동작 유지
- 기존 `autoSync` (주기적 동기화)와 독립적으로 동작
- 기존 수동 동기화 기능 영향 없음
