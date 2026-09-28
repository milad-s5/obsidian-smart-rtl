export type Direction = "rtl" | "ltr";

const WORD_RE = /[\p{L}\p{M}\p{N}_'’‌‍]+/gu;
const RTL_LETTER_RE =
  /(?=\p{L})[\p{sc=Arabic}\p{sc=Hebrew}\p{sc=Syriac}\p{sc=Thaana}\p{sc=Nko}\p{sc=Adlam}\p{sc=Samaritan}\p{sc=Mandaic}]/u;
const LETTER_RE = /\p{L}/u;

/**
 * "rtl" when at least `threshold` percent of the words contain an RTL letter,
 * "ltr" otherwise, and null when the text has no letters at all.
 */
export function detectDirection(text: string, threshold: number): Direction | null {
  let rtl = 0;
  let ltr = 0;
  for (const word of text.match(WORD_RE) ?? []) {
    if (RTL_LETTER_RE.test(word)) rtl++;
    else if (LETTER_RE.test(word)) ltr++;
  }
  if (rtl + ltr === 0) return null;
  return rtl >= (threshold / 100) * (rtl + ltr) ? "rtl" : "ltr";
}

/** Drops the parts of a Markdown line that are not read as prose. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^[\s>]*(?:[*+-]\s+|\d+[.)]\s+)?(?:\[.\]\s+)?(?:\[![^\]]*\][+-]?)?/, "")
    .replace(/(`+)[\s\S]*?\1/g, " ")
    .replace(/\$[^$\s][^$]*\$/g, " ")
    .replace(/!\[\[[^\]]*\]\]/g, " ")
    .replace(/\[\[([^\]|#]*)[^\]|]*(?:\|([^\]]*))?\]\]/g, (_, target: string, alias?: string) => alias ?? target)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\b[a-z][\w+.-]*:\/\/\S+/gi, " ")
    .replace(/\[\^[^\]]*\]/g, " ");
}
