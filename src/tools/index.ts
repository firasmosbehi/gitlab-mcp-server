import type { ToolDef } from "./types.js";

import { gitlabGetFileTool } from "./gitlab_get_file.js";
import { gitlabGetIssueTool } from "./gitlab_get_issue.js";
import { gitlabGetJobLogTool } from "./gitlab_get_job_log.js";
import { gitlabGetMergeRequestTool } from "./gitlab_get_merge_request.js";
import { gitlabGetPipelineTool } from "./gitlab_get_pipeline.js";
import { gitlabListMergeRequestsTool } from "./gitlab_list_merge_requests.js";
import { gitlabListPipelineJobsTool } from "./gitlab_list_pipeline_jobs.js";
import { gitlabListPipelinesTool } from "./gitlab_list_pipelines.js";
import { gitlabSearchIssuesTool } from "./gitlab_search_issues.js";

export const TOOLS: ToolDef<any, any>[] = [
  gitlabSearchIssuesTool,
  gitlabGetIssueTool,
  gitlabListMergeRequestsTool,
  gitlabGetMergeRequestTool,
  gitlabGetFileTool,
  gitlabListPipelinesTool,
  gitlabGetPipelineTool,
  gitlabListPipelineJobsTool,
  gitlabGetJobLogTool,
];

