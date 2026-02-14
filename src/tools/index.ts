import type { ToolDef } from "./types.js";

import { gitlabCreateBranchTool } from "./gitlab_create_branch.js";
import { gitlabCreateCommitTool } from "./gitlab_create_commit.js";
import { gitlabCreateMergeRequestTool } from "./gitlab_create_merge_request.js";
import { gitlabGetFileTool } from "./gitlab_get_file.js";
import { gitlabGetIssueTool } from "./gitlab_get_issue.js";
import { gitlabGetJobLogTool } from "./gitlab_get_job_log.js";
import { gitlabGetMergeRequestChangesTool } from "./gitlab_get_merge_request_changes.js";
import { gitlabGetMergeRequestTool } from "./gitlab_get_merge_request.js";
import { gitlabGetPipelineTool } from "./gitlab_get_pipeline.js";
import { gitlabListMergeRequestsTool } from "./gitlab_list_merge_requests.js";
import { gitlabListPipelineJobsTool } from "./gitlab_list_pipeline_jobs.js";
import { gitlabListPipelinesTool } from "./gitlab_list_pipelines.js";
import { gitlabListRepoTreeTool } from "./gitlab_list_repo_tree.js";
import { gitlabSearchIssuesTool } from "./gitlab_search_issues.js";
import { gitlabSearchCodeTool } from "./gitlab_search_code.js";

export const TOOLS: ToolDef<any, any>[] = [
  gitlabSearchIssuesTool,
  gitlabGetIssueTool,
  gitlabListMergeRequestsTool,
  gitlabGetMergeRequestTool,
  gitlabGetFileTool,
  gitlabListRepoTreeTool,
  gitlabSearchCodeTool,
  gitlabListPipelinesTool,
  gitlabGetPipelineTool,
  gitlabListPipelineJobsTool,
  gitlabGetJobLogTool,
  gitlabGetMergeRequestChangesTool,

  // Write tools (guarded by read-only mode / allowlists)
  gitlabCreateBranchTool,
  gitlabCreateCommitTool,
  gitlabCreateMergeRequestTool,
];
