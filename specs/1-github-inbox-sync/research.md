# Research: GitHub Inbox Sync

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26

---

## 1. GitHub REST API Integration

### Decision
GitHub REST API Contents 엔드포인트를 사용하여 파일 목록 조회, 다운로드, 삭제/이동 작업 수행

### Rationale
- Contents API는 1MB 이하 파일에 최적화됨 (마크다운 노트에 적합)
- 단일 엔드포인트로 CRUD 모든 작업 가능
- 인증된 요청은 시간당 5,000회 제한 (플러그인 용도로 충분)

### API 엔드포인트

| 작업 | 메서드 | 엔드포인트 |
|------|--------|-----------|
| 파일 목록 | GET | `/repos/{owner}/{repo}/contents/{path}` |
| 파일 내용 | GET | `/repos/{owner}/{repo}/contents/{path}` (Accept: raw) |
| 파일 삭제 | DELETE | `/repos/{owner}/{repo}/contents/{path}` |
| 파일 생성 | PUT | `/repos/{owner}/{repo}/contents/{path}` |

### Alternatives Considered
- **Git Trees API**: 1,000개 이상 파일 시 필요하지만, inbox 폴더는 소규모 예상
- **Raw URL 직접 다운로드**: 더 빠르지만 인증 헤더 처리가 복잡

---

## 2. Rate Limiting 전략

### Decision
Response 헤더 모니터링 + Exponential Backoff 구현

### Rationale
```typescript
interface BackoffConfig {
  initialDelayMs: 1000;    // 1초 시작
  maxDelayMs: 60000;       // 최대 60초
  maxRetries: 5;           // 5회 재시도
  multiplier: 2;           // 2배씩 증가
}
```

### 모니터링 헤더
- `x-ratelimit-remaining`: 남은 요청 수
- `x-ratelimit-reset`: 리셋 시각 (Unix timestamp)
- `retry-after`: 대기 시간 (초)

### Alternatives Considered
- **고정 대기 시간**: 단순하지만 비효율적
- **Circuit Breaker**: 지속적 실패 시 유용하나 MVP에서는 과도

---

## 3. Fine-grained PAT 권한

### Decision
Fine-grained Personal Access Token 사용, `contents:write` 권한만 요청

### Rationale
- 특정 저장소만 접근 가능 (최소 권한 원칙)
- 만료일 설정 가능 (보안 강화)
- Classic PAT 대비 세밀한 권한 제어

### 필요 권한

| 권한 | 수준 | 용도 |
|------|------|------|
| Contents | Read and Write | 파일 조회, 생성, 삭제 |

---

## 4. Obsidian Plugin 패턴

### Settings Password Masking
```typescript
text.inputEl.type = 'password';
```

### Interval Registration
```typescript
this.registerInterval(
  window.setInterval(() => this.performSync(), intervalMs)
);
```

### File Creation
```typescript
await this.app.vault.create(path, content);
await this.app.vault.createFolder(folderPath);
```

### Loading State
```typescript
setIcon(this.ribbonIconEl, 'loader');
this.ribbonIconEl.addClass('is-loading');
```

---

## 5. 에러 처리 매핑

### Decision
HTTP 상태 코드별 사용자 친화적 메시지 표시

| 상태 코드 | 원인 | 사용자 메시지 |
|-----------|------|--------------|
| 401 | 토큰 무효 | "GitHub 토큰이 유효하지 않습니다. 설정을 확인해주세요." |
| 403 | Rate Limit 또는 권한 부족 | "요청 한도 초과 또는 권한이 없습니다." |
| 404 | 저장소/경로 없음 | "저장소 또는 폴더를 찾을 수 없습니다." |
| 409 | SHA 불일치 | "파일이 변경되었습니다. 다시 시도해주세요." |
| 429 | Rate Limited | "요청이 너무 많습니다. 잠시 후 다시 시도합니다." |

---

## 6. SHA 기반 중복 방지

### Decision
파일의 Git SHA를 키로 사용하여 동기화 이력 관리

### Rationale
- SHA는 파일 내용의 고유 해시값
- 동일 SHA = 이미 동기화된 파일 → 스킵
- 로컬 삭제 후에도 SHA 기록 유지 → 재다운로드 방지

### 구현 방식
```typescript
interface SyncState {
  syncedFiles: {
    [sha: string]: {
      filename: string;
      syncedAt: string;
      localPath: string;
    }
  }
}
```

### Cleanup 정책
- 90일 이상 된 기록 자동 삭제
- 또는 최대 1,000개 유지
