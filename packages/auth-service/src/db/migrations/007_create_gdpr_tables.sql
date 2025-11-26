-- GDPR Compliance Tables
-- Implements requirement 9.2, 9.4

-- User consents table
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'marketing', 'analytics')),
  granted BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(user_id, consent_type, created_at DESC);

-- Data export requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  download_url TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_export_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_status ON data_export_requests(status, requested_at);

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_deletion_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_scheduled ON data_deletion_requests(status, scheduled_for);

-- Add comments for documentation
COMMENT ON TABLE user_consents IS 'Stores user consent history for GDPR compliance';
COMMENT ON TABLE data_export_requests IS 'Tracks data export requests (Right to Data Portability)';
COMMENT ON TABLE data_deletion_requests IS 'Tracks data deletion requests (Right to be Forgotten)';

