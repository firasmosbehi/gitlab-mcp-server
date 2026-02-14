import type { ToolContext } from "../tools/types.js";
import {
  DEFAULT_MAX_FILE_CHARS,
  DEFAULT_MAX_JOB_LOG_CHARS,
  MAX_JOB_LOG_CHARS_CAP,
  truncateText,
} from "../tools/common.js";

type TextContent = Readonly<{
  uri: string;
  mimeType?: string;
  text: string;
}>;

export function listGitlabResources(): Array<{
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
}> {
  return [
    {
      uri: "gitlab://help",
      name: "gitlab_help",
      title: "GitLab MCP Resource Help",
      description: "How to use gitlab:// resources exposed by this server.",
      mimeType: "text/plain",
    },
  ];
}

export function listGitlabResourceTemplates(): Array<{
  name: string;
  title?: string;
  description?: string;
  uriTemplate: string;
  mimeType?: string;
}> {
  return [
    {
      name: "gitlab_file",
      title: "GitLab File",
      description: "Read a repo file at a ref. project can be numeric id or group/project path.",
      uriTemplate: "gitlab://file?project={project}&ref={ref}&path={path}",
      mimeType: "text/plain",
    },
    {
      name: "gitlab_job_log",
      title: "GitLab Job Log",
      description: "Read a CI job log (trace).",
      uriTemplate: "gitlab://job-log?project={project}&job_id={job_id}&max_chars={max_chars}",
      mimeType: "text/plain",
    },
  ];
}

function requireParam(url: URL, key: string): string {
  const value = url.searchParams.get(key);
  if (!value) throw new Error(`Missing required query parameter: '${key}'.`);
  return value;
}

function parsePositiveInt(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Invalid '${name}': must be a positive integer.`);
  return n;
}

export async function readGitlabResource(uri: string, ctx: ToolContext): Promise<TextContent[]> {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  if (url.protocol !== "gitlab:") {
    throw new Error(`Unsupported resource scheme: ${url.protocol}`);
  }

  if (url.hostname === "help") {
    const text = [
      "gitlab:// resources",
      "",
      "1) Repo file:",
      "  gitlab://file?project=<group%2Fproject>&ref=<branch>&path=<repo%2Fpath>",
      "",
      "  Examples:",
      "  - gitlab://file?project=gitlab-org%2Fgitlab&ref=master&path=README.md",
      "  - gitlab://file?project=12345&ref=main&path=src%2Findex.ts",
      "",
      "2) Job log:",
      "  gitlab://job-log?project=<group%2Fproject>&job_id=<id>&max_chars=<optional>",
      "",
      "Notes:",
      "- Values should be URL-encoded as needed.",
      `- File contents are truncated to ${DEFAULT_MAX_FILE_CHARS} chars by default.`,
      `- Job logs are truncated to ${DEFAULT_MAX_JOB_LOG_CHARS} chars by default (cap ${MAX_JOB_LOG_CHARS_CAP}).`,
    ].join("\n");

    return [{ uri, mimeType: "text/plain", text }];
  }

  if (url.hostname === "file") {
    const project = requireParam(url, "project");
    const path = requireParam(url, "path");
    const ref = url.searchParams.get("ref") ?? undefined;

    const file = await ctx.gitlab.getFile(project, path, ref);
    const t = truncateText(file.content, DEFAULT_MAX_FILE_CHARS);

    const header = `${file.file_path} @ ${file.ref}\n`;
    return [
      {
        uri,
        mimeType: "text/plain",
        text: `${header}\n${t.text}`,
      },
    ];
  }

  if (url.hostname === "job-log") {
    const project = requireParam(url, "project");
    const jobId = parsePositiveInt(requireParam(url, "job_id"), "job_id");
    const maxCharsRaw = url.searchParams.get("max_chars");
    const maxChars = maxCharsRaw ? parsePositiveInt(maxCharsRaw, "max_chars") : DEFAULT_MAX_JOB_LOG_CHARS;
    const boundedMaxChars = Math.min(MAX_JOB_LOG_CHARS_CAP, maxChars);

    const log = await ctx.gitlab.getJobLog(project, jobId);
    const t = truncateText(log, boundedMaxChars);
    return [{ uri, mimeType: "text/plain", text: t.text }];
  }

  throw new Error(`Unknown gitlab resource type: ${url.hostname}`);
}

