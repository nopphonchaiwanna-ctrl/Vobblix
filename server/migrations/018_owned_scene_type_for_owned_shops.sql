-- 018: every shop with an owner renders from its own layout template.
--
-- resolveScene() (src/scenes/index.js) only used a shop's chosen layout
-- and theme when scene_type = 'owned'. Shops 111 and 222 started as
-- plain rooms and were turned into admin central shops by hand
-- (2026-10-13) without changing scene_type, so saving a new layout or
-- theme for them was stored but never drawn. resolveScene now also
-- keys off owner_user_id; this brings the data in line.
UPDATE shops
SET scene_type = 'owned'
WHERE owner_user_id IS NOT NULL AND scene_type <> 'owned';
