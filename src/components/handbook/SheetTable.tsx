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

function splitKeyPoints(raw: string): string[] {
  return raw
    .split(/\||\n/)
    .map((s) => s.replace(/^\s*\d+\.\s*/, "").trim())
    .filter((s) => s.length > 0);
}

function findCol(headers: string[], candidates: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().replace(/[\s_-]/g, ""));
  for (const c of candidates) {
    const idx = norm.indexOf(c.toLowerCase().replace(/[\s_-]/g, ""));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function SheetTable({ openLink }: { openLink: string }) {
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

  const [rows, setRows] = useState<
    { grade: string; module: string; points: string[] }[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

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
          setRows([]);
          return;
        }
        const headers = parsed[0].map((h) => h.trim());
        const gi = findCol(headers, ["grade"]);
        const mi = findCol(headers, ["moduleCode", "module", "moduleNumber"]);
        const ki = findCol(headers, ["keyPoints", "keypoints", "points"]);
        const data = parsed.slice(1).map((r) => ({
          grade: (gi >= 0 ? r[gi] : "").trim(),
          module: (mi >= 0 ? r[mi] : "").trim(),
          points: splitKeyPoints(ki >= 0 ? r[ki] ?? "" : ""),
        }));
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

  const grades = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.grade).filter(Boolean))).sort(),
    [rows],
  );
  const modules = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.module).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (gradeFilter !== "all" && r.grade !== gradeFilter) return false;
      if (moduleFilter !== "all" && r.module !== moduleFilter) return false;
      if (!q) return true;
      return (
        r.grade.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.points.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [rows, query, gradeFilter, moduleFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search grade, module, or key points…"
            className="h-10 w-72 max-w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
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
                  <th className="border-b border-[#E5E7EB] px-5 py-4 text-left font-semibold text-foreground w-24">
                    Grade
                  </th>
                  <th className="border-b border-[#E5E7EB] px-5 py-4 text-left font-semibold text-foreground w-28">
                    Module
                  </th>
                  <th className="border-b border-[#E5E7EB] px-5 py-4 text-left font-semibold text-foreground">
                    Key Points
                  </th>
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
                    <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                      {r.grade && (
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {r.grade}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                      {r.module && (
                        <span className="inline-flex items-center rounded-md border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {r.module}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-[#E5E7EB] px-5 py-4 align-top">
                      {r.points.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5 text-foreground/90">
                          {r.points.map((p, j) => (
                            <li key={j} className="leading-relaxed">
                              {p}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
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