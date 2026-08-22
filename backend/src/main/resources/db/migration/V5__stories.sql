CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    region_id UUID REFERENCES regions (id) ON DELETE SET NULL,
    place_id UUID REFERENCES places (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stories_user_id ON stories (user_id);
