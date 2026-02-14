# Release Checklist

This repo ships a Node.js MCP server. Releases are intended to be created from git tags (e.g. `v1.0.0`).

## Preflight

- Update `CHANGELOG.md`
- Bump versions:
  - `package.json`
  - `src/version.ts`
  - `package-lock.json`
- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Verify package contents:
  - `npm pack --dry-run --ignore-scripts`

## Tag + Push

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

## npm

Option A: GitHub Actions (recommended)

- Add `NPM_TOKEN` repository secret (npm automation token)
- Push a `vX.Y.Z` tag
- Workflow: `.github/workflows/publish-npm.yml`

Option B: Manual publish

```bash
npm publish
```

## GHCR Docker Image

- Push a `vX.Y.Z` tag
- Workflow: `.github/workflows/publish-ghcr.yml`
- Image tags:
  - `ghcr.io/<owner>/gitlab-mcp-server:X.Y.Z`
  - `ghcr.io/<owner>/gitlab-mcp-server:latest`

