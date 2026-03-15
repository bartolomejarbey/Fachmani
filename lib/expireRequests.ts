import { supabase } from "./supabase";

export async function expireOldRequests() {
  const { error } = await supabase.rpc('expire_old_requests');
  if (error) {
    console.error('Failed to expire old requests:', error.message);
  }
}
