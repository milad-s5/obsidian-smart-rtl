import { Extension, Prec, RangeSetBuilder, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import { lineDirections } from "./lines";
import { SmartRtlSettings } from "./settings";

/** Dispatched to every editor when the settings change. */
export const refreshEffect = StateEffect.define<null>();

const LINE_DECO = {
  rtl: Decoration.line({ attributes: { dir: "rtl" }, class: "smart-rtl-rtl" }),
  ltr: Decoration.line({ attributes: { dir: "ltr" }, class: "smart-rtl-ltr" }),
};

function buildDecorations(view: EditorView, threshold: number): DecorationSet {
  const doc = view.state.doc;
  const first = doc.lineAt(view.viewport.from).number;
  const last = doc.lineAt(view.viewport.to).number;
  const builder = new RangeSetBuilder<Decoration>();
  lineDirections(doc, first, last, threshold).forEach((dir, i) => {
    if (!dir) return;
    const from = doc.line(first + i).from;
    builder.add(from, from, LINE_DECO[dir]);
  });
  return builder.finish();
}

export function editorExtension(
  getSettings: () => SmartRtlSettings,
  isActiveFor: (path: string | undefined) => boolean
): Extension {
  const compute = (view: EditorView) => {
    const path = view.state.field(editorInfoField, false)?.file?.path;
    return isActiveFor(path) ? buildDecorations(view, getSettings().threshold) : Decoration.none;
  };

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = compute(view);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.transactions.some((tr) => tr.effects.some((e) => e.is(refreshEffect)))
        ) {
          this.decorations = compute(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );

  return [
    // Cursor movement follows each line's own direction.
    EditorView.perLineTextDirection.of(true),
    // CodeMirror applies line attributes in precedence order and the last one
    // wins, so lowest precedence overrides the dir Obsidian sets from the
    // first letter of the line.
    Prec.lowest(plugin),
  ];
}
