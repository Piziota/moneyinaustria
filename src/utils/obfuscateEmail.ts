// Converts text to numeric HTML character references (e.g. "a" -> "&#x61;").
// Browsers decode these normally when parsing HTML, including inside
// attribute values like a mailto: href, so the link stays clickable while
// the address never appears as plain text in the page source — enough to
// stop basic regex/string scrapers that read raw HTML without rendering it.
export function obfuscateEmail(value: string): string {
  return Array.from(value)
    .map((char) => `&#x${char.codePointAt(0)!.toString(16)};`)
    .join('');
}
