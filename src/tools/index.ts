import type { ToolDef } from "./types.js";

import { gitlabCreateBranchTool } from "./gitlab_create_branch.js";
import { gitlabCreateCommitTool } from "./gitlab_create_commit.js";
import { gitlabCreateMergeRequestTool } from "./gitlab_create_merge_request.js";
import { gitlabCancelJobTool } from "./gitlab_cancel_job.js";
import { gitlabCancelPipelineTool } from "./gitlab_cancel_pipeline.js";
import { gitlabDownloadJobArtifactsTool } from "./gitlab_download_job_artifacts.js";
import { gitlabGetFileTool } from "./gitlab_get_file.js";
import { gitlabGetIssueTool } from "./gitlab_get_issue.js";
import { gitlabGetJobArtifactsTool } from "./gitlab_get_job_artifacts.js";
import { gitlabGetJobLogTool } from "./gitlab_get_job_log.js";
import { gitlabGetJobLogTailTool } from "./gitlab_get_job_log_tail.js";
import { gitlabGetMergeRequestChangesTool } from "./gitlab_get_merge_request_changes.js";
import { gitlabGetMergeRequestTool } from "./gitlab_get_merge_request.js";
import { gitlabGetPipelineTool } from "./gitlab_get_pipeline.js";
import { gitlabListMergeRequestsTool } from "./gitlab_list_merge_requests.js";
import { gitlabListPipelineJobsTool } from "./gitlab_list_pipeline_jobs.js";
import { gitlabListPipelinesTool } from "./gitlab_list_pipelines.js";
import { gitlabListRepoTreeTool } from "./gitlab_list_repo_tree.js";
import { gitlabPlayJobTool } from "./gitlab_play_job.js";
import { gitlabRetryJobTool } from "./gitlab_retry_job.js";
import { gitlabRetryPipelineTool } from "./gitlab_retry_pipeline.js";
import { gitlabSearchJobLogTool } from "./gitlab_search_job_log.js";
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
  gitlabGetJobLogTailTool,
  gitlabSearchJobLogTool,
  gitlabGetJobArtifactsTool,
  gitlabDownloadJobArtifactsTool,
  gitlabGetMergeRequestChangesTool,

  // Write tools (guarded by read-only mode / allowlists)
  gitlabCreateBranchTool,
  gitlabCreateCommitTool,
  gitlabCreateMergeRequestTool,

  // CI write tools (guarded by read-only mode / allowlists)
  gitlabRetryJobTool,
  gitlabCancelJobTool,
  gitlabPlayJobTool,
  gitlabRetryPipelineTool,
  gitlabCancelPipelineTool,
];
