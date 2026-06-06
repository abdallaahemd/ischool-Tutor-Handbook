import { createServerFn } from "@tanstack/react-start";

export interface TutorRow {
  tutor_id: string;
  password: string;
  name: string;
}

export const importTutors = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { rows: TutorRow[]; filename?: string; imported_by?: string }) => {
      if (!input || !Array.isArray(input.rows)) throw new Error("rows required");
      const rows = input.rows
        .map((r) => ({
          tutor_id: String(r.tutor_id ?? "").trim().toUpperCase(),
          password: String(r.password ?? "").trim() || "P@ssword_1234",
          name: String(r.name ?? "").trim(),
        }))
        .filter((r) => r.tutor_id);
      if (rows.length === 0) throw new Error("No valid rows in CSV");
      if (rows.length > 5000) throw new Error("Too many rows (max 5000)");
      return {
        rows,
        filename: input.filename?.slice(0, 255) ?? null,
        imported_by: input.imported_by?.slice(0, 255) ?? null,
      };
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc(
      "sync_tutors_from_sheet" as never,
      { _rows: data.rows } as never,
    );
    if (error) {
      await supabaseAdmin.from("tutor_import_logs").insert({
        filename: data.filename,
        imported_by: data.imported_by,
        total_records: data.rows.length,
        failed_count: data.rows.length,
        status: "error",
      });
      throw new Error(error.message);
    }
    const counts = (result as {
      processed?: number;
      added?: number;
      updated?: number;
      deleted?: number;
    } | null) ?? {};
    await supabaseAdmin.from("tutor_import_logs").insert({
      filename: data.filename,
      imported_by: data.imported_by,
      total_records: counts.processed ?? data.rows.length,
      added_count: counts.added ?? 0,
      updated_count: counts.updated ?? 0,
      deleted_count: counts.deleted ?? 0,
      failed_count: 0,
      status: "success",
    });
    return {
      processed: counts.processed ?? data.rows.length,
      added: counts.added ?? 0,
      updated: counts.updated ?? 0,
      deleted: counts.deleted ?? 0,
      failed: 0,
    };
  });

export const listImportLogs = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tutor_import_logs")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return { logs: data ?? [] };
});