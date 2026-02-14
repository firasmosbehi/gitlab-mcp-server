type PromptArgument = Readonly<{
  name: string;
  description?: string;
  required?: boolean;
}>;

type PromptDef = Readonly<{
  name: string;
  title?: string;
  description?: string;
  arguments?: PromptArgument[];
  render: (args: Record<string, string>) => string;
}>;

function requireArg(args: Record<string, string> | undefined, name: string): string {
  const v = args?.[name];
  if (!v) throw new Error(`Missing required prompt argument: '${name}'.`);
  return v;
}

const PROMPTS: PromptDef[] = [
  {
    name: "triage_issue",
    title: "Triage Issue",
    description: "Triage a GitLab issue into a clear summary, likely cause, and next actions.",
    arguments: [
      { name: "project", description: "Project ID or group/project path.", required: true },
      { name: "iid", description: "Issue IID (project-scoped).", required: true },
    ],
    render: (args) => {
      const project = requireArg(args, "project");
      const iid = requireArg(args, "iid");
      return [
        `Triage GitLab issue ${project}#${iid}.`,
        "",
        "Use tools:",
        `- gitlab_get_issue { project: \"${project}\", iid: ${iid} }`,
        "- gitlab_search_issues (optional) for duplicates/related issues",
        "- gitlab_get_file (optional) for referenced paths",
        "",
        "Deliverables:",
        "1) 1-2 sentence problem summary.",
        "2) Current behavior vs expected behavior.",
        "3) Suspected root cause with code pointers (files/functions) if possible.",
        "4) Minimal repro steps (or what info is missing).",
        "5) Proposed fix approach and tests to add.",
      ].join("\n");
    },
  },
  {
    name: "review_merge_request",
    title: "Review Merge Request",
    description: "Summarize and review a GitLab merge request with a bounded diff context.",
    arguments: [
      { name: "project", description: "Project ID or group/project path.", required: true },
      { name: "iid", description: "Merge request IID (project-scoped).", required: true },
    ],
    render: (args) => {
      const project = requireArg(args, "project");
      const iid = requireArg(args, "iid");
      return [
        `Review GitLab merge request ${project}!${iid}.`,
        "",
        "Use tools:",
        `- gitlab_get_merge_request { project: \"${project}\", iid: ${iid} }`,
        `- gitlab_get_merge_request_changes { project: \"${project}\", iid: ${iid} }`,
        "",
        "Deliverables:",
        "1) Summary of changes and intent.",
        "2) Risk assessment (breaking changes, data migrations, security).",
        "3) Review comments: correctness, edge cases, error handling, tests.",
        "4) Suggested follow-ups (docs, refactors).",
      ].join("\n");
    },
  },
  {
    name: "debug_ci_job",
    title: "Debug CI Job",
    description: "Diagnose a failing GitLab CI job using bounded job logs.",
    arguments: [
      { name: "project", description: "Project ID or group/project path.", required: true },
      { name: "job_id", description: "CI job ID.", required: true },
    ],
    render: (args) => {
      const project = requireArg(args, "project");
      const jobId = requireArg(args, "job_id");
      return [
        `Debug GitLab CI job ${jobId} in project ${project}.`,
        "",
        "Use tools:",
        `- gitlab_get_job_log_tail { project: \"${project}\", job_id: ${jobId} }`,
        `- gitlab_search_job_log (optional) to find errors quickly`,
        `- gitlab_get_job_log (optional) for a larger slice (bounded by max_chars)`,
        "",
        "Deliverables:",
        "1) Identify the failing step and error signature.",
        "2) Likely root cause and where in code/config to look.",
        "3) Concrete fix suggestion and tests/validation steps.",
        "4) If output is truncated/partial, increase max_bytes or narrow search.",
      ].join("\n");
    },
  },
];

export function listPrompts(): Array<{
  name: string;
  title?: string;
  description?: string;
  arguments?: PromptArgument[];
}> {
  return PROMPTS.map((p) => ({
    name: p.name,
    title: p.title,
    description: p.description,
    arguments: p.arguments,
  }));
}

export function getPrompt(
  name: string,
  args?: Record<string, string>,
): { description?: string; messages: Array<{ role: "user"; content: { type: "text"; text: string } }> } {
  const p = PROMPTS.find((x) => x.name === name);
  if (!p) throw new Error(`Unknown prompt: ${name}`);

  const text = p.render(args ?? {});
  return {
    description: p.description,
    messages: [{ role: "user", content: { type: "text", text } }],
  };
}
