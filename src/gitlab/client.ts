import { Gitlab } from "@gitbeaker/rest";

import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";

import type { Config } from "../config.js";
import type { Logger } from "../logger.js";
import { getHttpStatus } from "./errors.js";
import { createGitLabAuthProvider } from "./oauth.js";

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

export type MergeRequestMergeResult = MergeRequestDetail &
  Readonly<{
    merged_at?: string;
    merge_commit_sha?: string;
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

export type JobLogTail = Readonly<{
  text: string;
  is_partial: boolean;
  bytes_total?: number;
  bytes_start?: number;
  bytes_end?: number;
}>;

export type NoteSummary = Readonly<{
  id: number;
  body: string;
  author_username?: string;
  author_name?: string;
  created_at: string;
  system?: boolean;
  web_url?: string;
}>;

export type CurrentUser = Readonly<{
  id: number;
  username: string;
  name: string;
  web_url?: string;
}>;

export type ProjectSummary = Readonly<{
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  default_branch?: string;
}>;

export type BranchSummary = Readonly<{
  name: string;
  default?: boolean;
  protected?: boolean;
  web_url?: string;
  commit_sha?: string;
}>;

export type TagSummary = Readonly<{
  name: string;
  message?: string;
  target?: string;
  commit_sha?: string;
}>;

export type ProjectLabelSummary = Readonly<{
  id: number;
  name: string;
  description?: string;
  color?: string;
}>;

export type MergeRequestDiscussionPosition = Readonly<{
  position_type?: string;
  base_sha?: string;
  start_sha?: string;
  head_sha?: string;
  new_path?: string;
  new_line?: number;
  old_path?: string;
  old_line?: number;
}>;

export type MergeRequestDiscussionNote = NoteSummary &
  Readonly<{
    resolved?: boolean;
    resolvable?: boolean;
    position?: MergeRequestDiscussionPosition;
  }>;

export type MergeRequestDiscussion = Readonly<{
  id: string;
  individual_note?: boolean;
  notes: MergeRequestDiscussionNote[];
}>;

export type JobArtifactsMetadata = Readonly<{
  job_id: number;
  filename?: string;
  size_bytes?: number;
  format?: string;
}>;

export type DownloadedJobArtifacts = Readonly<{
  job_id: number;
  filename: string;
  size_bytes?: number;
  downloaded_bytes: number;
  local_path: string;
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
  createIssue: (
    project: string,
    title: string,
    options?: { description?: string; labels?: string[] | string },
  ) => Promise<IssueSummary>;
  updateIssue: (
    project: string,
    iid: number,
    options: {
      title?: string;
      description?: string;
      stateEvent?: "close" | "reopen";
      labels?: string[] | string;
      addLabels?: string[] | string;
      removeLabels?: string[] | string;
    },
  ) => Promise<IssueSummary>;
  listIssueNotes: (
    project: string,
    iid: number,
    options: { page: number; per_page: number },
  ) => Promise<NoteSummary[]>;
  addIssueNote: (project: string, iid: number, body: string) => Promise<NoteSummary>;
  listMergeRequests: (params: ListMergeRequestsParams) => Promise<MergeRequestSummary[]>;
  getMergeRequest: (project: string, iid: number) => Promise<MergeRequestDetail>;
  listMergeRequestNotes: (
    project: string,
    iid: number,
    options: { page: number; per_page: number },
  ) => Promise<NoteSummary[]>;
  addMergeRequestNote: (project: string, iid: number, body: string) => Promise<NoteSummary>;
  listMergeRequestDiscussions: (
    project: string,
    iid: number,
    options: { page: number; per_page: number },
  ) => Promise<MergeRequestDiscussion[]>;
  createMergeRequestDiscussion: (
    project: string,
    iid: number,
    body: string,
    options?: {
      position?: Readonly<{
        base_sha: string;
        start_sha: string;
        head_sha: string;
        new_path?: string;
        new_line?: number;
        old_path?: string;
        old_line?: number;
      }>;
    },
  ) => Promise<MergeRequestDiscussion>;
  addMergeRequestDiscussionNote: (
    project: string,
    iid: number,
    discussionId: string,
    body: string,
  ) => Promise<MergeRequestDiscussionNote>;
  updateMergeRequestDiscussionNote: (
    project: string,
    iid: number,
    discussionId: string,
    noteId: number,
    options: { body?: string; resolved?: boolean },
  ) => Promise<MergeRequestDiscussionNote>;
  mergeMergeRequest: (
    project: string,
    iid: number,
    options?: {
      sha?: string;
      squash?: boolean;
      removeSourceBranch?: boolean;
      mergeWhenPipelineSucceeds?: boolean;
      commitMessage?: string;
    },
  ) => Promise<MergeRequestMergeResult>;

  getCurrentUser: () => Promise<CurrentUser>;
  listProjects: (options: {
    search?: string;
    membership?: boolean;
    page: number;
    per_page: number;
  }) => Promise<ProjectSummary[]>;
  getProject: (project: string) => Promise<ProjectSummary>;
  listBranches: (options: {
    project: string;
    search?: string;
    page: number;
    per_page: number;
  }) => Promise<BranchSummary[]>;
  listTags: (options: {
    project: string;
    search?: string;
    page: number;
    per_page: number;
  }) => Promise<TagSummary[]>;
  listProjectLabels: (options: {
    project: string;
    search?: string;
    page: number;
    per_page: number;
  }) => Promise<ProjectLabelSummary[]>;

  getFile: (project: string, filePath: string, ref?: string) => Promise<RepoFile>;
  listRepoTree: (params: RepoTreeParams) => Promise<RepoTreeEntry[]>;
  searchCode: (params: CodeSearchParams) => Promise<CodeSearchMatch[]>;
  getMergeRequestChanges: (project: string, iid: number) => Promise<any>;
  listPipelines: (params: ListPipelinesParams) => Promise<PipelineSummary[]>;
  getPipeline: (project: string, pipelineId: number) => Promise<PipelineDetail>;
  listPipelineJobs: (project: string, pipelineId: number) => Promise<PipelineJobSummary[]>;
  getJobLog: (project: string, jobId: number) => Promise<string>;
  getJobLogTail: (project: string, jobId: number, maxBytes: number) => Promise<JobLogTail>;
  retryJob: (project: string, jobId: number) => Promise<PipelineJobSummary>;
  cancelJob: (project: string, jobId: number) => Promise<PipelineJobSummary>;
  playJob: (project: string, jobId: number) => Promise<PipelineJobSummary>;
  retryPipeline: (project: string, pipelineId: number) => Promise<PipelineDetail>;
  cancelPipeline: (project: string, pipelineId: number) => Promise<PipelineDetail>;
  getJobArtifactsMetadata: (project: string, jobId: number) => Promise<JobArtifactsMetadata>;
  downloadJobArtifacts: (
    project: string,
    jobId: number,
    options: { maxBytes: number },
  ) => Promise<DownloadedJobArtifacts>;

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

function parseContentRange(
  value: string | null,
): Readonly<{ start: number; end: number; total?: number }> | undefined {
  if (!value) return undefined;
  const m = value.match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/);
  if (!m) return undefined;
  const start = Number(m[1]);
  const end = Number(m[2]);
  const total = m[3] === "*" ? undefined : Number(m[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  if (total !== undefined && !Number.isFinite(total)) return undefined;
  return { start, end, total };
}

function sanitizePathSegment(value: string): string {
  // Normalize user-provided project paths like "group/project" into safe filesystem segments.
  // Keep it stable and cross-platform friendly.
  const s = value.trim().slice(0, 200);
  const normalized = s.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return normalized || "project";
}

class ByteLimitTransform extends Transform {
  private seen = 0;
  constructor(private readonly maxBytes: number) {
    super();
  }

  public getBytesSeen(): number {
    return this.seen;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: any) => void,
  ) {
    const len = typeof chunk?.length === "number" ? chunk.length : 0;
    this.seen += len;
    if (this.seen > this.maxBytes) {
      callback(new Error(`Response exceeds limit of ${this.maxBytes} bytes.`));
      return;
    }
    callback(null, chunk);
  }
}

export function createGitlabFacade(config: Config, logger: Logger): GitLabFacade {
  const auth =
    config.gitlabAuthMode === "oauth"
      ? createGitLabAuthProvider(
          {
            kind: "oauth",
            host: config.gitlabHost,
            accessToken: config.gitlabOauthAccessToken,
            tokenFile: config.gitlabOauthTokenFile,
            clientId: config.gitlabOauthClientId,
            clientSecret: config.gitlabOauthClientSecret,
            redirectUri: config.gitlabOauthRedirectUri,
          },
          logger,
        )
      : createGitLabAuthProvider({ kind: "pat", token: config.gitlabToken! }, logger);

  const api: AnyGitlab = new Gitlab({
    host: config.gitlabHost,
    ...(auth.kind === "oauth" ? { oauthToken: auth.getToken } : { token: auth.getToken }),
  });

  async function fetchJson<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
    init?: RequestInit,
  ): Promise<T> {
    const base = `${config.gitlabHost}/api/v4`;
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }

    const authHeaders = await auth.getAuthHeaders();
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders,
        "User-Agent": config.gitlabUserAgent,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const snippet = text.length > 500 ? `${text.slice(0, 500)}...` : text;
      throw new GitlabFetchError(res.status, `GitLab API error (${res.status}): ${snippet}`);
    }

    return (await res.json()) as T;
  }

  async function fetchOk(
    path: string,
    query: Record<string, string | number | undefined> | undefined,
    init: RequestInit & { method: string },
  ): Promise<Response> {
    const base = `${config.gitlabHost}/api/v4`;
    const url = new URL(`${base}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }

    const authHeaders = await auth.getAuthHeaders();
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders,
        "User-Agent": config.gitlabUserAgent,
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const snippet = text.length > 500 ? `${text.slice(0, 500)}...` : text;
      throw new GitlabFetchError(res.status, `GitLab API error (${res.status}): ${snippet}`);
    }

    return res;
  }

  async function fetchJobLogTail(
    project: string,
    jobId: number,
    maxBytes: number,
  ): Promise<JobLogTail> {
    // Use Range to avoid pulling the full trace when supported.
    const res = await withRetry(logger, () =>
      fetchOk(
        `/projects/${encodeURIComponent(project)}/jobs/${jobId}/trace`,
        undefined,
        {
          method: "GET",
          headers: {
            Accept: "text/plain",
            Range: `bytes=-${maxBytes}`,
          },
        },
      ),
    );

    const contentRange = parseContentRange(res.headers.get("content-range"));
    const bytesTotal =
      contentRange?.total ??
      (() => {
        const raw = res.headers.get("content-length");
        if (!raw) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
      })();

    // Read response as bytes and keep only the last maxBytes in memory as a ring buffer.
    const body = res.body;
    if (!body) {
      return { text: "", is_partial: false, bytes_total: bytesTotal };
    }

    let totalSeen = 0;
    let tail = Buffer.alloc(0);
    const reader = Readable.fromWeb(body as any);
    for await (const chunk of reader) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalSeen += buf.length;
      if (buf.length >= maxBytes) {
        tail = buf.subarray(buf.length - maxBytes);
        continue;
      }
      if (tail.length + buf.length <= maxBytes) {
        tail = Buffer.concat([tail, buf], tail.length + buf.length);
        continue;
      }
      const combined = Buffer.concat([tail, buf], tail.length + buf.length);
      tail = combined.subarray(combined.length - maxBytes);
    }

    const isPartial =
      res.status === 206 ||
      (contentRange ? contentRange.start > 0 : totalSeen > maxBytes);

    return {
      text: tail.toString("utf8"),
      is_partial: isPartial,
      bytes_total: bytesTotal ?? (totalSeen > 0 ? totalSeen : undefined),
      bytes_start: contentRange?.start,
      bytes_end: contentRange?.end,
    };
  }

  async function downloadToFileWithLimit(
    res: Response,
    filePath: string,
    maxBytes: number,
  ): Promise<number> {
    const body = res.body;
    if (!body) throw new Error("No response body.");

    await mkdir(path.dirname(filePath), { recursive: true });

    const contentLengthRaw = res.headers.get("content-length");
    if (contentLengthRaw) {
      const n = Number(contentLengthRaw);
      if (Number.isFinite(n) && n > maxBytes) {
        throw new Error(`Artifact too large (${n} bytes). Max allowed is ${maxBytes} bytes.`);
      }
    }

    const limiter = new ByteLimitTransform(maxBytes);
    const out = createWriteStream(filePath, { flags: "w" });

    try {
      await streamPipeline(Readable.fromWeb(body as any), limiter, out);
      return limiter.getBytesSeen();
    } catch (err) {
      // Best-effort cleanup of partially written files.
      await rm(filePath, { force: true }).catch(() => undefined);
      throw err;
    }
  }

  async function getJobArtifactsMetadataInternal(
    project: string,
    jobId: number,
  ): Promise<JobArtifactsMetadata> {
    const job = await withRetry<any>(logger, () =>
      fetchJson<any>(`/projects/${encodeURIComponent(project)}/jobs/${jobId}`),
    );
    const file = job?.artifacts_file ?? undefined;
    const filename = typeof file?.filename === "string" ? file.filename : undefined;
    const sizeBytes = typeof file?.size === "number" ? file.size : undefined;
    const format = typeof file?.format === "string" ? file.format : undefined;

    return {
      job_id: jobId,
      filename,
      size_bytes: sizeBytes,
      format,
    };
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

  function mapNote(n: any): NoteSummary {
    const author = n?.author;
    const id = typeof n?.id === "number" ? n.id : Number(n?.id);
    return {
      id: Number.isFinite(id) ? id : 0,
      body: typeof n?.body === "string" ? n.body : "",
      author_username: typeof author?.username === "string" ? author.username : undefined,
      author_name: typeof author?.name === "string" ? author.name : undefined,
      created_at: typeof n?.created_at === "string" ? n.created_at : "",
      system: typeof n?.system === "boolean" ? n.system : undefined,
      web_url:
        typeof n?.web_url === "string"
          ? n.web_url
          : typeof n?.url === "string"
            ? n.url
            : undefined,
    };
  }

  function mapDiscussionPosition(p: any): MergeRequestDiscussionPosition | undefined {
    if (!p || typeof p !== "object") return undefined;

    const out: MergeRequestDiscussionPosition = {
      position_type: typeof p.position_type === "string" ? p.position_type : undefined,
      base_sha: typeof p.base_sha === "string" ? p.base_sha : undefined,
      start_sha: typeof p.start_sha === "string" ? p.start_sha : undefined,
      head_sha: typeof p.head_sha === "string" ? p.head_sha : undefined,
      new_path: typeof p.new_path === "string" ? p.new_path : undefined,
      new_line: typeof p.new_line === "number" ? p.new_line : undefined,
      old_path: typeof p.old_path === "string" ? p.old_path : undefined,
      old_line: typeof p.old_line === "number" ? p.old_line : undefined,
    };

    const hasAny = Object.values(out).some((v) => v !== undefined);
    return hasAny ? out : undefined;
  }

  function mapDiscussionNote(n: any): MergeRequestDiscussionNote {
    const base = mapNote(n);
    return {
      ...base,
      resolved: typeof n?.resolved === "boolean" ? n.resolved : undefined,
      resolvable: typeof n?.resolvable === "boolean" ? n.resolvable : undefined,
      position: mapDiscussionPosition(n?.position),
    };
  }

  function mapDiscussion(d: any): MergeRequestDiscussion {
    const id = typeof d?.id === "string" ? d.id : String(d?.id ?? "");
    const notes = Array.isArray(d?.notes) ? d.notes.map(mapDiscussionNote) : [];
    return {
      id,
      individual_note: typeof d?.individual_note === "boolean" ? d.individual_note : undefined,
      notes,
    };
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
          maxPages: 1,
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

    async createIssue(project, title, options) {
      const payload: any = { title };
      if (options?.description !== undefined) payload.description = options.description;
      if (options?.labels !== undefined) {
        payload.labels = Array.isArray(options.labels) ? options.labels.join(",") : options.labels;
      }

      const issue = await withRetry<any>(logger, () =>
        fetchJson<any>(`/projects/${encodeURIComponent(project)}/issues`, undefined, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      return {
        iid: issue.iid,
        title: issue.title,
        state: issue.state,
        labels: Array.isArray(issue.labels) ? issue.labels : [],
        web_url: issue.web_url,
        updated_at: issue.updated_at,
      };
    },

    async updateIssue(project, iid, options) {
      const payload: any = {};
      if (options.title !== undefined) payload.title = options.title;
      if (options.description !== undefined) payload.description = options.description;
      if (options.stateEvent !== undefined) payload.state_event = options.stateEvent;
      if (options.labels !== undefined) {
        payload.labels = Array.isArray(options.labels) ? options.labels.join(",") : options.labels;
      }
      if (options.addLabels !== undefined) {
        payload.add_labels = Array.isArray(options.addLabels)
          ? options.addLabels.join(",")
          : options.addLabels;
      }
      if (options.removeLabels !== undefined) {
        payload.remove_labels = Array.isArray(options.removeLabels)
          ? options.removeLabels.join(",")
          : options.removeLabels;
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("No updates provided.");
      }

      const issue = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/issues/${encodeURIComponent(String(iid))}`,
          undefined,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
      );

      return {
        iid: issue.iid,
        title: issue.title,
        state: issue.state,
        labels: Array.isArray(issue.labels) ? issue.labels : [],
        web_url: issue.web_url,
        updated_at: issue.updated_at,
      };
    },

    async listIssueNotes(project, iid, options) {
      const notes = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(project)}/issues/${encodeURIComponent(String(iid))}/notes`,
          { page: options.page, per_page: options.per_page },
        ),
      );
      return notes.map(mapNote);
    },

    async addIssueNote(project, iid, body) {
      const note = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/issues/${encodeURIComponent(String(iid))}/notes`,
          undefined,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          },
        ),
      );
      return mapNote(note);
    },

    async listMergeRequests(params) {
      const mrs = await withRetry(logger, async () => {
        return api.MergeRequests.all({
          projectId: params.project,
          state: params.state,
          search: params.search,
          page: params.page,
          perPage: params.per_page,
          maxPages: 1,
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

    async listMergeRequestNotes(project, iid, options) {
      const notes = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(String(iid))}/notes`,
          { page: options.page, per_page: options.per_page },
        ),
      );
      return notes.map(mapNote);
    },

    async addMergeRequestNote(project, iid, body) {
      const note = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(String(iid))}/notes`,
          undefined,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          },
        ),
      );
      return mapNote(note);
    },

    async listMergeRequestDiscussions(project, iid, options) {
      const discussions = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(String(iid))}/discussions`,
          { page: options.page, per_page: options.per_page },
        ),
      );
      return discussions.map(mapDiscussion);
    },

    async createMergeRequestDiscussion(project, iid, body, options) {
      const payload: any = { body };
      if (options?.position) {
        payload.position = {
          position_type: "text",
          base_sha: options.position.base_sha,
          start_sha: options.position.start_sha,
          head_sha: options.position.head_sha,
          new_path: options.position.new_path,
          new_line: options.position.new_line,
          old_path: options.position.old_path,
          old_line: options.position.old_line,
        };
      }

      const discussion = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(String(iid))}/discussions`,
          undefined,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
      );
      return mapDiscussion(discussion);
    },

    async addMergeRequestDiscussionNote(project, iid, discussionId, body) {
      const note = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(
            String(iid),
          )}/discussions/${encodeURIComponent(discussionId)}/notes`,
          undefined,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body }),
          },
        ),
      );
      return mapDiscussionNote(note);
    },

    async updateMergeRequestDiscussionNote(project, iid, discussionId, noteId, options) {
      const payload: any = {};
      if (options.body !== undefined) payload.body = options.body;
      if (options.resolved !== undefined) payload.resolved = options.resolved;

      if (Object.keys(payload).length === 0) {
        throw new Error("No updates provided.");
      }

      const note = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(
            String(iid),
          )}/discussions/${encodeURIComponent(discussionId)}/notes/${encodeURIComponent(
            String(noteId),
          )}`,
          undefined,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
      );
      return mapDiscussionNote(note);
    },

    async mergeMergeRequest(project, iid, options) {
      const mr = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/merge_requests/${encodeURIComponent(String(iid))}/merge`,
          {
            sha: options?.sha,
            squash:
              options?.squash === undefined ? undefined : options.squash ? "true" : "false",
            should_remove_source_branch:
              options?.removeSourceBranch === undefined
                ? undefined
                : options.removeSourceBranch
                  ? "true"
                  : "false",
            merge_when_pipeline_succeeds:
              options?.mergeWhenPipelineSucceeds === undefined
                ? undefined
                : options.mergeWhenPipelineSucceeds
                  ? "true"
                  : "false",
            merge_commit_message: options?.commitMessage,
          },
          { method: "PUT" },
        ),
      );

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
        merged_at: typeof mr.merged_at === "string" ? mr.merged_at : undefined,
        merge_commit_sha: typeof mr.merge_commit_sha === "string" ? mr.merge_commit_sha : undefined,
      };
    },

    async getCurrentUser() {
      const user = await withRetry<any>(logger, () => fetchJson<any>(`/user`));
      const id = typeof user?.id === "number" ? user.id : Number(user?.id);
      return {
        id: Number.isFinite(id) ? id : 0,
        username: user?.username ?? "",
        name: user?.name ?? "",
        web_url: user?.web_url,
      };
    },

    async listProjects(options) {
      const projects = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(`/projects`, {
          search: options.search,
          membership: options.membership ? "true" : undefined,
          simple: "true",
          order_by: "last_activity_at",
          sort: "desc",
          page: options.page,
          per_page: options.per_page,
        }),
      );

      return projects.map((p) => {
        const id = typeof p?.id === "number" ? p.id : Number(p?.id);
        return {
          id: Number.isFinite(id) ? id : 0,
          name: p?.name ?? "",
          path_with_namespace: p?.path_with_namespace ?? "",
          web_url: p?.web_url ?? "",
          default_branch: typeof p?.default_branch === "string" ? p.default_branch : undefined,
        };
      });
    },

    async getProject(project) {
      const p = await withRetry<any>(logger, () => api.Projects.show(project));
      const id = typeof p?.id === "number" ? p.id : Number(p?.id);
      return {
        id: Number.isFinite(id) ? id : 0,
        name: p?.name ?? "",
        path_with_namespace: p?.path_with_namespace ?? "",
        web_url: p?.web_url ?? "",
        default_branch: typeof p?.default_branch === "string" ? p.default_branch : undefined,
      };
    },

    async listBranches(options) {
      const branches = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(options.project)}/repository/branches`,
          {
            search: options.search,
            page: options.page,
            per_page: options.per_page,
          },
        ),
      );

      return branches.map((b) => ({
        name: b?.name ?? "",
        default: typeof b?.default === "boolean" ? b.default : undefined,
        protected: typeof b?.protected === "boolean" ? b.protected : undefined,
        web_url: typeof b?.web_url === "string" ? b.web_url : undefined,
        commit_sha: typeof b?.commit?.id === "string" ? b.commit.id : undefined,
      }));
    },

    async listTags(options) {
      const tags = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(options.project)}/repository/tags`,
          {
            search: options.search,
            page: options.page,
            per_page: options.per_page,
          },
        ),
      );

      return tags.map((t) => ({
        name: t?.name ?? "",
        message: typeof t?.message === "string" ? t.message : undefined,
        target: typeof t?.target === "string" ? t.target : undefined,
        commit_sha: typeof t?.commit?.id === "string" ? t.commit.id : undefined,
      }));
    },

    async listProjectLabels(options) {
      const labels = await withRetry<any[]>(logger, () =>
        fetchJson<any[]>(
          `/projects/${encodeURIComponent(options.project)}/labels`,
          {
            search: options.search,
            page: options.page,
            per_page: options.per_page,
          },
        ),
      );

      return labels.map((l) => {
        const id = typeof l?.id === "number" ? l.id : Number(l?.id);
        return {
          id: Number.isFinite(id) ? id : 0,
          name: l?.name ?? "",
          description: typeof l?.description === "string" ? l.description : undefined,
          color: typeof l?.color === "string" ? l.color : undefined,
        };
      });
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
          maxPages: 1,
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

    async getJobLogTail(project, jobId, maxBytes) {
      return fetchJobLogTail(project, jobId, maxBytes);
    },

    async retryJob(project, jobId) {
      const j = await withRetry<any>(logger, () =>
        fetchJson<any>(`/projects/${encodeURIComponent(project)}/jobs/${jobId}/retry`, undefined, {
          method: "POST",
        }),
      );
      return {
        id: j.id,
        name: j.name,
        stage: j.stage,
        status: j.status,
        web_url: j.web_url,
        started_at: j.started_at ?? null,
        finished_at: j.finished_at ?? null,
      };
    },

    async cancelJob(project, jobId) {
      const j = await withRetry<any>(logger, () =>
        fetchJson<any>(`/projects/${encodeURIComponent(project)}/jobs/${jobId}/cancel`, undefined, {
          method: "POST",
        }),
      );
      return {
        id: j.id,
        name: j.name,
        stage: j.stage,
        status: j.status,
        web_url: j.web_url,
        started_at: j.started_at ?? null,
        finished_at: j.finished_at ?? null,
      };
    },

    async playJob(project, jobId) {
      const j = await withRetry<any>(logger, () =>
        fetchJson<any>(`/projects/${encodeURIComponent(project)}/jobs/${jobId}/play`, undefined, {
          method: "POST",
        }),
      );
      return {
        id: j.id,
        name: j.name,
        stage: j.stage,
        status: j.status,
        web_url: j.web_url,
        started_at: j.started_at ?? null,
        finished_at: j.finished_at ?? null,
      };
    },

    async retryPipeline(project, pipelineId) {
      const p = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/pipelines/${pipelineId}/retry`,
          undefined,
          { method: "POST" },
        ),
      );
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

    async cancelPipeline(project, pipelineId) {
      const p = await withRetry<any>(logger, () =>
        fetchJson<any>(
          `/projects/${encodeURIComponent(project)}/pipelines/${pipelineId}/cancel`,
          undefined,
          { method: "POST" },
        ),
      );
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

    async getJobArtifactsMetadata(project, jobId) {
      return getJobArtifactsMetadataInternal(project, jobId);
    },

    async downloadJobArtifacts(project, jobId, options) {
      const meta = await getJobArtifactsMetadataInternal(project, jobId);
      if (!meta.filename) {
        throw new Error("No artifacts found for this job (artifacts_file.filename is missing).");
      }
      if (meta.size_bytes !== undefined && meta.size_bytes > options.maxBytes) {
        throw new Error(
          `Artifacts too large (${meta.size_bytes} bytes). Max allowed is ${options.maxBytes} bytes.`,
        );
      }

      const projectDir = sanitizePathSegment(project);
      const filenameSafe = sanitizePathSegment(meta.filename);
      const targetDir = path.join(tmpdir(), "gitlab-mcp-server", "artifacts", projectDir);
      const targetPath = path.join(targetDir, `${jobId}-${filenameSafe}`);

      const res = await withRetry(logger, () =>
        fetchOk(
          `/projects/${encodeURIComponent(project)}/jobs/${jobId}/artifacts`,
          undefined,
          {
            method: "GET",
            headers: { Accept: "application/octet-stream" },
          },
        ),
      );

      const downloaded = await downloadToFileWithLimit(res, targetPath, options.maxBytes);

      return {
        job_id: jobId,
        filename: meta.filename,
        size_bytes: meta.size_bytes,
        downloaded_bytes: downloaded,
        local_path: targetPath,
      };
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
