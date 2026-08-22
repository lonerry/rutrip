CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id),
    CONSTRAINT friendships_unique_pair UNIQUE (requester_id, addressee_id)
);

CREATE INDEX idx_friendships_addressee ON friendships (addressee_id, status);
CREATE INDEX idx_friendships_requester ON friendships (requester_id, status);
