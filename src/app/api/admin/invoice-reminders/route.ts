import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const now = new Date();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, advisor_id, amount, due_date, status")
    .eq("status", "unpaid")
    .lt("due_date", now.toISOString());

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  let updated = 0;
  for (const inv of invoices) {
    const dueDate = new Date(inv.due_date);
    const daysPast = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let newStatus = inv.status;
    if (daysPast >= 30) newStatus = "overdue_30";
    else if (daysPast >= 14) newStatus = "overdue_14";
    else if (daysPast >= 7) newStatus = "overdue_7";

    if (newStatus !== inv.status) {
      await supabase.from("invoices").update({ status: newStatus }).eq("id", inv.id);
      updated++;
    }
  }

  return NextResponse.json({ updated, total: invoices.length });
}
