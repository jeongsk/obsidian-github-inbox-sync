# NotebookLM 연동 가이드

현재(2026년 기준) 개인용 NotebookLM은 공식적인 범용 API를 제공하지 않지만, 오픈소스 커뮤니티의 MCP(Model Context Protocol) 기반 도구들과 Google Cloud의 NotebookLM Enterprise API를 통해 Gemini CLI나 Claude Code와 훌륭하게 연동할 수 있습니다.

## 1. Claude Code와 연동하기 (가장 추천: MCP 서버 활용)

Claude Code는 AI 모델이 외부 도구와 통신할 수 있게 해주는 표준인 MCP를 완벽하게 지원합니다. 오픈소스 커뮤니티에서 개발한 `notebooklm-mcp-cli` 또는 `notebooklm-py` 같은 도구를 사용하면, Claude Code 안에서 에이전트가 NotebookLM을 직접 제어하게 만들 수 있습니다.

### 설치 및 설정 방법 (notebooklm-cli 예시)

```bash
# CLI 도구 설치에 권장되는 pipx 사용
pipx install notebooklm-cli

# 처음 실행하여 Chrome DevTools Protocol 등을 통한 구글 계정 인증
nlm login
```

### Claude Code에 MCP 연동

Claude Code의 설정에 설치한 NotebookLM MCP 서버를 추가합니다. 연동이 끝나면 Claude Code 터미널에서 자연어로 명령:

> "내 NotebookLM에 '2026 AI 트렌드'라는 노트를 만들고 심층 조사를 한 뒤 오디오 개요를 만들어줘"

## 2. 터미널에서 직접 제어하기 (CLI 독립 실행형)

Gemini CLI 등 다른 터미널 도구들과 파이프라인을 연결해 스크립트로 짜고 싶다면, 위에서 설치한 `notebooklm-cli`를 독립적인 명령어로 활용할 수 있습니다.

### 활용 예시

```bash
# 새 노트북 생성
nlm notebook create "내 리서치"

# 특정 주제로 리서치 시작
nlm research start "양자 컴퓨팅 최신 동향" --notebook-id <ID>

# 팟캐스트(오디오 개요) 생성
nlm audio create <ID> --format deep_dive --confirm
```

gemini-cli로 텍스트나 데이터를 생성한 뒤 그 결과물을 파이프(`|`)나 Bash 스크립트를 통해 `nlm` 명령어로 넘겨 NotebookLM의 소스로 추가하는 파이프라인을 구축할 수 있습니다.

## 3. 기업용 공식 API 사용 (NotebookLM Enterprise API)

Google Cloud 환경에서 엔터프라이즈 버전을 사용 중이라면, 최근 출시된 공식 **NotebookLM Enterprise API**를 활용하는 것이 가장 안정적입니다.

### 특징
- REST API를 통해 노트북 생성, 소스 업로드, 삭제 및 공유 권한 관리를 프로그래밍 방식으로 제어

### 활용
Google Cloud SDK(`gcloud`)나 Python SDK(`nblm-rs` 등)와 결합하여, 사내 보안이 유지되는 환경에서 자체적인 CLI 도구나 Gemini 연동 봇을 구축하는 데 적합합니다.

## 4. 대안: Gemini API의 'File Search Tool' 활용

NotebookLM 플랫폼 자체가 필요한 게 아니라, "내 문서를 바탕으로 똑똑하게 대답해 주는(RAG)" 기능을 CLI에서 쓰고 싶다면 **Gemini API에 내장된 File Search Tool**을 사용하는 것을 권장합니다.

복잡한 RAG 파이프라인(문서 청크화, 임베딩, 컨텍스트 주입 등)을 구글이 자체적으로 관리해 주므로, 사실상 '나만의 맞춤형 CLI NotebookLM'을 직접 만들 수 있습니다.

---

## 관련 링크

- notebooklm-cli: https://github.com/nicklalone/notebooklm-cli
- MCP 사양: https://modelcontextprotocol.io/
- Google Cloud NotebookLM: https://cloud.google.com/generative-ai-app-builder/docs/notebooklm-overview
