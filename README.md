# gitlab-mcp-server

Model Context Protocol (MCP) server for GitLab: issues, merge requests, repository files, and CI pipelines/job logs.

## Features

- Issues: search and fetch issue details
- Merge Requests: list and fetch MR details
- Repo files: read a file from a ref (branch/tag/sha)
- CI: list pipelines, inspect a pipeline, list pipeline jobs, fetch job logs
- Write (guarded): create branch, create commit (multi-file actions), create merge request

## Install

```bash
npm install
```

## Configuration

- `GITLAB_TOKEN` (required): GitLab Personal Access Token
- `GITLAB_HOST` (optional): defaults to `https://gitlab.com`
- `GITLAB_USER_AGENT` (optional): defaults to `gitlab-mcp-server/<version>`
- `LOG_LEVEL` (optional): `error|warn|info|debug` (default: `info`)

### Policy / Safety

- `GITLAB_MCP_READ_ONLY` (optional): `1|true|yes` to disable all write tools (default: `false`)
- `GITLAB_MCP_ENABLED_TOOLS` (optional): comma-separated allowlist of tool names to expose
- `GITLAB_MCP_DISABLED_TOOLS` (optional): comma-separated denylist of tool names to hide
- `GITLAB_MCP_WRITE_PROJECT_ALLOWLIST` (optional): comma-separated list of allowed `project` values for write tools
- `GITLAB_MCP_HOST_ALLOWLIST` (optional): comma-separated list of allowed `GITLAB_HOST` values (fails fast if not allowed)

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

## Tools

Tool names exposed by this server:

- `gitlab_search_issues`
- `gitlab_get_issue`
- `gitlab_list_merge_requests`
- `gitlab_get_merge_request`
- `gitlab_get_file`
- `gitlab_list_pipelines`
- `gitlab_get_pipeline`
- `gitlab_list_pipeline_jobs`
- `gitlab_get_job_log`
- `gitlab_create_branch`
- `gitlab_create_commit`
- `gitlab_create_merge_request`

## Security

Treat `GITLAB_TOKEN` like a password. Prefer least-privilege tokens and avoid granting write scopes unless you need them.
