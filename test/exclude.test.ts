import { test } from "node:test";
import assert from "node:assert/strict";
import { isExcluded, renameFolder } from "../src/exclude";

test("notes inside an excluded folder are excluded, at any depth", () => {
  const folders = ["Templates", "Archive/English"];
  assert.equal(isExcluded("Templates/Daily.md", folders), true);
  assert.equal(isExcluded("Archive/English/2024/Notes.md", folders), true);
});

test("notes outside excluded folders are not", () => {
  const folders = ["Templates", "Archive/English"];
  assert.equal(isExcluded("Templates.md", folders), false);
  assert.equal(isExcluded("TemplatesOld/Daily.md", folders), false);
  assert.equal(isExcluded("Archive/Persian/Notes.md", folders), false);
  assert.equal(isExcluded("Notes/Templates/Daily.md", folders), false);
  assert.equal(isExcluded("Daily.md", []), false);
});

test("renaming an excluded folder, or one above it, updates the list", () => {
  const folders = ["Templates", "Archive/English"];
  assert.deepEqual(renameFolder(folders, "Templates", "Meta/Templates"), ["Meta/Templates", "Archive/English"]);
  assert.deepEqual(renameFolder(folders, "Archive", "Old"), ["Templates", "Old/English"]);
});

test("renaming an unrelated folder leaves the list as it is", () => {
  const folders = ["Templates", "Archive/English"];
  assert.equal(renameFolder(folders, "Temp", "Scratch"), folders);
  assert.equal(renameFolder(folders, "Archive/English/2024", "2024"), folders);
});
