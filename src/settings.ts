import { AbstractInputSuggest, App, PluginSettingTab, Setting, TFolder } from "obsidian";
import type SmartRtlPlugin from "./main";

export interface SmartRtlSettings {
  enabled: boolean;
  /** Percentage of RTL words at which a line becomes right-to-left. */
  threshold: number;
  /** Folders whose notes keep Obsidian's own directions, subfolders included. */
  excludedFolders: string[];
}

export const DEFAULT_SETTINGS: SmartRtlSettings = {
  enabled: true,
  threshold: 40,
  excludedFolders: [],
};

export class SmartRtlSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SmartRtlPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Enabled")
      .setDesc("Set each line's direction from the majority of its words instead of its first letter.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange((value) => this.plugin.setEnabled(value))
      );

    const threshold = new Setting(containerEl)
      .setName("RTL threshold")
      .setDesc(
        "A line is right-to-left when at least this share of its words are RTL " +
          "(Persian, Arabic, Hebrew…). Lower it to flip lines with more English in them. " +
          "Inline code, link targets and URLs are not counted."
      );
    const valueEl = threshold.controlEl.createSpan({ cls: "smart-rtl-threshold-value" });
    const showValue = (value: number) => valueEl.setText(`${value}%`);
    showValue(this.plugin.settings.threshold);
    threshold.addSlider((slider) =>
      slider
        .setLimits(10, 90, 5)
        .setValue(this.plugin.settings.threshold)
        .setDynamicTooltip()
        .onChange(async (value) => {
          showValue(value);
          await this.plugin.setThreshold(value);
        })
    );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Notes in these folders and their subfolders keep Obsidian's own directions.")
      .addSearch((search) => {
        search.setPlaceholder("Add a folder…");
        const suggest = new FolderSuggest(this.app, search.inputEl, () => this.plugin.settings.excludedFolders);
        suggest.onSelect(async (folder) => {
          search.setValue("");
          suggest.close();
          const folders = [...this.plugin.settings.excludedFolders, folder.path].sort();
          await this.plugin.setExcludedFolders(folders);
          showFolders();
        });
      });

    const listEl = containerEl.createDiv({ cls: "smart-rtl-excluded-folders" });
    const showFolders = () => {
      listEl.empty();
      for (const path of this.plugin.settings.excludedFolders) {
        const row = new Setting(listEl).setName(path).addExtraButton((button) =>
          button
            .setIcon("x")
            .setTooltip("Remove")
            .onClick(async () => {
              const folders = this.plugin.settings.excludedFolders.filter((f) => f !== path);
              await this.plugin.setExcludedFolders(folders);
              showFolders();
            })
        );
        if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder)) {
          row.setDesc("This folder is not in the vault.");
          row.descEl.addClass("mod-warning");
        }
      }
    };
    showFolders();
  }
}

/** Suggests the vault's folders, leaving out the ones already excluded. */
class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(app: App, inputEl: HTMLInputElement, private excluded: () => string[]) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): TFolder[] {
    const q = query.toLowerCase();
    const excluded = this.excluded();
    return this.app.vault
      .getAllFolders(false)
      .filter((folder) => folder.path.toLowerCase().includes(q) && !excluded.includes(folder.path))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }
}
