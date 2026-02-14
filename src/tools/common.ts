import { z } from "zod";

export const PageSchema = z.number().int().min(1).default(1);
export const PerPageSchema = z.number().int().min(1).max(100).default(20);

export function truncateText(
  text: string,
  maxChars: number,
): Readonly<{ text: string; truncated: boolean; original_length: number }> {
  const original = text.length;
  if (original <= maxChars) return { text, truncated: false, original_length: original };
  const clipped = text.slice(0, Math.max(0, maxChars));
  const suffix = `\n\n[truncated: original_length=${original} max_chars=${maxChars}]`;
  return { text: `${clipped}${suffix}`, truncated: true, original_length: original };
}

export const DEFAULT_MAX_DESCRIPTION_CHARS = 20_000;
export const DEFAULT_MAX_JOB_LOG_CHARS = 50_000;
export const MAX_JOB_LOG_CHARS_CAP = 200_000;
export const DEFAULT_MAX_FILE_CHARS = 200_000;

// CI log ergonomics (tail/search tools)
export const DEFAULT_JOB_LOG_TAIL_LINES = 200;
export const DEFAULT_JOB_LOG_TAIL_MAX_BYTES = 200_000;
export const MAX_JOB_LOG_TAIL_MAX_BYTES_CAP = 2_000_000;

// Artifacts
export const DEFAULT_MAX_ARTIFACT_BYTES = 10_000_000; // 10 MB
export const MAX_ARTIFACT_BYTES_CAP = 50_000_000; // 50 MB
