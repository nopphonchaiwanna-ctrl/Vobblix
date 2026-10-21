// Which model to draw for a player's avatar_config (see
// server/src/avatarConfig.js). Unknown ids - a renamed asset, or a pick
// saved by a newer client - quietly fall back to the default.

export function resolveCharacter(avatarConfig, characters, defaultId) {
  const found = characters.find((c) => c.id === avatarConfig?.character) || characters.find((c) => c.id === defaultId);
  return { id: found.id, file: found.file, color: avatarConfig?.color || null };
}
