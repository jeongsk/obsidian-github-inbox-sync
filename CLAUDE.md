# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

GitHub 저장소를 중간 저장소로 활용하여 n8n 워크플로우에서 생성된 마크다운 노트를 Obsidian vault로 자동 동기화하는 Obsidian 플러그인입니다.

**핵심 흐름:**
```
n8n → GitHub (inbox/) → Obsidian Plugin → Vault → iCloud
```

## 명령어

```bash
# 개발 모드 (watch 모드)
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크 + 빌드
npm run build  # tsc -noEmit -skipLibCheck && node esbuild.config.mjs production

# 린트
npm run lint

# 버전 업데이트 (manifest.json, versions.json 자동 업데이트)
npm run version
```

## 아키텍처

### 서비스 계층 구조

```
GitHubInboxSyncPlugin (main.ts)
├── GitHubService    - GitHub API 통신 (파일 목록, 다운로드, 삭제/이동)
├── FileService      - Vault 파일 작업 (생성, 중복 처리)
├── StateService     - 동기화 상태 관리 (SHA 기반 중복 방지)
└── SyncService      - 동기화 로직 조율 (위 3개 서비스 조합)
```

### 주요 데이터 흐름

1. **동기화 시작**: `performSync()` → `SyncService.sync()`
2. **파일 목록 조회**: `GitHubService.listFiles()` - 소스 폴더의 .md 파일 조회
3. **중복 확인**: `StateService.isAlreadySynced(sha)` - SHA 기반으로 이미 동기화된 파일 스킵
4. **파일 다운로드**: `GitHubService.downloadContent()`
5. **로컬 저장**: `FileService.handleDuplicate()` - 중복 처리 전략(skip/overwrite/rename) 적용
6. **동기화 기록**: `StateService.recordSync()` - SHA 저장으로 재다운로드 방지
7. **후처리**: GitHub에서 파일 삭제 또는 processed/ 폴더로 이동

### 핵심 타입

- `GitHubInboxSyncSettings`: 플러그인 설정 (토큰, 저장소, 동기화 옵션)
- `SyncState`: 동기화 상태 (syncedFiles에 SHA 기록)
- `GitHubFile`: GitHub 파일 정보
- `SyncResult`: 동기화 결과

### 상태 관리

동기화 상태는 Obsidian의 `data.json`에 저장됩니다:
- `settings`: 플러그인 설정
- `syncState`: 동기화 상태 (syncedFiles, syncHistory)

SHA 기반 추적으로 사용자가 로컬에서 노트를 삭제해도 다음 동기화 시 다시 생성되지 않습니다.

## 빌드 출력

- `main.js`: 번들된 플러그인 코드
- `manifest.json`: Obsidian 플러그인 매니페스트
- `styles.css`: 스타일시트

## 테스트

현재 테스트 프레임워크가 설정되어 있지 않습니다. Obsidian 환경에서 수동 테스트가 필요합니다.

## GitHub Actions

- **Release 워크플로우** (`.github/workflows/release.yml`): workflow_dispatch로 버전 bump 후 자동 릴리스 생성
