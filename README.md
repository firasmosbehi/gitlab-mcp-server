# gitlab-mcp-server

Model Context Protocol (MCP) server for GitLab: issues, merge requests, repository files, and CI pipelines/job logs.

## Features

- Project discovery: current user, list projects, project details, branches/tags/labels
- Issues: search/fetch/create/update; list/add notes (comments)
- Merge Requests: list/fetch; list/add notes (comments); discussions/threads (inline-ready) and merge
- Repo files: read a file from a ref (branch/tag/sha)
- Repo navigation: list repo tree, search code
- MR context: bounded diff summaries via MR changes
- CI: list pipelines, inspect a pipeline, list pipeline jobs, fetch job logs (plus tail/search)
- CI actions (guarded): retry/cancel/play job; retry/cancel pipeline
- Artifacts: fetch artifacts metadata and download artifacts archive (size-limited)
- Write (guarded): create branch, create commit (multi-file actions), create merge request
- MCP: resources (`gitlab://...`) and prompts

## Install

From npm (recommended):

```bash
npm i -g gitlab-mcp-server-firasmosbehi
```

This installs the `gitlab-mcp-server` CLI.

From source:

```bash
npm install
npm run build
```

## Configuration

- `GITLAB_AUTH_MODE` (optional): `pat|oauth` (default: `pat`)
- `GITLAB_TOKEN` (required for `pat`): GitLab Personal Access Token
- `GITLAB_OAUTH_ACCESS_TOKEN` (optional for `oauth`): GitLab OAuth access token
- `GITLAB_OAUTH_TOKEN_FILE` (optional for `oauth`): Path to an OAuth token JSON file (preferred)
- `GITLAB_OAUTH_CLIENT_ID` / `GITLAB_OAUTH_CLIENT_SECRET` / `GITLAB_OAUTH_REDIRECT_URI` (optional): used for token refresh and `gitlab-mcp-server auth ...`
- `GITLAB_HOST` (optional): defaults to `https://gitlab.com`
- `GITLAB_USER_AGENT` (optional): defaults to `gitlab-mcp-server/<version>`
- `LOG_LEVEL` (optional): `error|warn|info|debug` (default: `info`)

### OAuth Helper CLI (Optional)

To generate a token file via browser login (Authorization Code + PKCE):

```bash
gitlab-mcp-server auth login --client-id "..." --scopes "read_api" --out ./gitlab-oauth-token.json
```

To refresh an existing token file (if it has `refresh_token`):

```bash
gitlab-mcp-server auth refresh --file ./gitlab-oauth-token.json
```

### Policy / Safety

- `GITLAB_MCP_READ_ONLY` (optional): `1|true|yes` to disable all write tools (default: `false`)
- `GITLAB_MCP_ENABLED_TOOLS` (optional): comma-separated allowlist of tool names to expose
- `GITLAB_MCP_DISABLED_TOOLS` (optional): comma-separated denylist of tool names to hide
- `GITLAB_MCP_WRITE_PROJECT_ALLOWLIST` (optional): comma-separated list of allowed `project` values for write tools
- `GITLAB_MCP_HOST_ALLOWLIST` (optional): comma-separated list of allowed `GITLAB_HOST` values (fails fast if not allowed)

### Transport (stdio or HTTP)

- `GITLAB_MCP_TRANSPORT` (optional): `stdio|http` (default: `stdio`)

When `GITLAB_MCP_TRANSPORT=http`:

- `GITLAB_MCP_HTTP_HOST` (optional): bind host (default: `127.0.0.1`)
- `GITLAB_MCP_HTTP_PORT` (optional): bind port (default: `3000`)
- `GITLAB_MCP_HTTP_PATH` (optional): MCP endpoint path (default: `/mcp`)
- `GITLAB_MCP_HTTP_ALLOWED_HOSTS` (optional): comma-separated host allowlist for DNS rebinding protection
- `GITLAB_MCP_HTTP_STATEFUL` (optional): `true|false` (default: `true`)
- `GITLAB_MCP_HTTP_MAX_SESSIONS` (optional): max in-memory sessions when stateful (default: `200`)
- `GITLAB_MCP_HTTP_BEARER_TOKEN` (optional): require `Authorization: Bearer <token>` on all HTTP MCP endpoints

## Run Locally

```bash
export GITLAB_TOKEN="..."
npm run dev
```

Build and run:

```bash
npm run build
npm start
```

## Test With MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Example MCP Client Config

Most MCP clients take a stdio command plus environment variables. Example shape:

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "GITLAB_TOKEN": "YOUR_TOKEN_HERE",
        "GITLAB_HOST": "https://gitlab.com"
      }
    }
  }
}
```

## Docker

```bash
docker build -t gitlab-mcp-server .
docker run -e GITLAB_TOKEN="..." gitlab-mcp-server
```

For HTTP transport in Docker (example):

```bash
docker run -p 3000:3000 \\
  -e GITLAB_MCP_TRANSPORT=http \\
  -e GITLAB_MCP_HTTP_HOST=0.0.0.0 \\
  -e GITLAB_MCP_HTTP_PORT=3000 \\
  -e GITLAB_MCP_HTTP_BEARER_TOKEN="change-me" \\
  -e GITLAB_TOKEN="..." \\
  gitlab-mcp-server
```

## Tools

Tool names exposed by this server:

- `gitlab_get_current_user`
- `gitlab_list_projects`
- `gitlab_get_project`
- `gitlab_list_branches`
- `gitlab_list_tags`
- `gitlab_list_project_labels`
- `gitlab_search_issues`
- `gitlab_get_issue`
- `gitlab_list_issue_notes`
- `gitlab_list_merge_requests`
- `gitlab_get_merge_request`
- `gitlab_list_merge_request_notes`
- `gitlab_list_merge_request_discussions`
- `gitlab_get_file`
- `gitlab_list_repo_tree`
- `gitlab_search_code`
- `gitlab_list_pipelines`
- `gitlab_get_pipeline`
- `gitlab_list_pipeline_jobs`
- `gitlab_get_job_log`
- `gitlab_get_job_log_tail`
- `gitlab_search_job_log`
- `gitlab_get_job_artifacts`
- `gitlab_download_job_artifacts`
- `gitlab_get_merge_request_changes`
- `gitlab_create_issue`
- `gitlab_update_issue`
- `gitlab_add_issue_note`
- `gitlab_add_merge_request_note`
- `gitlab_create_merge_request_discussion`
- `gitlab_add_merge_request_discussion_note`
- `gitlab_update_merge_request_discussion_note`
- `gitlab_merge_merge_request`
- `gitlab_create_branch`
- `gitlab_create_commit`
- `gitlab_create_merge_request`
- `gitlab_retry_job`
- `gitlab_cancel_job`
- `gitlab_play_job`
- `gitlab_retry_pipeline`
- `gitlab_cancel_pipeline`

## MCP Resources and Prompts

Resources:

- `gitlab://help`
- `gitlab://file?project=<...>&ref=<...>&path=<...>`
- `gitlab://job-log?project=<...>&job_id=<...>&max_chars=<...>`

Prompts:

- `triage_issue`
- `review_merge_request`
- `debug_ci_job`

## Security

Treat `GITLAB_TOKEN` like a password. Prefer least-privilege tokens and avoid granting write scopes unless you need them.

For OAuth token files, keep the JSON file private (this server writes it with `0600` permissions when possible).

OAuth threat model notes:

- OAuth access tokens are still bearer secrets; protect them the same way as PATs.
- Prefer OAuth over long-lived PATs for remote deployments so you can rotate/revoke tokens centrally.
- If you enable `GITLAB_MCP_TRANSPORT=http`, strongly consider setting `GITLAB_MCP_HTTP_BEARER_TOKEN` and restricting allowed hosts.
