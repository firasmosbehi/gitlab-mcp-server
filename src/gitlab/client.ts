import { Gitlab } from "@gitbeaker/rest";

import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import { getHttpStatus } from "./errors.js";

export type IssueSummary = Readonly<{
  iid: number;
  title: string;
  state: string;
  labels: string[];
  web_url: string;
  updated_at: string;
}>;

export type IssueDetail = IssueSummary &
  Readonly<{
    description: string;
    created_at: string;
  }>;

export type MergeRequestSummary = Readonly<{
  iid: number;
  title: string;
  state: string;
  source_branch: string;
  target_branch: string;
  web_url: string;
  updated_at: string;
}>;

export type MergeRequestDetail = MergeRequestSummary &
  Readonly<{
    description: string;
    created_at: string;
  }>;

export type PipelineSummary = Readonly<{
  id: number;
  status: string;
  ref: string;
  sha: string;
  web_url: string;
  updated_at: string;
}>;

export type PipelineDetail = PipelineSummary &
  Readonly<{
    created_at: string;
  }>;

export type PipelineJobSummary = Readonly<{
  id: number;
  name: string;
  stage: string;
  status: string;
  web_url: string;
  started_at: string | null;
  finished_at: string | null;
}>;

export type RepoFile = Readonly<{
  file_path: string;
  ref: string;
  content: string;
  size_bytes: number;
}>;

export type RepoTreeEntry = Readonly<{
  id: string;
  name: string;
  type: string;
  path: string;
  mode: string;
}>;

export type RepoTreeParams = Readonly<{
  project: string;
  ref?: string;
  path?: string;
  recursive?: boolean;
  page: number;
  per_page: number;
}>;

export type CodeSearchMatch = Readonly<{
  path: string;
  filename?: string;
  ref?: string;
  startline?: number;
  data?: string;
}>;

export type CodeSearchParams = Readonly<{
  project: string;
  query: string;
  ref?: string;
  page: number;
  per_page: number;
}>;

export type CreatedBranch = Readonly<{
  name: string;
  web_url: string;
  commit_sha: string;
}>;

export type CommitActionInput = Readonly<{
  action: "create" | "update" | "delete";
  filePath: string;
  content?: string;
  encoding?: "text" | "base64";
  lastCommitId?: string;
}>;

export type CreatedCommit = Readonly<{
  id: string;
  short_id: string;
  title: string;
  message: string;
  web_url: string;
  created_at?: string;
}>;

export type CreatedMergeRequest = Readonly<{
  iid: number;
  title: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
  created_at?: string;
}>;

export type SearchIssuesParams = Readonly<{
  project: string;
  query?: string;
  state?: "opened" | "closed" | "all";
  labels?: string[];
  assignee?: string;
  author?: string;
  page: number;
  per_page: number;
}>;

export type ListMergeRequestsParams = Readonly<{
  project: string;
  state?: "opened" | "closed" | "merged" | "all";
  search?: string;
  page: number;
  per_page: number;
}>;

export type ListPipelinesParams = Readonly<{
  project: string;
  ref?: string;
  status?: string;
  page: number;
  per_page: number;
}>;

export interface GitLabFacade {
  searchIssues: (params: SearchIssuesParams) => Promise<IssueSummary[]>;
  getIssue: (project: string, iid: number) => Promise<IssueDetail>;
  listMergeRequests: (params: ListMergeRequestsParams) => Promise<MergeRequestSummary[]>;
  getMergeRequest: (project: string, iid: number) => Promise<MergeRequestDetail>;
  getFile: (project: string, filePath: string, ref?: string) => Promise<RepoFile>;
  listRepoTree: (params: RepoTreeParams) => Promise<RepoTreeEntry[]>;
  searchCode: (params: CodeSearchParams) => Promise<CodeSearchMatch[]>;
  getMergeRequestChanges: (project: string, iid: number) => Promise<any>;
  listPipelines: (params: ListPipelinesParams) => Promise<PipelineSummary[]>;
  getPipeline: (project: string, pipelineId: number) => Promise<PipelineDetail>;
  listPipelineJobs: (project: string, pipelineId: number) => Promise<PipelineJobSummary[]>;
  getJobLog: (project: string, jobId: number) => Promise<string>;

  createBranch: (project: string, branchName: string, ref?: string) => Promise<CreatedBranch>;
  createCommit: (
    project: string,
    branch: string,
    message: string,
    actions: CommitActionInput[],
    options?: { startBranch?: string },
  ) => Promise<CreatedCommit>;
  createMergeRequest: (
    project: string,
    sourceBranch: string,
    targetBranch: string | undefined,
    title: string,
    options?: {
      description?: string;
      labels?: string[] | string;
      removeSourceBranch?: boolean;
      assigneeId?: number;
      reviewerIds?: number[];
    },
  ) => Promise<CreatedMergeRequest>;
}

type AnyGitlab = any;

class GitlabFetchError extends Error {
  public readonly response: { status: number };

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitlabFetchError";
    this.response = { status };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  const n = Math.max(0, ms);
  const delta = Math.floor(n * 0.2);
  return n - delta + Math.floor(Math.random() * (delta * 2 + 1));
}

async function withRetry<T>(
  logger: Logger,
  fn: () => Promise<T>,
  opts?: { maxAttempts?: number },
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  let attempt = 1;

  // Basic bounded backoff for GitLab GET endpoints.
  // We retry on 429 and 5xx responses.
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = getHttpStatus(err);
      const retryable = status === 429 || (status !== undefined && status >= 500 && status <= 599);

      if (!retryable || attempt >= maxAttempts) throw err;

      const delayMs = Math.min(2000, 250 * 2 ** (attempt - 1));
      logger.debug("GitLab request failed; retrying", { attempt, status, delayMs });
      await sleep(jitter(delayMs));
      attempt += 1;
    }
  }
}

function decodeRepoFile(content: string, encoding: string): Buffer {
  if (encoding === "base64") return Buffer.from(content, "base64");
  // GitLab may return "text" in some cases; treat as utf8 bytes.
  return Buffer.from(content, "utf8");
}

export function createGitlabFacade(config: Config, logger: Logger): GitLabFacade {
  const api: AnyGitlab = new Gitlab({
    host: config.gitlabHost,
    token: config.gitlabToken,
  });

  async function fetchJson<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const base = `${config.gitlabHost}/api/v4`;
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }

    const res = await fetch(url, {
      headers: {
        "PRIVATE-TOKEN": config.gitlabToken,
        "User-Agent": config.gitlabUserAgent,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const snippet = text.length > 500 ? `${text.slice(0, 500)}...` : text;
      throw new GitlabFetchError(res.status, `GitLab API error (${res.status}): ${snippet}`);
    }

    return (await res.json()) as T;
  }

  const defaultBranchCache = new Map<string, string>();

  async function getDefaultBranch(project: string): Promise<string> {
    const cached = defaultBranchCache.get(project);
    if (cached) return cached;

    const proj = await withRetry<any>(logger, () => api.Projects.show(project));
    const branch = proj?.default_branch;
    if (!branch || typeof branch !== "string") {
      throw new Error("Could not determine default branch for project.");
    }
    defaultBranchCache.set(project, branch);
    return branch;
  }

  return {
    async searchIssues(params) {
      const issues = await withRetry(logger, async () => {
        // GitBeaker supports both (projectId, options) and ({ projectId, ... })
        // depending on version; this call shape is type-erased here and verified by tests/typecheck.
        return api.Issues.all({
          projectId: params.project,
          search: params.query,
          state: params.state,
          labels: params.labels?.join(","),
          assigneeUsername: params.assignee ? [params.assignee] : undefined,
          authorUsername: params.author,
          page: params.page,
          perPage: params.per_page,
        });
      });

      return (issues as any[]).map((i) => ({
        iid: i.iid,
        title: i.title,
        state: i.state,
        labels: Array.isArray(i.labels) ? i.labels : [],
        web_url: i.web_url,
        updated_at: i.updated_at,
      }));
    },

    async getIssue(project, iid) {
      const issue = await withRetry<any>(logger, () => api.Issues.show(project, iid));
      return {
        iid: issue.iid,
        title: issue.title,
        state: issue.state,
        labels: Array.isArray(issue.labels) ? issue.labels : [],
        web_url: issue.web_url,
        updated_at: issue.updated_at,
        created_at: issue.created_at,
        description: issue.description ?? "",
      };
    },

    async listMergeRequests(params) {
      const mrs = await withRetry(logger, async () => {
        return api.MergeRequests.all({
          projectId: params.project,
          state: params.state,
          search: params.search,
          page: params.page,
          perPage: params.per_page,
        });
      });

      return (mrs as any[]).map((m) => ({
        iid: m.iid,
        title: m.title,
        state: m.state,
        source_branch: m.source_branch,
        target_branch: m.target_branch,
        web_url: m.web_url,
        updated_at: m.updated_at,
      }));
    },

    async getMergeRequest(project, iid) {
      const mr = await withRetry<any>(logger, () => api.MergeRequests.show(project, iid));
      return {
        iid: mr.iid,
        title: mr.title,
        state: mr.state,
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        web_url: mr.web_url,
        updated_at: mr.updated_at,
        created_at: mr.created_at,
        description: mr.description ?? "",
      };
    },

    async getFile(project, filePath, ref) {
      const effectiveRef = ref ?? (await getDefaultBranch(project));
      const file = await withRetry<any>(logger, () =>
        api.RepositoryFiles.show(project, filePath, effectiveRef),
      );

      const buf = decodeRepoFile(file.content ?? "", file.encoding ?? "base64");
      return {
        file_path: file.file_path ?? filePath,
        ref: effectiveRef,
        content: buf.toString("utf8"),
        size_bytes: buf.length,
      };
    },

    async listRepoTree(params) {
      const effectiveRef = params.ref ?? (await getDefaultBranch(params.project));
      const entries = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(params.project)}/repository/tree`,
          {
            ref: effectiveRef,
            path: params.path,
            recursive: params.recursive ? "true" : undefined,
            page: params.page,
            per_page: params.per_page,
          },
        ),
      );

      return entries.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        path: e.path,
        mode: e.mode,
      }));
    },

    async searchCode(params) {
      const matches = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(`/projects/${encodeURIComponent(params.project)}/search`, {
          scope: "blobs",
          search: params.query,
          ref: params.ref,
          page: params.page,
          per_page: params.per_page,
        }),
      );

      return matches.map((m) => ({
        path: m.path ?? m.filename ?? "",
        filename: m.filename,
        ref: m.ref,
        startline: typeof m.startline === "number" ? m.startline : undefined,
        data: m.data,
      }));
    },

    async getMergeRequestChanges(project, iid) {
      return withRetry<any>(logger, () => api.MergeRequests.showChanges(project, iid));
    },

    async listPipelines(params) {
      const pipes = await withRetry(logger, async () => {
        return api.Pipelines.all(params.project, {
          ref: params.ref,
          status: params.status,
          page: params.page,
          perPage: params.per_page,
        });
      });

      return (pipes as any[]).map((p) => ({
        id: p.id,
        status: p.status,
        ref: p.ref,
        sha: p.sha,
        web_url: p.web_url,
        updated_at: p.updated_at,
      }));
    },

    async getPipeline(project, pipelineId) {
      const p = await withRetry<any>(logger, () => api.Pipelines.show(project, pipelineId));
      return {
        id: p.id,
        status: p.status,
        ref: p.ref,
        sha: p.sha,
        web_url: p.web_url,
        updated_at: p.updated_at,
        created_at: p.created_at,
      };
    },

    async listPipelineJobs(project, pipelineId) {
      const jobs = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(project)}/pipelines/${pipelineId}/jobs`,
          { per_page: 100, page: 1 },
        ),
      );

      return (jobs as any[]).map((j) => ({
        id: j.id,
        name: j.name,
        stage: j.stage,
        status: j.status,
        web_url: j.web_url,
        started_at: j.started_at ?? null,
        finished_at: j.finished_at ?? null,
      }));
    },

    async getJobLog(project, jobId) {
      // GitLab endpoint: GET /projects/:id/jobs/:job_id/trace
      const trace = await withRetry<any>(logger, () => api.Jobs.showLog(project, jobId));
      if (typeof trace === "string") return trace;
      // Some versions return Buffer/Uint8Array; normalize.
      if (trace instanceof Uint8Array) return Buffer.from(trace).toString("utf8");
      return String(trace ?? "");
    },

    async createBranch(project, branchName, ref) {
      const effectiveRef = ref ?? (await getDefaultBranch(project));
      const branch = await api.Branches.create(project, branchName, effectiveRef);
      const sha = branch?.commit?.id ?? "";
      return {
        name: branch?.name ?? branchName,
        web_url: branch?.web_url ?? "",
        commit_sha: sha,
      };
    },

    async createCommit(project, branch, message, actions, options) {
      const commit = await api.Commits.create(project, branch, message, actions as any[], {
        startBranch: options?.startBranch,
      });
      return {
        id: commit?.id,
        short_id: commit?.short_id,
        title: commit?.title,
        message: commit?.message,
        web_url: commit?.web_url,
        created_at: commit?.created_at,
      };
    },

    async createMergeRequest(project, sourceBranch, targetBranch, title, options) {
      const effectiveTarget = targetBranch ?? (await getDefaultBranch(project));
      const mr = await api.MergeRequests.create(project, sourceBranch, effectiveTarget, title, {
        description: options?.description,
        labels: options?.labels,
        removeSourceBranch: options?.removeSourceBranch,
        assigneeId: options?.assigneeId,
        reviewerIds: options?.reviewerIds,
      });

      return {
        iid: mr?.iid,
        title: mr?.title,
        state: mr?.state,
        web_url: mr?.web_url,
        source_branch: mr?.source_branch,
        target_branch: mr?.target_branch,
        created_at: mr?.created_at,
      };
    },
  };
}
