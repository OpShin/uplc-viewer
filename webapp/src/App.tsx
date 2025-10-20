import { useMemo, useState } from "react";
import "./App.css";
import { encodeProgram, parseCborHex, parseTextSource, versionToString } from "./lib/uplcUtils";

type SourceKind = "text" | "cbor";

interface ViewerResult {
  kind: SourceKind;
  version: string;
  pretty: string;
  compact: string;
  flatHex: string;
  flatLength: number;
  cborHex: string;
  cborLength: number;
}

const EMPTY_RESULT: ViewerResult | null = null;

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ViewerResult | null>(EMPTY_RESULT);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [prettyMode, setPrettyMode] = useState(false);

  const hasContent = input.trim().length > 0;

  const placeholder = useMemo(
    () =>
      `(program 1.1.0
  (lam
    (lam
      [ (builtin ifThenElse)
        (force (force (builtin equalsInteger)))
        (con integer 1)
        (con integer 0)
      ]
    )
  )
)`,
    [],
  );

  const handleClear = () => {
    setInput("");
    setResult(EMPTY_RESULT);
    setError(null);
    setLastAction(null);
    setPrettyMode(false);
  };

  const handleProcess = () => {
    const trimmed = input.trim();
    setResult(EMPTY_RESULT);
    setError(null);
    setLastAction(null);

    if (!trimmed) {
      setError("Paste a UPLC program or its CBOR hex representation to begin.");
      return;
    }

    let textError: string | null = null;

    try {
      const parsed = parseTextSource(trimmed);
      const encoding = encodeProgram(parsed.term, parsed.version);

      setResult({
        kind: "text",
        version: versionToString(parsed.version),
        pretty: parsed.pretty,
        compact: parsed.compact,
        flatHex: encoding.flatHex,
        flatLength: encoding.flatBytes.length,
        cborHex: encoding.cborHex,
        cborLength: encoding.cborBytes.length,
      });
      setLastAction("Parsed source as plain UPLC.");
      return;
    } catch (err) {
      textError = err instanceof Error ? err.message : String(err);
    }

    try {
      const parsed = parseCborHex(trimmed);
      setResult({
        kind: "cbor",
        version: versionToString(parsed.version),
        pretty: parsed.pretty,
        compact: parsed.compact,
        flatHex: parsed.flatHex,
        flatLength: parsed.flatBytes.length,
        cborHex: parsed.cborHex,
        cborLength: parsed.cborBytes.length,
      });
      setLastAction("Parsed source as CBOR-wrapped script.");
    } catch (err) {
      const cborMessage = err instanceof Error ? err.message : String(err);
      const combined = [
        `Failed to parse as UPLC text: ${textError ?? "unknown error."}`,
        `Failed to parse as CBOR hex: ${cborMessage}`,
      ].join(" ");
      setError(combined);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setLastAction("Copied value to clipboard.");
    } catch {
      setLastAction("Copy failed—please copy manually.");
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>UPLC Viewer</h1>
        <p>
          Format Untyped Plutus Core or inspect its CBOR-wrapped variant in the browser—no backend
          required.
        </p>
      </header>

      <section className="input-section">
        <label htmlFor="uplc-input">Input</label>
        <textarea
          id="uplc-input"
          value={input}
          placeholder={placeholder}
          onChange={(evt) => setInput(evt.target.value)}
          spellCheck={false}
        />
        <div className="controls">
          <button type="button" onClick={handleProcess} disabled={!hasContent}>
            Convert
          </button>
          <button type="button" onClick={handleClear} disabled={!hasContent && !result}>
            Clear
          </button>
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        {lastAction && !error && <p className="alert alert-info">{lastAction}</p>}
      </section>

      {result && (
        <section className="output-section">
          <div className="meta">
            <span className="badge">{result.kind === "text" ? "UPLC text" : "CBOR hex"}</span>
            <span className="version">Version: {result.version}</span>
            <span className="length">
              Flat bytes: {result.flatLength.toLocaleString()} · CBOR bytes:{" "}
              {result.cborLength.toLocaleString()}
            </span>
          </div>

          <div className="output-block">
            <div className="output-header">
              <h2>Pretty UPLC</h2>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={prettyMode}
                  onChange={(event) => setPrettyMode(event.target.checked)}
                />
                <span>Pretty-print</span>
              </label>
            </div>
            <pre className={prettyMode ? "pretty" : "compact"}>
              {prettyMode ? result.pretty : result.compact}
            </pre>
          </div>

          <div className="output-block">
            <div className="output-header">
              <h2>Flat Encoding (hex)</h2>
              <button type="button" onClick={() => handleCopy(result.flatHex)}>
                Copy
              </button>
            </div>
            <textarea value={result.flatHex} readOnly spellCheck={false} />
          </div>

          <div className="output-block">
            <div className="output-header">
              <h2>CBOR-wrapped (hex)</h2>
              <button type="button" onClick={() => handleCopy(result.cborHex)}>
                Copy
              </button>
            </div>
            <textarea value={result.cborHex} readOnly spellCheck={false} />
          </div>
        </section>
      )}

      <footer>
        <p>
          Powered by <code>@harmoniclabs/uplc</code>. Input is processed entirely in your browser.
        </p>
      </footer>
    </div>
  );
}

export default App;
