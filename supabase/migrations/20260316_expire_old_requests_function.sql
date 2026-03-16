-- Create the expire_old_requests RPC function
-- This updates status of requests whose expires_at has passed
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void AS $$
BEGIN
  UPDATE requests
  SET status = 'closed_expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
