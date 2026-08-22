CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_places_user_id ON places (user_id);
