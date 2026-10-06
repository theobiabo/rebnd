CREATE TABLE installations (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  document jsonb NOT NULL,
  UNIQUE (owner_id, id)
);
CREATE INDEX installations_owner_idx ON installations(owner_id);
CREATE TABLE workflow_revisions (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id),
  UNIQUE (installation_id, id)
);
CREATE INDEX workflow_installation_idx ON workflow_revisions(owner_id, installation_id);
CREATE TABLE changes (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  identity text NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id),
  UNIQUE (installation_id, identity),
  UNIQUE (installation_id, id)
);
CREATE TABLE runs (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  run_key text NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id),
  UNIQUE (installation_id, run_key),
  UNIQUE (installation_id, id)
);
CREATE UNIQUE INDEX runs_one_active_idx ON runs(installation_id) WHERE document->>'status' IN ('queued', 'running');
CREATE TABLE evidence (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  run_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id),
  FOREIGN KEY (installation_id, run_id) REFERENCES runs(installation_id, id),
  FOREIGN KEY (installation_id, workflow_id) REFERENCES workflow_revisions(installation_id, id)
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id)
);
CREATE INDEX audit_installation_idx ON audit_events(owner_id, installation_id);
CREATE TABLE idempotency_keys (
  owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, key)
);
CREATE TABLE jobs (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  installation_id uuid NOT NULL,
  run_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'leased', 'completed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  lease_token uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (owner_id, installation_id) REFERENCES installations(owner_id, id),
  FOREIGN KEY (installation_id, run_id) REFERENCES runs(installation_id, id)
);
CREATE INDEX jobs_available_idx ON jobs(status, available_at);
CREATE TABLE api_rate_limits (
  owner_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
