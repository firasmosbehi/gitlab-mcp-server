# Changelog

## 1.1.0

- Issues: create/update issues; list/add issue notes (comments).
- Merge requests: list/add merge request notes (comments).

## 1.0.2

- Packaging: publish to npm as `gitlab-mcp-server-firasmosbehi` (unscoped) for compatibility with npm scopes.

## 1.0.1

- Packaging: publish to npm as `@firasmosbehi/gitlab-mcp-server` (scoped) to avoid name conflicts.

## 1.0.0

- Transport: add optional MCP Streamable HTTP server mode (in addition to stdio), with basic bearer auth support.
- Auth: add optional GitLab OAuth token support (in addition to PATs), including helper CLI for login/refresh and token-file based refresh.
- Distribution: npm packaging hardening, release checklist, and GitHub Actions workflows for npm + GHCR publishing.
- Security: Dependabot, dependency review, and CodeQL scanning.

## 0.4.0

- CI power tools: retry/cancel/play job; retry/cancel pipeline.
- Artifacts: fetch artifacts metadata and download artifacts archive with size limits.
- Job log ergonomics: fetch log tail and search within bounded log tails.

## 0.3.0

- Repo navigation: list repository tree, search code.
- MR context: fetch merge request changes with bounded diff snippets.
- MCP: add resources (`gitlab://...`) and prompts (triage/review/debug templates).

## 0.2.0

- Safety: read-only mode and tool allow/deny lists.
- Guardrails: optional host and write-project allowlists.
- Write tools: create branch, create commit (multi-file actions), create merge request (API-only).

## 0.1.0

- Initial release: read-only GitLab MCP tools (issues, merge requests, repository files, pipelines, job logs).
