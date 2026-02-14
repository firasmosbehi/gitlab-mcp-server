function hasNul(s: string): boolean {
  return s.includes("\u0000");
}

export function assertValidRepoFilePath(filePath: string): void {
  if (!filePath || !filePath.trim()) throw new Error("file_path must be non-empty.");
  if (hasNul(filePath)) throw new Error("file_path must not contain NUL bytes.");
  if (filePath.startsWith("/")) throw new Error("file_path must be repository-relative (no leading '/').");
  if (filePath.includes("\\")) throw new Error("file_path must use '/' separators (no backslashes).");
  if (filePath.includes("//")) throw new Error("file_path must not contain '//' sequences.");

  const parts = filePath.split("/");
  for (const part of parts) {
    if (!part) throw new Error("file_path must not contain empty path segments.");
    if (part === "." || part === "..") throw new Error("file_path must not contain '.' or '..' segments.");
  }
}

