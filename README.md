# UPLC Viewer

Browser-only utility for inspecting Untyped Plutus Core (UPLC) programs. Paste either UPLC source code or the CBOR-wrapped hex encoding of a script and the viewer will:

- Parse and pretty-print the UPLC term.
- Recover the script version.
- Produce the flattened binary encoding (hex) and the CBOR-wrapped variant.
- Run entirely in the browser using [`@harmoniclabs/uplc`](https://www.npmjs.com/package/@harmoniclabs/uplc) and companion libraries—no backend required.

## Prerequisites

- Node.js 18 or later
- npm 9 or later

## Getting started

```bash
cd webapp
npm install
npm run dev
```

Open the printed URL (defaults to http://localhost:5173) and paste either:

- Raw UPLC source (`(program 1.1.0 ...)` or a bare term such as `(lam ...)`).
- CBOR hex for a compiled script (for example the `cborHex` field emitted by `cardano-cli`).

The viewer automatically detects the format, formats the script body, and gives you copy-ready flat and CBOR hex strings.

## Production build

```bash
npm run build   # type-checks and produces a static build in dist/
npm run preview # serve the production build locally
```

## Project layout

- `src/App.tsx` – UI logic for parsing, formatting, and displaying UPLC.
- `src/lib/uplcUtils.ts` – Helpers for detecting input format, encoding scripts, and wrapping bytes as CBOR.
- `src/App.css` – Component styling.

## Notes

- Scripts are parsed with the default Plutus v1.1.0 version when no `(program …)` header is present.
- Copy buttons rely on the Clipboard API and may require a secure context (HTTPS) in some browsers.
