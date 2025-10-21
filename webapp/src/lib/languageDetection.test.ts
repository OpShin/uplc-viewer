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
  plutarch: "plutarch",
  opshin: "opshin",
  "plutus-tx": "plutus-tx",
  "plu-ts": "plu-ts",
  marlowe: null,
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
  const testsPath = resolve(currentDir, "../../../../tests");
  const contents = readFileSync(testsPath, "utf8").trim();

  const cases: TestCase[] = [];
  let currentLabel: string | null = null;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.endsWith(":")) {
      currentLabel = line.slice(0, -1);
      continue;
    }

    if (!currentLabel) {
      throw new Error("Malformed tests file: encountered data line before label.");
    }

    cases.push({ label: currentLabel, hex: line });
  }

  return cases;
}
