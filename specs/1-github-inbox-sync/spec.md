# Feature Specification: GitHub Inbox Sync for Obsidian

**Version**: 1.0.0
**Created**: 2025-12-26
**Status**: Draft
**Feature ID**: 1-github-inbox-sync

---

## Overview

### Problem Statement

Users who automate content creation through n8n workflows cannot directly sync generated notes to their Obsidian vault when:
- The vault is synchronized via iCloud (no public API)
- The Obsidian app cannot be kept running continuously
- Existing solutions like Obsidian Local REST API require the app to be open

This creates a gap between automated content generation and vault integration, forcing users to manually transfer notes.

### Solution Summary

Create an Obsidian plugin that uses GitHub as an intermediary storage layer. The n8n workflow pushes generated notes to a GitHub repository, and the plugin fetches these notes into the local Obsidian vault when the app is opened or on a scheduled interval.

### Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Automation Enthusiast | Uses n8n/Zapier for content workflows | Seamless vault integration for automated notes |
| Knowledge Worker | Maintains Obsidian vault for PKM | Automatic ingestion of external content |
| iCloud Vault User | Syncs vault across Apple devices via iCloud | External automation without breaking sync |

---

## User Scenarios & Testing

### Primary User Flow

**Scenario 1: First-time Setup**
1. User installs the plugin from Obsidian Community Plugins
2. User navigates to plugin settings
3. User enters GitHub Personal Access Token
4. User specifies repository name (owner/repo format)
5. User configures source folder in GitHub (default: inbox/)
6. User configures target folder in vault (default: inbox/)
7. User clicks "Test Connection" button
8. System validates credentials and repository access
9. User sees success confirmation

**Acceptance Criteria:**
- Settings persist after Obsidian restart
- Token is masked in the settings UI
- Invalid token shows clear error message
- Invalid repository shows "repository not found" error

### Secondary User Flows

**Scenario 2: Automatic Sync on Startup**
1. User opens Obsidian with plugin enabled
2. Plugin automatically checks GitHub repository for new files
3. New markdown files are downloaded to target folder
4. User sees notification: "Synced X new notes from GitHub"
5. Previously synced files (tracked by SHA) are skipped

**Acceptance Criteria:**
- Sync completes within 30 seconds for up to 50 files
- No duplicate notes are created for previously synced content
- User is notified of sync completion
- Sync errors display user-friendly messages

**Scenario 3: Manual Sync via Command**
1. User opens Command Palette
2. User selects "GitHub Inbox Sync: Sync now"
3. Plugin fetches and creates new notes
4. Notification shows sync results

**Acceptance Criteria:**
- Command appears in Command Palette
- Ribbon icon triggers the same action when clicked
- Concurrent sync requests are prevented

**Scenario 4: Periodic Auto-Sync**
1. User enables auto-sync in settings
2. User sets interval (default: 5 minutes)
3. Plugin syncs automatically at configured intervals
4. User can disable auto-sync at any time

**Acceptance Criteria:**
- Timer resets after each successful sync
- Sync does not occur if previous sync is still running
- Interval changes take effect immediately

**Scenario 5: Handling Duplicate Files**
1. User has a file with the same name in the target folder
2. Plugin encounters the duplicate during sync
3. Based on user settings, plugin either:
   - Skips the file (default)
   - Overwrites the existing file
   - Renames the new file with timestamp

**Acceptance Criteria:**
- User can select handling mode in settings
- Skip mode preserves original file completely
- Overwrite mode replaces content entirely
- Rename mode appends timestamp to filename

**Scenario 6: Post-Sync File Handling in GitHub**
1. After successful sync, plugin handles source files
2. Based on settings, plugin either:
   - Keeps files in inbox (default behavior for read-only tokens)
   - Moves files to processed/ folder
   - Deletes files from GitHub

**Acceptance Criteria:**
- Move operation creates commit with descriptive message
- Delete operation requires user confirmation in settings
- Failed post-processing doesn't affect synced local files

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty inbox folder | Show "No new notes to sync" notification |
| Network unavailable | Show error notification, retry on next sync |
| Token expired | Show authentication error, prompt to update settings |
| Large file (>1MB) | Sync normally (markdown files are typically small) |
| Non-markdown files | Skip files not matching *.md pattern |
| Rate limit exceeded | Wait and retry with exponential backoff |
| Previously synced file deleted locally | Do not re-download (tracked by SHA history) |
| GitHub file modified (SHA changed) | Download as new file (new SHA not in history) |

---

## Functional Requirements

### Authentication & Configuration

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-001 | Store GitHub Personal Access Token securely | Token saved in plugin data file, masked in UI |
| FR-002 | Configure repository in owner/repo format | Validation ensures correct format before saving |
| FR-003 | Configure branch name with default of "main" | Setting persists and is used in all API calls |
| FR-004 | Configure source folder path in GitHub | Default value is "inbox", path validated |
| FR-005 | Configure target folder path in vault | Default value is "inbox", folder created if missing |
| FR-006 | Test connection validates credentials and repository access | Button shows loading state, displays success/failure result |

### Synchronization

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-101 | Sync automatically when Obsidian starts | Configurable toggle, enabled by default |
| FR-102 | Sync manually via command palette command | Command registered and functional |
| FR-103 | Sync manually via ribbon icon click | Icon visible and clickable in left sidebar |
| FR-104 | Sync periodically based on configured interval | Default 5 minutes, range 1-60 minutes |
| FR-105 | Enable/disable auto-sync via settings toggle | Setting change takes immediate effect |
| FR-106 | Track synced files by SHA to prevent re-downloading | SHA stored in sync state, checked before download |
| FR-107 | Auto-cleanup old sync records after 90 days | Prevents unlimited growth of sync history |

### File Processing

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-201 | Download only markdown (.md) files | Other file types are ignored |
| FR-202 | Handle duplicate filenames based on user preference | Skip/Overwrite/Rename options available |
| FR-203 | Optionally delete files from GitHub after sync | Requires "contents:write" permission |
| FR-204 | Optionally move files to processed/ folder after sync | Creates folder if not exists |
| FR-205 | Record synced file SHA to prevent resurrection | SHA stored even if local file later deleted |

### Notifications & Feedback

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-301 | Show notification on sync completion | Displays count of new notes synced |
| FR-302 | Show notification on sync error | Displays user-friendly error message |
| FR-303 | Display sync status in ribbon icon | Optional visual indicator during sync |

---

## Success Criteria

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| Setup completion | Users complete initial setup in under 3 minutes | User testing with timer |
| Sync reliability | 99% of sync operations complete successfully | Error rate monitoring |
| Sync performance | Sync of 50 files completes in under 30 seconds | Performance testing |
| User satisfaction | Users can sync notes without technical intervention | User feedback survey |
| Duplicate prevention | Zero duplicate notes created for previously synced content | Functional testing |
| Data integrity | 100% of synced notes match source content exactly | Hash comparison testing |

---

## Key Entities

### GitHubInboxSyncSettings
Stores user configuration for the plugin.

| Attribute | Description |
|-----------|-------------|
| githubToken | Personal Access Token for GitHub API authentication |
| repository | Target repository in "owner/repo" format |
| branch | Branch to sync from (default: main) |
| sourcePath | Folder path in GitHub repository (default: inbox) |
| targetPath | Folder path in Obsidian vault (default: inbox) |
| syncOnStartup | Enable sync when Obsidian opens |
| autoSync | Enable periodic automatic sync |
| syncInterval | Minutes between auto-syncs (1-60) |
| duplicateHandling | How to handle filename conflicts (skip/overwrite/rename) |
| deleteAfterSync | Delete files from GitHub after successful sync |
| moveToProcessed | Move files to processed/ folder after sync |
| showNotifications | Display sync result notifications |

### SyncState
Tracks synchronization history and processed files.

| Attribute | Description |
|-----------|-------------|
| lastSyncTime | Timestamp of most recent sync |
| syncedFiles | Map of SHA to SyncedFileRecord |
| syncHistory | Array of recent sync results |

### SyncedFileRecord
Records individual file sync history.

| Attribute | Description |
|-----------|-------------|
| filename | Original filename from GitHub |
| path | Path in GitHub repository |
| syncedAt | Timestamp when file was synced |
| localPath | Path where file was saved in vault |

### GitHubFile
Represents a file fetched from GitHub API.

| Attribute | Description |
|-----------|-------------|
| name | Filename |
| path | Full path in repository |
| sha | Git SHA hash (unique identifier) |
| size | File size in bytes |
| downloadUrl | Direct download URL |

---

## Scope & Boundaries

### In Scope
- One-way sync from GitHub to Obsidian vault
- Markdown file synchronization only
- GitHub REST API integration
- Basic duplicate handling
- Sync history tracking to prevent note resurrection
- Settings UI with all configuration options
- Manual and automatic sync triggers

### Out of Scope
- Bidirectional sync (Obsidian to GitHub)
- Real-time sync while app is closed
- Image and attachment synchronization
- Conflict resolution beyond skip/overwrite/rename
- Multiple repository support
- OAuth flow (uses PAT only)
- Webhook-triggered sync

---

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| Obsidian API | Platform | Plugin framework and vault access |
| GitHub REST API | External Service | File listing, download, and management |
| Internet connectivity | Infrastructure | Required for GitHub API communication |
| GitHub PAT with repo/contents access | Authentication | User must generate and provide token |

---

## Assumptions

1. Users have a GitHub account and can create Personal Access Tokens
2. Users have an existing GitHub repository for the inbox
3. The n8n workflow (or other automation) handles the GitHub push separately
4. Markdown files in the inbox are complete and valid
5. Network connectivity is available when Obsidian is open
6. Vault folder structure can be created by the plugin
7. File sizes are typical for markdown (under 1MB)
8. Users understand basic GitHub concepts (repository, branch)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub API rate limiting | Medium | Medium | Implement exponential backoff and caching |
| Token expiration/invalidation | Low | High | Clear error messages guiding user to update token |
| Network failures during sync | Medium | Low | Graceful error handling, retry on next cycle |
| Large number of files overwhelming sync | Low | Medium | Pagination and progress indication |
| User deletes synced file, expects it back | Medium | Medium | Clear documentation that SHA tracking prevents re-download |
