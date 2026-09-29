/** Whether the note at `path` is inside one of `folders`, at any depth. */
export function isExcluded(path: string, folders: string[]): boolean {
  return folders.some((folder) => path.startsWith(folder + "/"));
}

/**
 * `folders` after the folder at `oldPath` was renamed or moved to `newPath`,
 * or the same array when none of them was inside it.
 */
export function renameFolder(folders: string[], oldPath: string, newPath: string): string[] {
  let changed = false;
  const renamed = folders.map((folder) => {
    if (folder !== oldPath && !folder.startsWith(oldPath + "/")) return folder;
    changed = true;
    return newPath + folder.slice(oldPath.length);
  });
  return changed ? renamed : folders;
}
