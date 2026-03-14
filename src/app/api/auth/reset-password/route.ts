import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token a heslo jsou povinné." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate token
  const { data: resetToken } = await supabase
    .from("password_reset_tokens")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!resetToken) {
    return NextResponse.json(
      { error: "Neplatný nebo expirovaný odkaz. Vyžádejte nový." },
      { status: 400 }
    );
  }

  // Find user by email
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email === resetToken.email);

  if (!user) {
    return NextResponse.json({ error: "Uživatel nenalezen." }, { status: 400 });
  }

  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateError) {
    return NextResponse.json({ error: "Nepodařilo se změnit heslo." }, { status: 500 });
  }

  // Mark token as used
  await supabase
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("id", resetToken.id);

  return NextResponse.json({ ok: true });
}
