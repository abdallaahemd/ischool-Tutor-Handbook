import { createFileRoute } from "@tanstack/react-router";

const SHEET_ID = "1nMPM2y3MgcFjZsEm7pRdN2zVTsoIqd_7jq23lXYCGWc";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // ignore
      } else field += c;
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((v) => v && v.length));
}

async function runSync() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const res = await fetch(SHEET_CSV_URL, { redirect: "follow" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const csv = await res.text();
    const rows = parseCsv(csv);
    if (rows.length === 0) throw new Error("Sheet is empty");

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const emailIdx = header.indexOf("email");
    const passIdx = header.indexOf("password");
    if (emailIdx === -1 || passIdx === -1)
      throw new Error("Sheet must have 'Email' and 'Password' columns");

    const payload = rows.slice(1).map((r) => ({
      email: (r[emailIdx] ?? "").trim(),
      password: (r[passIdx] ?? "").trim(),
    })).filter((r) => r.email && r.password);

    const { data, error } = await supabaseAdmin.rpc("sync_tutors_from_sheet" as never, {
      _rows: payload,
    } as never);
    if (error) throw error;

    await supabaseAdmin.from("sync_logs").insert({
      status: "success",
      records_processed: (data as number) ?? payload.length,
    });
    return { ok: true, processed: payload.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin.from("sync_logs").insert({
      status: "error",
      records_processed: 0,
      error_message: msg,
    });
    return { ok: false, error: msg };
  }
}

export const Route = createFileRoute("/api/public/hooks/sync-tutors")({
  server: {
    handlers: {
      GET: async () => {
        const result = await runSync();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
      POST: async () => {
        const result = await runSync();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});