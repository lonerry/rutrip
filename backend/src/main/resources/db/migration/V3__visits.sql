CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions (id) ON DELETE CASCADE,
    visited_at DATE,
    note VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, region_id)
);

CREATE INDEX idx_visits_user_id ON visits (user_id);
CREATE INDEX idx_visits_region_id ON visits (region_id);
