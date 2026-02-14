# Changelog

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
