/* eslint-disable max-len */
import {
  Case,
  Constr,
  Lambda,
  UPLCConst,
  constT,
  constTypeEq,
  type UPLCTerm,
} from "@harmoniclabs/uplc";

export type DetectedLanguage = "aiken" | "plutarch" | "opshin" | "plutus-tx" | "plu-ts" | "helios";

export interface MarkerEvidence {
  kind: "marker";
  markers: string[];
  totalMatches: number;
}

export interface StructuralEvidence {
  kind: "structure";
  detail: string;
}

export type DetectionEvidence = MarkerEvidence | StructuralEvidence;

export interface LanguagePrediction {
  language: DetectedLanguage;
  evidence: DetectionEvidence;
}

const MARKER_SAMPLE_LIMIT = 5;

const aikenMarkers: readonly string[] = [
  "delay[(error)(force(error))]",
  "List/Tuple/Constrcontainsmoreitemsthanexpected",
  "ExpectednoitemsforList",
  "ExpectednofieldsforConstr",
  "ExpectedonincorrectBooleanvariant",
  "ExpectedonincorrectConstrvariant",
  "Constrindexdidn'tmatchatypevariant",
  "(force(builtinmkCons))])(force(builtinheadList))])(force(builtintailList))",
] as const;

const plutarchMarkers: readonly string[] = [
  "constring\"can'tgetanycontinuingoutputs",
  "constring\"PatternmatchingfailureinQualifiedDosyntax",
  "constring\"reachedendofsumwhilestill",
  "constring\"PatternmatchingfailureinTermCont",
  "constring\"ptryPositive",
  "constring\"pfromJust",
  "constring\"pelemAt",
  "constring\"ptryFrom(TxId)",
  "constring\"ptryFrom(POSIXTime)",
  "constring\"ptryFrom(TokenName)",
  "constring\"ptryFrom(CurrencySymbol)",
  "constring\"ptryFrom(PDataRecord[])",
  "constring\"ptryFrom(PScriptHash)",
  "constring\"ptryFrom(PPubKeyHash)",
  "constring\"ptryFrom(PRational)",
  "constring\"unsorted map",
  "(force(builtinheadList))])(force(builtintailList))])(lami_0[i_2[(builtinunConstrData)i_1]])])(force(force(builtinsndPair)))",
  "(force(builtintailList))])(force(builtinheadList))])(lami_0[i_2[(builtinunConstrData)i_1]])])(force(force(builtinsndPair)))",
  "Patternmatchfailurein",
  "Plutarch",
] as const;

const opshinMarkers: readonly string[] = [
  "constring\"KeyError\"",
  "constring\"NameError:",
  "constring\"ValueError:datumintegritycheckfailed\"",
] as const;

const heliosMarkers: readonly string[] = [
  "validationreturnedfalse",
  "force(builtinifThenElse))[[(builtinequalsInteger)[(force(force(builtinfstPair)))[(builtinunConstrData)",
] as const;

const plutusTxMarkers: readonly string[] = [
  "constring\"L0\"",
  "constring\"L1\"",
  "constring\"L2\"",
  "constring\"L3\"",
  "constring\"L4\"",
  "constring\"L5\"",
  "constring\"L6\"",
  "constring\"L7\"",
  "constring\"L8\"",
  "constring\"L9\"",
  "constring\"La\"",
  "constring\"Lb\"",
  "constring\"Lc\"",
  "constring\"Ld\"",
  "constring\"Le\"",
  "constring\"Lf\"",
  "constring\"Lg\"",
  "constring\"Lh\"",
  "constring\"Li\"",
  "constring\"PT1\"",
  "constring\"PT2\"",
  "constring\"PT3\"",
  "constring\"PT4\"",
  "constring\"PT5\"",
  "constring\"PT6\"",
  "constring\"PT7\"",
  "constring\"PT8\"",
  "constring\"PT9\"",
  "constring\"PT10\"",
  "constring\"PT11\"",
  "constring\"PT12\"",
  "constring\"PT13\"",
  "constring\"PT14\"",
  "constring\"PT15\"",
  "constring\"PT16\"",
  "constring\"PT17\"",
  "constring\"PT18\"",
  "constring\"Pa\"",
  "constring\"Pb\"",
  "constring\"Pc\"",
  "constring\"Pd\"",
  "constring\"Pe\"",
  "constring\"Pf\"",
  "constring\"Pg\"",
  "constring\"S0\"",
  "constring\"S1\"",
  "constring\"S2\"",
  "constring\"S3\"",
  "constring\"S4\"",
  "constring\"S5\"",
  "constring\"S6\"",
  "constring\"S7\"",
  "constring\"S8\"",
  "constring\"C0\"",
  "constring\"C1\"",
  "41786f4f7261636c655631",
  "41756374696f6e457363726f7",
] as const;

export function predictLanguage(term: UPLCTerm, programText: string): LanguagePrediction | null {
  const normalized = normalizeProgram(programText);

  if (!normalized) {
    return null;
  }

  const aikenEvidence = collectMarkerEvidence(normalized, aikenMarkers);
  if (aikenEvidence) {
    return { language: "aiken", evidence: aikenEvidence };
  }

  if (isPlutsTerm(term)) {
    return {
      language: "plu-ts",
      evidence: {
        kind: "structure",
        detail: "Matches the Plu-ts two-branch case structure with the sentinel integer 42.",
      },
    };
  }

  const heliosEvidence = collectMarkerEvidence(normalized, heliosMarkers);
  if (heliosEvidence) {
    return { language: "helios", evidence: heliosEvidence };
  }

  const plutusTxEvidence = collectMarkerEvidence(normalized, plutusTxMarkers);
  if (plutusTxEvidence) {
    return { language: "plutus-tx", evidence: plutusTxEvidence };
  }

  const opshinEvidence = collectMarkerEvidence(normalized, opshinMarkers);
  if (opshinEvidence) {
    return { language: "opshin", evidence: opshinEvidence };
  }

  const plutarchEvidence = collectMarkerEvidence(normalized, plutarchMarkers);
  if (plutarchEvidence) {
    return { language: "plutarch", evidence: plutarchEvidence };
  }

  return null;
}

function normalizeProgram(input: string): string {
  return input.replace(/\s+/g, "");
}

function collectMarkerEvidence(
  normalizedProgram: string,
  markers: readonly string[],
): MarkerEvidence | null {
  let totalMatches = 0;
  const samples: string[] = [];

  for (const marker of markers) {
    const normalizedMarker = marker.replace(/\s+/g, "");

    if (!normalizedMarker) {
      continue;
    }

    if (normalizedProgram.includes(normalizedMarker)) {
      totalMatches += 1;
      if (samples.length < MARKER_SAMPLE_LIMIT) {
        samples.push(normalizedMarker);
      }
    }
  }

  if (totalMatches === 0) {
    return null;
  }

  return {
    kind: "marker",
    markers: samples,
    totalMatches,
  };
}

function isPlutsTerm(term: UPLCTerm): boolean {
  if (term instanceof Case) {
    const { constrTerm, continuations } = term;

    if (!(constrTerm instanceof Constr)) {
      return false;
    }

    if (constrTerm.index !== 0n || constrTerm.terms.length !== 0) {
      return false;
    }

    if (continuations.length !== 2) {
      return false;
    }

    const lastBranch = continuations[continuations.length - 1];

    if (!(lastBranch instanceof UPLCConst)) {
      return false;
    }

    if (!constTypeEq(lastBranch.type, constT.int)) {
      return false;
    }

    return typeof lastBranch.value === "bigint" && lastBranch.value === 42n;
  }

  if (term instanceof Lambda) {
    return isPlutsTerm(term.body);
  }

  return false;
}
