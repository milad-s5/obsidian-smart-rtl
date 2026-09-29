import { detectDirection, firstLetterDirection } from "./detect";
import { renderedText } from "./reading";

// Live Preview draws a table as a widget and renders each cell on its own.
// Obsidian gives every cell the direction of its first letter, and the whole
// table that of the top-left cell, then runs Markdown post-processors on the
// cell, so these run after it and can set the same directions reading view has.

/** A cell's rendered content, not the editor Obsidian opens in it on click. */
const contentOf = (cell: Element) => cell.querySelector<HTMLElement>(":scope > .table-cell-wrapper");

function setCellDirection(cell: HTMLElement, threshold: number | null): void {
  const content = contentOf(cell);
  if (!content) return;
  if (threshold === null) {
    cell.dir = firstLetterDirection(content.textContent ?? "");
    return;
  }
  const dir = detectDirection(renderedText(content), threshold);
  if (dir) cell.dir = dir;
}

/** Column order follows the header row, as in reading view. */
function setTableDirection(widget: HTMLElement, threshold: number | null): void {
  const headerRow = widget.querySelector("tr");
  if (!headerRow) return;
  if (threshold === null) {
    widget.dir = (headerRow.firstElementChild as HTMLElement | null)?.dir || "auto";
    return;
  }
  const text = Array.from(headerRow.children, (cell) => {
    const content = contentOf(cell);
    return content ? renderedText(content) : "";
  }).join(" ");
  const dir = detectDirection(text, threshold);
  if (dir) widget.dir = dir;
}

/** Post-processor for one cell's content, right after Obsidian rendered it. */
export function applyTableCellDirection(content: HTMLElement, threshold: number): void {
  const cell = content.parentElement;
  if (cell) setCellDirection(cell, threshold);
  // While the table is being built its other cells may not be there yet.
  queueMicrotask(() => {
    const widget = content.closest<HTMLElement>(".cm-table-widget");
    if (widget) setTableDirection(widget, threshold);
  });
}

/**
 * Sets the directions of the Live Preview tables under `el` again after the
 * settings change, or puts back Obsidian's own when `threshold` is null.
 */
export function refreshTableDirections(el: HTMLElement, threshold: number | null): void {
  el.querySelectorAll<HTMLElement>(".cm-table-widget").forEach((widget) => {
    widget.querySelectorAll<HTMLElement>("th, td").forEach((cell) => setCellDirection(cell, threshold));
    setTableDirection(widget, threshold);
  });
}
