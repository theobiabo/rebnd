CREATE TABLE github_connections (
  owner_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  github_installation_id bigint NOT NULL UNIQUE,
  account_login text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'revoked')) DEFAULT 'active',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE github_install_states (
  state_hash text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE github_deliveries (
  delivery_id uuid PRIMARY KEY,
  event text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE github_notifications (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  installation_id uuid NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  target_number integer NOT NULL,
  comment_id bigint,
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX github_notifications_pending ON github_notifications(available_at) WHERE status = 'pending';
CREATE TABLE github_notification_settings (
  installation_id uuid PRIMARY KEY REFERENCES installations(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  target_number integer NOT NULL CHECK(target_number > 0),
  enabled boolean NOT NULL DEFAULT true
);
