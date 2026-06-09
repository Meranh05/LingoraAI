import { NextResponse } from "next/server";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const viewer = await getOptionalViewer();
  if (viewer?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("training_candidates")
    .select("id,anonymized_input,anonymized_output,preferred_output")
    .eq("review_status", "approved")
    .order("created_at")
    .limit(10_000);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const jsonl = (data ?? [])
    .map((row) =>
      JSON.stringify({
        messages: [
          { role: "user", content: row.anonymized_input },
          {
            role: "assistant",
            content: row.preferred_output || row.anonymized_output,
          },
        ],
        metadata: { source: "lingora-consented-feedback", candidate_id: row.id },
      }),
    )
    .join("\n");

  return new NextResponse(jsonl, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Content-Disposition": 'attachment; filename="lingora-training.jsonl"',
      "Cache-Control": "private, no-store",
    },
  });
}
