-- Migration: 003_identity_mfa.sql
-- Description: Add MFA capabilities, session management, and audit tracking for identity lifecycle.

-- 1. Add MFA and session columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_method TEXT NOT NULL DEFAULT 'TOTP';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Enforce MFA for Platform Administrator by default (Tender High-Security Requirement)
UPDATE users 
SET mfa_enabled = true, mfa_secret = 'JBSWY3DPEHPK3PXP' -- standard base32 test secret
WHERE email = 'admin@smartlight.os';

-- 3. Create user_sessions table for active token tracking and revocation
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    mfa_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

-- 4. Record migration in schema_migrations
INSERT INTO schema_migrations (version, name) VALUES
  ('003', '003_identity_mfa.sql')
ON CONFLICT (version) DO NOTHING;
