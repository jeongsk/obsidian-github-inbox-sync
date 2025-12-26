# GitHub API Contract

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26
**API Version**: 2022-11-28

---

## Base Configuration

```typescript
const BASE_URL = 'https://api.github.com';

const DEFAULT_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

function getAuthHeaders(token: string) {
  return {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`,
  };
}
```

---

## Endpoints

### 1. List Directory Contents

폴더 내 파일 목록 조회

**Request**
```
GET /repos/{owner}/{repo}/contents/{path}
```

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| owner | path | ✅ | 저장소 소유자 |
| repo | path | ✅ | 저장소 이름 |
| path | path | ✅ | 폴더 경로 (예: `inbox`) |
| ref | query | ❌ | 브랜치/태그/커밋 (기본: default branch) |

**Response 200 OK**
```typescript
interface GitHubContentItem {
  name: string;           // "note.md"
  path: string;           // "inbox/note.md"
  sha: string;            // "abc123..."
  size: number;           // 1234
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url: string | null;  // raw 다운로드 URL
  html_url: string;       // 웹 UI URL
  git_url: string;        // Git blob URL
  url: string;            // API URL
}

type ListContentsResponse = GitHubContentItem[];
```

**Error Responses**
| Status | Condition |
|--------|-----------|
| 401 | 인증 실패 |
| 403 | 권한 없음 또는 Rate Limit |
| 404 | 저장소/경로 없음 |

---

### 2. Get File Content (Raw)

파일 원본 내용 다운로드

**Request**
```
GET /repos/{owner}/{repo}/contents/{path}
Accept: application/vnd.github.raw+json
```

| Parameter | Location | Required | Description |
|-----------|----------|----------|-------------|
| owner | path | ✅ | 저장소 소유자 |
| repo | path | ✅ | 저장소 이름 |
| path | path | ✅ | 파일 경로 |
| ref | query | ❌ | 브랜치 |

**Response 200 OK**
```
Content-Type: text/plain; charset=utf-8

(파일 원본 내용)
```

**Alternative: Base64 Encoded**
```
GET /repos/{owner}/{repo}/contents/{path}
Accept: application/vnd.github+json
```

```typescript
interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file';
  content: string;        // Base64 인코딩
  encoding: 'base64';
  download_url: string;
  // ... 기타 필드
}
```

---

### 3. Delete File

파일 삭제 (커밋 생성)

**Request**
```
DELETE /repos/{owner}/{repo}/contents/{path}
Content-Type: application/json
```

**Request Body**
```typescript
interface DeleteFileRequest {
  message: string;        // 커밋 메시지
  sha: string;            // 삭제할 파일의 현재 SHA (필수)
  branch?: string;        // 브랜치 (기본: default)
}
```

**Example**
```json
{
  "message": "Synced to Obsidian: note.md",
  "sha": "abc123...",
  "branch": "main"
}
```

**Response 200 OK**
```typescript
interface DeleteFileResponse {
  content: null;
  commit: {
    sha: string;
    message: string;
    author: { name: string; email: string; date: string; };
    committer: { name: string; email: string; date: string; };
    // ...
  };
}
```

**Error Responses**
| Status | Condition |
|--------|-----------|
| 409 | SHA 불일치 (파일이 변경됨) |
| 404 | 파일 없음 |
| 422 | 유효하지 않은 요청 |

---

### 4. Create File

파일 생성 (processed/ 폴더로 이동 시 사용)

**Request**
```
PUT /repos/{owner}/{repo}/contents/{path}
Content-Type: application/json
```

**Request Body**
```typescript
interface CreateFileRequest {
  message: string;        // 커밋 메시지
  content: string;        // Base64 인코딩된 내용
  branch?: string;        // 브랜치
}
```

**Response 201 Created**
```typescript
interface CreateFileResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    // ...
  };
  commit: {
    sha: string;
    message: string;
    // ...
  };
}
```

---

### 5. Validate Token

토큰 유효성 검증

**Request**
```
GET /user
```

**Response 200 OK**
```typescript
interface GitHubUser {
  login: string;          // 사용자명
  id: number;
  avatar_url: string;
  // ...
}
```

**Response 401 Unauthorized**
```json
{
  "message": "Bad credentials",
  "documentation_url": "https://docs.github.com/rest"
}
```

---

### 6. Validate Repository Access

저장소 접근 권한 확인

**Request**
```
GET /repos/{owner}/{repo}
```

**Response 200 OK**
```typescript
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;      // "owner/repo"
  private: boolean;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  // ...
}
```

**Response 404 Not Found**
- 저장소 없음 또는 접근 권한 없음

---

## Rate Limit Headers

모든 응답에 포함되는 Rate Limit 헤더:

| Header | Description |
|--------|-------------|
| `x-ratelimit-limit` | 시간당 최대 요청 수 |
| `x-ratelimit-remaining` | 남은 요청 수 |
| `x-ratelimit-reset` | 리셋 시각 (Unix timestamp) |
| `x-ratelimit-used` | 사용한 요청 수 |
| `retry-after` | Rate Limit 시 대기 시간 (초) |

---

## Error Response Format

```typescript
interface GitHubApiError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;     // "Contents"
    field: string;        // "sha"
    code: string;         // "missing"
  }>;
}
```

---

## Plugin Implementation

### GitHubApiClient Interface

```typescript
interface GitHubApiClient {
  // 폴더 내 파일 목록 조회
  listFiles(sourcePath: string): Promise<GitHubFile[]>;

  // 파일 내용 다운로드
  downloadFile(path: string): Promise<string>;

  // 파일 삭제
  deleteFile(path: string, sha: string): Promise<void>;

  // 파일 이동 (create + delete)
  moveFile(fromPath: string, toPath: string, sha: string, content: string): Promise<void>;

  // 토큰 유효성 검증
  validateToken(): Promise<boolean>;

  // 저장소 접근 권한 확인
  validateRepository(): Promise<boolean>;

  // 연결 테스트 (validateToken + validateRepository)
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
```
