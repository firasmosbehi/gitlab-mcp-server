import type { ToolDef } from "./types.js";

import { gitlabAddIssueNoteTool } from "./gitlab_add_issue_note.js";
import { gitlabAddMergeRequestNoteTool } from "./gitlab_add_merge_request_note.js";
import { gitlabAddMergeRequestDiscussionNoteTool } from "./gitlab_add_merge_request_discussion_note.js";
import { gitlabApproveMergeRequestTool } from "./gitlab_approve_merge_request.js";
import { gitlabCreateBranchTool } from "./gitlab_create_branch.js";
import { gitlabCreateCommitTool } from "./gitlab_create_commit.js";
import { gitlabCreateIssueTool } from "./gitlab_create_issue.js";
import { gitlabCreateMergeRequestDiscussionTool } from "./gitlab_create_merge_request_discussion.js";
import { gitlabCreateMergeRequestTool } from "./gitlab_create_merge_request.js";
import { gitlabCancelJobTool } from "./gitlab_cancel_job.js";
import { gitlabCancelPipelineTool } from "./gitlab_cancel_pipeline.js";
import { gitlabDownloadJobArtifactsTool } from "./gitlab_download_job_artifacts.js";
import { gitlabGetFileTool } from "./gitlab_get_file.js";
import { gitlabGetCurrentUserTool } from "./gitlab_get_current_user.js";
import { gitlabGetIssueTool } from "./gitlab_get_issue.js";
import { gitlabGetJobArtifactsTool } from "./gitlab_get_job_artifacts.js";
import { gitlabGetJobLogTool } from "./gitlab_get_job_log.js";
import { gitlabGetJobLogTailTool } from "./gitlab_get_job_log_tail.js";
import { gitlabGetMergeRequestChangesTool } from "./gitlab_get_merge_request_changes.js";
import { gitlabGetMergeRequestTool } from "./gitlab_get_merge_request.js";
import { gitlabGetPipelineTool } from "./gitlab_get_pipeline.js";
import { gitlabGetProjectTool } from "./gitlab_get_project.js";
import { gitlabListIssueNotesTool } from "./gitlab_list_issue_notes.js";
import { gitlabListMergeRequestsTool } from "./gitlab_list_merge_requests.js";
import { gitlabListMergeRequestDiscussionsTool } from "./gitlab_list_merge_request_discussions.js";
import { gitlabListMergeRequestNotesTool } from "./gitlab_list_merge_request_notes.js";
import { gitlabListPipelineJobsTool } from "./gitlab_list_pipeline_jobs.js";
import { gitlabListPipelinesTool } from "./gitlab_list_pipelines.js";
import { gitlabListBranchesTool } from "./gitlab_list_branches.js";
import { gitlabListProjectLabelsTool } from "./gitlab_list_project_labels.js";
import { gitlabListProjectsTool } from "./gitlab_list_projects.js";
import { gitlabListRepoTreeTool } from "./gitlab_list_repo_tree.js";
import { gitlabListTagsTool } from "./gitlab_list_tags.js";
import { gitlabMergeMergeRequestTool } from "./gitlab_merge_merge_request.js";
import { gitlabPlayJobTool } from "./gitlab_play_job.js";
import { gitlabRetryJobTool } from "./gitlab_retry_job.js";
import { gitlabRetryPipelineTool } from "./gitlab_retry_pipeline.js";
import { gitlabSearchJobLogTool } from "./gitlab_search_job_log.js";
import { gitlabSearchIssuesTool } from "./gitlab_search_issues.js";
import { gitlabSearchCodeTool } from "./gitlab_search_code.js";
import { gitlabUpdateIssueTool } from "./gitlab_update_issue.js";
import { gitlabUpdateMergeRequestDiscussionNoteTool } from "./gitlab_update_merge_request_discussion_note.js";
import { gitlabUpdateMergeRequestTool } from "./gitlab_update_merge_request.js";
import { gitlabUnapproveMergeRequestTool } from "./gitlab_unapprove_merge_request.js";

export const TOOLS: ToolDef<any, any>[] = [
  gitlabGetCurrentUserTool,
  gitlabListProjectsTool,
  gitlabGetProjectTool,
  gitlabListBranchesTool,
  gitlabListTagsTool,
  gitlabListProjectLabelsTool,

  gitlabSearchIssuesTool,
  gitlabGetIssueTool,
  gitlabListIssueNotesTool,
  gitlabListMergeRequestsTool,
  gitlabGetMergeRequestTool,
  gitlabListMergeRequestNotesTool,
  gitlabListMergeRequestDiscussionsTool,
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
  gitlabCreateIssueTool,
  gitlabUpdateIssueTool,
  gitlabUpdateMergeRequestTool,
  gitlabAddIssueNoteTool,
  gitlabAddMergeRequestNoteTool,
  gitlabCreateMergeRequestDiscussionTool,
  gitlabAddMergeRequestDiscussionNoteTool,
  gitlabUpdateMergeRequestDiscussionNoteTool,
  gitlabApproveMergeRequestTool,
  gitlabUnapproveMergeRequestTool,
  gitlabMergeMergeRequestTool,
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
