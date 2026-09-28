import { MarkdownView, Notice, Plugin, debounce } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { editorExtension, refreshEffect } from "./editor";
import { applyReadingDirection } from "./reading";
import { DEFAULT_SETTINGS, SmartRtlSettings, SmartRtlSettingTab } from "./settings";

export default class SmartRtlPlugin extends Plugin {
  settings: SmartRtlSettings;

  private refreshSoon = debounce(() => this.refreshViews(), 300, true);

  async onload() {
    await this.loadSettings();

    this.registerEditorExtension(editorExtension(() => this.settings));

    // Sort order 100 runs after Obsidian's own processor, which sets dir from
    // the first letter of each block.
    this.registerMarkdownPostProcessor((el) => {
      if (this.settings.enabled) applyReadingDirection(el, this.settings.threshold);
    }, 100);

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
      view.previewMode.rerender(true);
    });
  }
}
