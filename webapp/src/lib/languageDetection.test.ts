import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCborHex } from "./uplcUtils.js";
import { predictLanguage, type DetectedLanguage } from "./languageDetection.js";

interface TestCase {
  label: string;
  hex: string;
}

const EXPECTED_LANGUAGES: Record<string, DetectedLanguage | null> = {
  aiken: "aiken",
  plutarch: null,
  "plu-ts": null,
  opshin: "opshin",
  "plutus-tx": "plutus-tx",
  marlowe: "marlowe",
};

const testCases = loadTestCases();

testCases.forEach(({ label, hex }, index) => {
  const expectation = EXPECTED_LANGUAGES[label];

  if (expectation === undefined) {
    test(`${label} sample #${index + 1}`, () => {
      assert.fail(`Tests file contains unexpected label "${label}".`);
    });
    return;
  }

  test(`${label} sample #${index + 1}`, () => {
    const parsed = parseCborHex(hex);
    const prediction = predictLanguage(parsed.program.body, parsed.compact);

    if (expectation === null) {
      assert.equal(
        prediction,
        null,
        `Expected no prediction for "${label}", but received ${prediction?.language ?? "null"}.`,
      );
      return;
    }

    assert.ok(prediction, `Expected prediction for "${label}".`);
    assert.equal(
      prediction.language,
      expectation,
      `Expected "${label}" but received "${prediction.language}".`,
    );
  });
});

function loadTestCases(): TestCase[] {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    resolve(currentDir, "./languageDetection.test.yml"),
    resolve(currentDir, "../../..", "src", "lib", "languageDetection.test.yml"),
  ];

  let contents: string | null = null;
  for (const candidate of candidatePaths) {
    try {
      contents = readFileSync(candidate, "utf8");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (contents === null) {
    throw new Error("Malformed tests file: could not locate fixtures.");
  }

  const cases: TestCase[] = [];
  let currentLabel: string | null = null;

  for (const rawLine of contents.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (!rawLine.startsWith(" ")) {
      if (!trimmed.endsWith(":")) {
        throw new Error(
          `Malformed tests file: expected label definition but found "${rawLine}".`,
        );
      }
      currentLabel = trimmed.slice(0, -1);
      continue;
    }

    if (!trimmed.startsWith("- ")) {
      throw new Error(
        `Malformed tests file: expected list entry but found "${rawLine}".`,
      );
    }

    if (!currentLabel) {
      throw new Error("Malformed tests file: encountered value before label.");
    }

    const hex = trimmed.slice(2).trim();
    if (!hex) {
      throw new Error(
        `Malformed tests file: empty hex value for label "${currentLabel}".`,
      );
    }

    cases.push({ label: currentLabel, hex });
  }

  if (cases.length === 0) {
    throw new Error("Malformed tests file: no test cases loaded.");
  }

  return cases;
}
