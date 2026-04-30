const S_BASE = 0xac00;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;

const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const JUNGSEONG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];

const JONGSEONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const choseongIndex = new Map(CHOSEONG.map((value, index) => [value, index]));
const jungseongIndex = new Map(
  JUNGSEONG.map((value, index) => [value, index]),
);
const jongseongIndex = new Map(
  JONGSEONG.map((value, index) => [value, index]),
);

const combinedVowels = new Map([
  ["ㅗㅏ", "ㅘ"],
  ["ㅗㅐ", "ㅙ"],
  ["ㅗㅣ", "ㅚ"],
  ["ㅜㅓ", "ㅝ"],
  ["ㅜㅔ", "ㅞ"],
  ["ㅜㅣ", "ㅟ"],
  ["ㅡㅣ", "ㅢ"],
]);

const combinedFinals = new Map([
  ["ㄱㅅ", "ㄳ"],
  ["ㄴㅈ", "ㄵ"],
  ["ㄴㅎ", "ㄶ"],
  ["ㄹㄱ", "ㄺ"],
  ["ㄹㅁ", "ㄻ"],
  ["ㄹㅂ", "ㄼ"],
  ["ㄹㅅ", "ㄽ"],
  ["ㄹㅌ", "ㄾ"],
  ["ㄹㅍ", "ㄿ"],
  ["ㄹㅎ", "ㅀ"],
  ["ㅂㅅ", "ㅄ"],
]);

const splitFinals = new Map<string, [string, string]>([
  ["ㄳ", ["ㄱ", "ㅅ"]],
  ["ㄵ", ["ㄴ", "ㅈ"]],
  ["ㄶ", ["ㄴ", "ㅎ"]],
  ["ㄺ", ["ㄹ", "ㄱ"]],
  ["ㄻ", ["ㄹ", "ㅁ"]],
  ["ㄼ", ["ㄹ", "ㅂ"]],
  ["ㄽ", ["ㄹ", "ㅅ"]],
  ["ㄾ", ["ㄹ", "ㅌ"]],
  ["ㄿ", ["ㄹ", "ㅍ"]],
  ["ㅀ", ["ㄹ", "ㅎ"]],
  ["ㅄ", ["ㅂ", "ㅅ"]],
]);

function composeSyllable(lIndex: number, vIndex: number, tIndex = 0) {
  return String.fromCharCode(
    S_BASE + (lIndex * V_COUNT + vIndex) * T_COUNT + tIndex,
  );
}

function getSyllableParts(char: string) {
  const code = char.charCodeAt(0);
  const offset = code - S_BASE;
  if (offset < 0 || offset >= S_COUNT) return null;

  return {
    lIndex: Math.floor(offset / N_COUNT),
    vIndex: Math.floor((offset % N_COUNT) / T_COUNT),
    tIndex: offset % T_COUNT,
  };
}

function readVowel(chars: string[], index: number) {
  const first = chars[index];
  if (!jungseongIndex.has(first)) return null;

  const combined = combinedVowels.get(first + (chars[index + 1] ?? ""));
  if (combined) return { value: combined, length: 2 };

  return { value: first, length: 1 };
}

function readFinal(chars: string[], index: number) {
  const first = chars[index];
  if (!jongseongIndex.has(first)) return null;

  if (jungseongIndex.has(chars[index + 1])) return null;

  const combined = combinedFinals.get(first + (chars[index + 1] ?? ""));
  if (combined && !jungseongIndex.has(chars[index + 2])) {
    return { value: combined, length: 2 };
  }

  return { value: first, length: 1 };
}

export function composeHangulJamo(input: string) {
  const chars = Array.from(input);
  let out = "";

  for (let index = 0; index < chars.length; index++) {
    const char = chars[index];
    const parts = getSyllableParts(char);

    if (parts && parts.tIndex !== 0) {
      const vowel = readVowel(chars, index + 1);
      const final = JONGSEONG[parts.tIndex];
      const split = splitFinals.get(final);
      const remainingFinal = split?.[0] ?? "";
      const nextInitial = split?.[1] ?? final;
      const nextLIndex = choseongIndex.get(nextInitial);
      const nextVIndex = vowel ? jungseongIndex.get(vowel.value) : undefined;

      if (vowel && nextLIndex !== undefined && nextVIndex !== undefined) {
        out += composeSyllable(
          parts.lIndex,
          parts.vIndex,
          remainingFinal ? (jongseongIndex.get(remainingFinal) ?? 0) : 0,
        );

        let nextIndex = index + 1 + vowel.length;
        const nextFinal = readFinal(chars, nextIndex);
        const nextTIndex = nextFinal
          ? (jongseongIndex.get(nextFinal.value) ?? 0)
          : 0;
        if (nextFinal) nextIndex += nextFinal.length;

        out += composeSyllable(nextLIndex, nextVIndex, nextTIndex);
        index = nextIndex - 1;
        continue;
      }
    }

    if (parts && parts.tIndex === 0) {
      const currentVowel = JUNGSEONG[parts.vIndex];
      const combinedVowel = combinedVowels.get(
        currentVowel + (chars[index + 1] ?? ""),
      );
      if (combinedVowel) {
        out += composeSyllable(
          parts.lIndex,
          jungseongIndex.get(combinedVowel) ?? parts.vIndex,
        );
        index += 1;
        continue;
      }

      const final = readFinal(chars, index + 1);
      if (final) {
        out += composeSyllable(
          parts.lIndex,
          parts.vIndex,
          jongseongIndex.get(final.value) ?? 0,
        );
        index += final.length;
        continue;
      }
    }

    const lIndex = choseongIndex.get(char);
    const vowel = readVowel(chars, index + 1);

    if (lIndex === undefined || !vowel) {
      out += char;
      continue;
    }

    let nextIndex = index + 1 + vowel.length;
    const final = readFinal(chars, nextIndex);
    const tIndex = final ? (jongseongIndex.get(final.value) ?? 0) : 0;
    if (final) nextIndex += final.length;

    out += composeSyllable(
      lIndex,
      jungseongIndex.get(vowel.value) ?? 0,
      tIndex,
    );
    index = nextIndex - 1;
  }

  return out;
}
