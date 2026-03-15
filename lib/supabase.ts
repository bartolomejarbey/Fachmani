// Re-export browser client for backwards compatibility
// All "use client" components import from here
// For server components/route handlers, use lib/supabase/server.ts instead
export { supabase } from './supabase/client'
