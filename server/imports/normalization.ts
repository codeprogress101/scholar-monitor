export const normalizeReference = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
export function normalizeIntakeStatus(s: string) {
 const text = normalizeReference(s);
 return ({ "old scholar": "old", "new scholar": "new", "continuing scholar": "continuing" } as Record<string, string>)[text] ?? text;
}
export function normalizeYearLevel(s: string) {
 const text = normalizeReference(s);
 const words = ["first", "second", "third", "fourth", "fifth", "sixth"];
 const numeric = /^(?:year\s*)?([1-6])(?:st|nd|rd|th)?(?:\s*year)?$/.exec(text);
 if (numeric) return numeric[1];
 const word = words.findIndex(w => text === w || text === `${w} year`);
 return word >= 0 ? String(word + 1) : s.trim();
}
