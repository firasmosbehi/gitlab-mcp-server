# gitlab-mcp-server

Model Context Protocol (MCP) server for GitLab: issues, merge requests, repository files, and CI pipelines/job logs.

## Features (v0.1)

- Issues: search and fetch issue details
- Merge Requests: list and fetch MR details
- Repo files: read a file from a ref (branch/tag/sha)
- CI: list pipelines, inspect a pipeline, list pipeline jobs, fetch job logs

## Install

```bash
npm install
```

## Configuration

- `GITLAB_TOKEN` (required): GitLab Personal Access Token
- `GITLAB_HOST` (optional): defaults to `https://gitlab.com`

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

## Security

Treat `GITLAB_TOKEN` like a password. Prefer least-privilege tokens and avoid granting write scopes unless you need them.

