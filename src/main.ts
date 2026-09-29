import { MarkdownView, Notice, Plugin, TAbstractFile, TFolder, debounce } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { editorExtension, refreshEffect } from "./editor";
import { isExcluded, renameFolder } from "./exclude";
import { applyReadingDirection } from "./reading";
import { DEFAULT_SETTINGS, SmartRtlSettings, SmartRtlSettingTab } from "./settings";
import { applyTableCellDirection, refreshTableDirections } from "./table";

export default class SmartRtlPlugin extends Plugin {
  settings: SmartRtlSettings;

  private refreshSoon = debounce(() => this.refreshViews(), 300, true);

  async onload() {
    await this.loadSettings();

    this.registerEditorExtension(editorExtension(() => this.settings, (path) => this.isActiveFor(path)));

    // Sort order 100 runs after Obsidian's own processor, which sets dir from
    // the first letter of each block.
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!this.isActiveFor(ctx.sourcePath)) return;
      if (el.hasClass("table-cell-wrapper")) applyTableCellDirection(el, this.settings.threshold);
      else applyReadingDirection(el, this.settings.threshold);
    }, 100);

    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        const folders = this.settings.excludedFolders;
        if (file instanceof TFolder) {
          // Keep an excluded folder in the list when it is renamed or moved.
          const renamed = renameFolder(folders, oldPath, file.path);
          if (renamed !== folders) return this.setExcludedFolders(renamed);
        }
        // A note or folder moved into or out of an excluded folder changes
        // whether the plugin applies to its notes.
        const within = (path: string) => isExcluded(file instanceof TFolder ? path + "/" : path, folders);
        if (within(file.path) !== within(oldPath)) this.refreshSoon();
      })
    );

    this.addCommand({
      id: "toggle",
      name: "Toggle on/off",
      callback: async () => {
        await this.setEnabled(!this.settings.enabled);
        new Notice(`Smart RTL ${this.settings.enabled ? "on" : "off"}`);
      },
    });

    this.addSettingTab(new SmartRtlSettingTab(this.app, this));

    // Notes already open when the plugin is enabled were rendered without it.
    this.app.workspace.onLayoutReady(() => this.refreshViews());
  }

  onunload() {
    // Put open notes back to Obsidian's own directions.
    this.settings.enabled = false;
    this.refreshViews();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async setEnabled(enabled: boolean) {
    this.settings.enabled = enabled;
    await this.saveSettings();
    this.refreshViews();
  }

  /** Whether the plugin sets directions in the note at `path`. */
  isActiveFor(path: string | undefined): boolean {
    return this.settings.enabled && !(path && isExcluded(path, this.settings.excludedFolders));
  }

  async setExcludedFolders(folders: string[]) {
    this.settings.excludedFolders = folders;
    await this.saveSettings();
    this.refreshSoon();
  }

  async setThreshold(threshold: number) {
    this.settings.threshold = threshold;
    await this.saveSettings();
    this.refreshSoon();
  }

  refreshViews() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;
      // Not in the public typings, but it is the note's CodeMirror EditorView.
      const cm = (view.editor as unknown as { cm?: EditorView }).cm;
      cm?.dispatch({ effects: refreshEffect.of(null) });
      // Live Preview tables are not redrawn by the editor refresh.
      refreshTableDirections(view.contentEl, this.isActiveFor(view.file?.path) ? this.settings.threshold : null);
      view.previewMode.rerender(true);
    });
  }
}
