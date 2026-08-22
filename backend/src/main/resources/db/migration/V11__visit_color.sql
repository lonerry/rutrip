ALTER TABLE visits
    ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#3b82f6';

UPDATE visits v
SET color = u.map_color
FROM users u
WHERE u.id = v.user_id
  AND u.map_color ~ '^#[0-9A-Fa-f]{6}$';
