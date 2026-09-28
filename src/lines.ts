import { Direction, detectDirection, stripMarkdown } from "./detect";

/** The part of CodeMirror's `Text` this module needs. */
export interface LineSource {
  lines: number;
  line(n: number): { text: string };
}

const FENCE_RE = /^[\s>]*(`{3,}|~{3,})/;
const MATH_RE = /^[\s>]*\$\$/;

/**
 * How many lines above the requested range are read, so a blank line at the
 * top of the viewport inherits the direction of the text before it.
 */
export const LOOKBACK = 50;

function frontmatterEnd(doc: LineSource): number {
  if (doc.lines < 2 || doc.line(1).text !== "---") return 0;
  for (let n = 2; n <= doc.lines; n++) {
    if (doc.line(n).text === "---") return n;
  }
  return 0;
}

/** The marker that closes the code or math block this line opens, if any. */
function opensBlock(text: string): string | null {
  const fence = FENCE_RE.exec(text);
  if (fence) return fence[1];
  const math = MATH_RE.exec(text);
  if (math && !text.slice(math[0].length).includes("$$")) return "$$";
  return null;
}

function closesBlock(text: string, marker: string): boolean {
  if (marker === "$$") return text.includes("$$");
  const fence = FENCE_RE.exec(text);
  return (
    !!fence &&
    fence[1][0] === marker[0] &&
    fence[1].length >= marker.length &&
    text.slice(fence[0].length).trim() === ""
  );
}

/**
 * Direction of every line from `first` to `last` (1-based, inclusive); entry 0
 * is line `first`. Code and math blocks are always LTR, frontmatter is left
 * alone (null), and lines without letters follow the line above them.
 */
export function lineDirections(
  doc: LineSource,
  first: number,
  last: number,
  threshold: number
): (Direction | null)[] {
  const result: (Direction | null)[] = new Array(last - first + 1).fill(null);
  const detectFrom = Math.max(1, first - LOOKBACK);

  let block: string | null = null;
  let prev: Direction | null = null;
  // Start from the top even when `first` is far down: only a full scan knows
  // whether a line sits inside a code block.
  for (let n = frontmatterEnd(doc) + 1; n <= last; n++) {
    const text = doc.line(n).text;
    let dir: Direction | null = null;
    if (block) {
      dir = "ltr";
      if (closesBlock(text, block)) block = null;
    } else if ((block = opensBlock(text))) {
      dir = "ltr";
    } else if (n >= detectFrom) {
      dir = detectDirection(stripMarkdown(text), threshold) ?? prev;
      prev = dir;
    }
    if (n >= first) result[n - first] = dir;
  }
  return result;
}
