CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories (id) ON DELETE SET NULL,
    place_id UUID REFERENCES places (id) ON DELETE SET NULL,
    visit_id UUID REFERENCES visits (id) ON DELETE SET NULL,
    file_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_user_id ON photos (user_id);
