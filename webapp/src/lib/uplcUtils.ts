import {
  UPLCDecoder,
  UPLCProgram,
  UPLCVersion,
  compileUPLC,
  defaultUplcVersion,
  parseUPLCText,
  prettyUPLC,
} from "@harmoniclabs/uplc";
import { toHex, fromHex } from "@harmoniclabs/uint8array-utils";
import type { UPLCTerm } from "@harmoniclabs/uplc";

export interface TextParseOutput {
  term: UPLCTerm;
  version: UPLCVersion;
  pretty: string;
}

export interface ProgramEncoding {
  program: UPLCProgram;
  flatBytes: Uint8Array;
  flatHex: string;
  cborBytes: Uint8Array;
  cborHex: string;
}

export interface CborParseOutput extends ProgramEncoding {
  pretty: string;
  version: UPLCVersion;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function detectVersionFromSource(source: string): UPLCVersion {
  const trimmed = source.trim();
  if (!trimmed.startsWith("(program")) {
    return defaultUplcVersion;
  }

  const closingIndex = trimmed.lastIndexOf(")");
  const inner = closingIndex >= 0 ? trimmed.slice(8, closingIndex).trim() : trimmed.slice(8).trim();
  const versionMatch = inner.match(/^(\d+\.\d+\.\d+)(?!\.)/);

  if (!versionMatch) {
    throw new ParseError("Unable to read the program version from the input.");
  }

  try {
    return UPLCVersion.fromString(versionMatch[1]);
  } catch {
    throw new ParseError("The program version found in the input is not valid.");
  }
}

export function parseTextSource(source: string): TextParseOutput {
  try {
    const term = parseUPLCText(source);
    const version = detectVersionFromSource(source);
    const pretty = prettyUPLC(term).trim();

    return { term, version, pretty };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while parsing UPLC text.";
    throw new ParseError(message);
  }
}

export function encodeProgram(term: UPLCTerm, version: UPLCVersion): ProgramEncoding {
  const program = new UPLCProgram(version, term);
  const compiled = compileUPLC(program);
  const { buffer: flatBytes } = compiled.toBuffer();
  const flatHex = toHex(flatBytes);
  const cborBytes = wrapBytesAsCbor(flatBytes);
  const cborHex = toHex(cborBytes);

  return { program, flatBytes, flatHex, cborBytes, cborHex };
}

export function parseCborHex(input: string): CborParseOutput {
  const bytes = hexStringToBytes(input);

  try {
    const program = UPLCDecoder.parse(bytes, "cbor");
    const pretty = prettyUPLC(program.body).trim();
    const encoding = encodeProgram(program.body, program.version);

    return {
      ...encoding,
      pretty,
      version: program.version,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while parsing CBOR.";
    throw new ParseError(message);
  }
}

export function hexStringToBytes(input: string): Uint8Array {
  const normalized = normalizeHex(input);

  try {
    return fromHex(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid hex string.";
    throw new ParseError(message);
  }
}

export function normalizeHex(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "");
  const withoutPrefix = trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed;

  if (withoutPrefix.length === 0) {
    throw new ParseError("The CBOR hex string is empty.");
  }

  if (!/^[0-9a-fA-F]+$/.test(withoutPrefix)) {
    throw new ParseError("The CBOR input contains non-hexadecimal characters.");
  }

  if (withoutPrefix.length % 2 !== 0) {
    throw new ParseError("Hex strings must contain an even number of characters.");
  }

  return withoutPrefix.toLowerCase();
}

export function wrapBytesAsCbor(bytes: Uint8Array): Uint8Array {
  const { length } = bytes;

  if (length <= 23) {
    const output = new Uint8Array(1 + length);
    output[0] = 0x40 + length;
    output.set(bytes, 1);
    return output;
  }

  if (length <= 0xff) {
    const output = new Uint8Array(2 + length);
    output[0] = 0x58;
    output[1] = length;
    output.set(bytes, 2);
    return output;
  }

  if (length <= 0xffff) {
    const output = new Uint8Array(3 + length);
    output[0] = 0x59;
    output[1] = (length >> 8) & 0xff;
    output[2] = length & 0xff;
    output.set(bytes, 3);
    return output;
  }

  const output = new Uint8Array(5 + length);
  output[0] = 0x5a;
  output[1] = (length >>> 24) & 0xff;
  output[2] = (length >>> 16) & 0xff;
  output[3] = (length >>> 8) & 0xff;
  output[4] = length & 0xff;
  output.set(bytes, 5);

  return output;
}

export function versionToString(version: UPLCVersion): string {
  return version.toString();
}
