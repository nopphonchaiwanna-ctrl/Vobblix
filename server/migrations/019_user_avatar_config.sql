-- The player's 3D shop character: { "v": 1, "character": "<id>", "color": "#rrggbb" }.
-- JSONB (not two columns) so later customization levels - separate
-- head/hair/outfit parts, unlockable items - can add keys without
-- another schema change. NULL = never picked (default character).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB;
