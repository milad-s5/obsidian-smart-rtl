import { detectDirection } from "./detect";

const BLOCK_SELECTOR = "p, li, h1, h2, h3, h4, h5, h6, th, td, dt, dd, summary, .callout-title";
const SKIP_SELECTOR = [
  "ul",
  "ol",
  "pre",
  "code",
  ".math",
  "mjx-container",
  ".internal-embed",
  ".collapse-indicator",
  ".list-collapse-indicator",
  ".heading-collapse-indicator",
  ".list-bullet",
  ".footnote-link",
  "input",
  "sup",
  "svg",
  "img",
  "style",
  "script",
].join(", ");
const URL_TEXT_RE = /^[a-z][\w+.-]*:\/\//i;

/** Visible prose of an element, without nested lists, code, math or bare URLs. */
function renderedText(el: Element): string {
  let text = "";
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node as Text).data;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      if (child.nodeName === "BR") text += " ";
      else if (child.matches(SKIP_SELECTOR)) return;
      else if (child.nodeName === "A" && URL_TEXT_RE.test(child.textContent ?? "")) return;
      else text += renderedText(child);
    }
  });
  return text;
}

/** Sets `dir` on the blocks of a rendered section. Runs after Obsidian's own pass. */
export function applyReadingDirection(el: HTMLElement, threshold: number): void {
  el.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((block) => {
    const dir = detectDirection(renderedText(block), threshold);
    if (dir) block.dir = dir;
  });

  // Lists and quotes follow the majority of their items, so bullets and
  // indentation sit on the matching side.
  el.querySelectorAll<HTMLElement>("ul, ol, blockquote").forEach((container) => {
    let rtl = 0;
    let ltr = 0;
    for (const child of Array.from(container.children)) {
      const dir = (child as HTMLElement).dir;
      if (dir === "rtl") rtl++;
      else if (dir === "ltr") ltr++;
    }
    if (rtl || ltr) container.dir = rtl >= ltr ? "rtl" : "ltr";
  });

  // Column order follows the header row, on the element Obsidian sets it on.
  el.querySelectorAll<HTMLElement>("table").forEach((table) => {
    const headerRow = table.querySelector("tr");
    if (!headerRow) return;
    const text = Array.from(headerRow.children, renderedText).join(" ");
    const dir = detectDirection(text, threshold);
    if (!dir) return;
    const wrapper = table.parentElement;
    (wrapper && wrapper.childElementCount === 1 ? wrapper : table).dir = dir;
  });
}
