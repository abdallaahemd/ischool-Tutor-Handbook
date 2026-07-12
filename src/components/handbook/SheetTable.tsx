import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function splitBullets(raw: string): string[] {
  return raw
    .split(/\||\n/)
    .map((s) => s.replace(/^\s*\d+\.\s*/, "").trim())
    .filter((s) => s.length > 0);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}

export function SheetTable({
  openLink,
  filterHeaders = [],
}: {
  openLink: string;
  filterHeaders?: string[];
}) {
  const { csvUrl, sheetUrl } = useMemo(() => {
    const m = openLink.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    const id = m?.[1];
    const gidMatch = openLink.match(/[?#&]gid=(\d+)/);
    const gid = gidMatch?.[1] ?? "0";
    return {
      csvUrl: id
        ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
        : openLink,
      sheetUrl: openLink,
    };
  }, [openLink]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(csvUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load sheet (${r.status})`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setHeaders([]);
          setRows([]);
          return;
        }
        const hdrs = parsed[0].map((h) => h.trim());
        const data = parsed.slice(1).map((r) =>
          hdrs.map((_, i) => (r[i] ?? "").trim()),
        );
        setHeaders(hdrs);
        setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load sheet");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [csvUrl]);

  // Resolve configured filter headers to actual column indices (fuzzy match).
  const filterCols = useMemo(() => {
    const normHdrs = headers.map(normalize);
    return filterHeaders
      .map((f) => {
        const idx = normHdrs.indexOf(normalize(f));
        return idx >= 0 ? { label: headers[idx], index: idx } : null;
      })
      .filter((v): v is { label: string; index: number } => v !== null);
  }, [headers, filterHeaders]);

  const filterOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const fc of filterCols) {
      const set = new Set<string>();
      (rows ?? []).forEach((r) => {
        const v = r[fc.index];
        if (v) set.add(v);
      });
      map[fc.label] = Array.from(set).sort();
    }
    return map;
  }, [rows, filterCols]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      for (const fc of filterCols) {
        const sel = filters[fc.label];
        if (sel && sel !== "all" && r[fc.index] !== sel) return false;
      }
      if (!q) return true;
      return r.some((c) => c.toLowerCase().includes(q));
    });
  }, [rows, query, filterCols, filters]);

  const isBulletCol = (h: string) =>
    /key\s*points?|points|bullets|notes/i.test(h);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything…"
            className="h-10 w-72 max-w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          {filterCols.map((fc) => (
            <select
              key={fc.label}
              value={filters[fc.label] ?? "all"}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, [fc.label]: e.target.value }))
              }
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="all">All {fc.label.toLowerCase()}</option>
              {(filterOptions[fc.label] ?? []).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ))}
        </div>
        <a
          href={sheetUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 h-10 text-sm font-medium text-primary-foreground shadow hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Google Sheets
        </a>
      </div>

      {loading && (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] shadow-sm">
          <div className="h-11 bg-[#FAFAFA]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-t border-[#E5E7EB] px-5 py-4">
              <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
              <div className="h-6 flex-1 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 text-center text-sm text-muted-foreground shadow-sm">
          No modules found.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#FAFAFA]">
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="border-b border-[#E5E7EB] px-5 py-4 text-left font-semibold text-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-muted/40 ${
                      i % 2 === 1 ? "bg-[#FAFAFA]" : "bg-white"
                    }`}
                  >
                    {headers.map((h, ci) => {
                      const cell = r[ci] ?? "";
                      const bullets = isBulletCol(h) ? splitBullets(cell) : null;
                      const isFilterCol = filterCols.some((fc) => fc.index === ci);
                      return (
                        <td
                          key={ci}
                          className="border-b border-[#E5E7EB] px-5 py-4 align-top"
                        >
                          {bullets && bullets.length > 1 ? (
                            <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                              {bullets.map((p, j) => (
                                <li key={j} className="leading-relaxed">
                                  {p}
                                </li>
                              ))}
                            </ul>
                          ) : cell ? (
                            isFilterCol ? (
                              <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                {cell}
                              </span>
                            ) : (
                              <span className="text-foreground/90">{cell}</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}