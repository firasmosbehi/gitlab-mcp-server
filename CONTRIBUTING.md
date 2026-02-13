# Contributing

## Development Setup

Requirements:

- Node.js 20+
- A GitLab Personal Access Token (PAT) with minimal scopes needed for read-only API access

Install:

```bash
npm ci
```

Run (stdio MCP server):

```bash
export GITLAB_TOKEN="..."
npm run dev
```

## Scripts

- `npm run dev`: run the server via `tsx`
- `npm run build`: build to `dist/` via `tsup`
- `npm start`: run `node dist/index.js`
- `npm run typecheck`: TypeScript typecheck
- `npm test`: unit tests

## Pull Requests

- Keep changes focused and include tests for new behavior.
- Do not log secrets (tokens, headers).

