import { supabase } from "./supabase";

export async function expireOldRequests() {
  await supabase.rpc('expire_old_requests');
}