import { App, PluginSettingTab, Setting } from "obsidian";
import type SmartRtlPlugin from "./main";

export interface SmartRtlSettings {
  enabled: boolean;
  /** Percentage of RTL words at which a line becomes right-to-left. */
  threshold: number;
}

export const DEFAULT_SETTINGS: SmartRtlSettings = {
  enabled: true,
  threshold: 40,
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
  }
}
