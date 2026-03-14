import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await request.json();
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get document record
  const { data: doc } = await supabaseAdmin
    .from("client_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Update status to processing
  await supabaseAdmin
    .from("client_documents")
    .update({ ocr_status: "processing" })
    .eq("id", documentId);

  // MOCK OCR — simulate extracting data from document
  // In production, would call Google Vision API or Mindee
  await new Promise((resolve) => setTimeout(resolve, 800));

  const mockOcrData = {
    amount: Math.round(Math.random() * 50000 + 1000),
    date: new Date().toISOString().split("T")[0],
    vendor: ["Česká spořitelna", "Allianz", "ČSOB", "KB", "mBank", "Air Bank"][Math.floor(Math.random() * 6)],
    ico: `${Math.floor(Math.random() * 90000000 + 10000000)}`,
    currency: "CZK",
    document_type: doc.category === "contract" ? "smlouva" : doc.category === "invoice" ? "faktura" : "doklad",
  };

  const mockOcrText = `Dodavatel: ${mockOcrData.vendor}\nIČO: ${mockOcrData.ico}\nČástka: ${mockOcrData.amount} ${mockOcrData.currency}\nDatum: ${mockOcrData.date}\nTyp: ${mockOcrData.document_type}`;

  // Save OCR results
  await supabaseAdmin
    .from("client_documents")
    .update({
      ocr_text: mockOcrText,
      ocr_data: mockOcrData,
      ocr_status: "done",
    })
    .eq("id", documentId);

  return NextResponse.json({
    ok: true,
    ocr_data: mockOcrData,
    ocr_text: mockOcrText
  });
}
