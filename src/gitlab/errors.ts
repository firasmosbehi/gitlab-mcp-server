import { ZodError } from "zod";

export type PublicError = Readonly<{
  status?: number;
  message: string;
}>;

export function getHttpStatus(err: unknown): number | undefined {
  const e = err as any;
  return (
    e?.response?.status ??
    e?.response?.statusCode ??
    e?.status ??
    e?.statusCode ??
    e?.cause?.response?.status ??
    undefined
  );
}

export function toPublicError(err: unknown): PublicError {
  if (err instanceof ZodError) {
    const issues = err.issues
      .map((i) => {
        const path = i.path.length ? i.path.join(".") : "(root)";
        return `${path}: ${i.message}`;
      })
      .join("; ");
    return { message: `Invalid arguments: ${issues}` };
  }

  const status = getHttpStatus(err);

  if (status === 401) {
    return { status, message: "Unauthorized (401): check GITLAB_TOKEN." };
  }
  if (status === 403) {
    return { status, message: "Forbidden (403): token lacks access to this resource." };
  }
  if (status === 404) {
    return { status, message: "Not found (404): project/resource does not exist or is not accessible." };
  }
  if (status === 429) {
    return { status, message: "Rate limited (429): try again later." };
  }
  if (status !== undefined && status >= 500) {
    return { status, message: `GitLab server error (${status}).` };
  }

  const msg =
    (err as any)?.message ||
    (typeof err === "string" ? err : undefined) ||
    "Unexpected error.";
  return { status, message: msg };
}

