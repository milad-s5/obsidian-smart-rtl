import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDirection, stripMarkdown } from "../src/detect";
import { LOOKBACK, lineDirections } from "../src/lines";

const T = 40;
const line = (text: string) => detectDirection(stripMarkdown(text), T);

function doc(text: string) {
  const lines = text.split("\n");
  return { lines: lines.length, line: (n: number) => ({ text: lines[n - 1] }) };
}

const all = (text: string) => {
  const d = doc(text);
  return lineDirections(d, 1, d.lines, T);
};

test("a Persian line that starts with an English word is RTL", () => {
  assert.equal(line("checkpoint اول (۲۸) مهمه. بدون اون، اگه کشیدن خراب بشه"), "rtl");
  assert.equal(line("## checkpoint و مقدارهاش از کجا میان؟"), "rtl");
});

test("an English line with a Persian word stays LTR", () => {
  assert.equal(line("The word سلام means hello in Persian"), "ltr");
});

test("a mostly English line that starts in Persian is LTR", () => {
  assert.equal(line("این یه test هست for the new feature that we built today"), "ltr");
});

test("the threshold decides mixed lines", () => {
  const mixed = "fix bug در measurement calc"; // 1 of 5 words RTL
  assert.equal(detectDirection(mixed, 25), "ltr");
  assert.equal(detectDirection(mixed, 20), "rtl");
});

test("text without letters has no direction", () => {
  assert.equal(line("123 ۴۵۶ --- !?"), null);
  assert.equal(line(""), null);
});

test("inline code, URLs and link targets are not counted", () => {
  assert.equal(line("`someIdentifier` و `anotherOne` برای https://example.com/a/b/c"), "rtl");
  assert.equal(line("[[folder/some english note name|این فایل]]"), "rtl");
  assert.equal(line("[این لینک](https://example.com/english/words/here)"), "rtl");
});

test("list, task and callout markers are not counted", () => {
  assert.equal(stripMarkdown("- [x] done"), "done");
  assert.equal(stripMarkdown("> [!note]- یادداشت"), " یادداشت");
  assert.equal(stripMarkdown("12. item"), "item");
});

test("code and math blocks are LTR even with Persian inside", () => {
  assert.deepEqual(all("متن فارسی\n```js\nکد فارسی\n```\n$$\nx = y\n$$"), [
    "rtl",
    "ltr",
    "ltr",
    "ltr",
    "ltr",
    "ltr",
    "ltr",
  ]);
});

test("a fence closes only with the same marker, at least as long", () => {
  assert.deepEqual(all("````\n```\nکد\n````\nفارسی"), ["ltr", "ltr", "ltr", "ltr", "rtl"]);
  assert.deepEqual(all("~~~\n```\n~~~\nفارسی"), ["ltr", "ltr", "ltr", "rtl"]);
});

test("frontmatter is left alone", () => {
  assert.deepEqual(all("---\ntitle: عنوان\n---\nفارسی"), [null, null, null, "rtl"]);
});

test("lines without letters follow the line above, skipping code blocks", () => {
  assert.deepEqual(all("متن فارسی\n\n```\ncode\n```\n\n۱۲۳"), [
    "rtl",
    "rtl",
    "ltr",
    "ltr",
    "ltr",
    "rtl",
    "rtl",
  ]);
  assert.deepEqual(all("\nEnglish"), [null, "ltr"]);
});

test("a range far down the note still knows it is inside a code block", () => {
  const filler = Array(LOOKBACK * 2).fill("کد").join("\n");
  const d = doc("```\n" + filler + "\n```\nفارسی");
  assert.deepEqual(lineDirections(d, d.lines - 2, d.lines, T), ["ltr", "ltr", "rtl"]);
});

test("a blank first line of the range inherits from above it", () => {
  const d = doc("متن فارسی\n\n\nEnglish");
  assert.deepEqual(lineDirections(d, 2, 4, T), ["rtl", "rtl", "ltr"]);
});
