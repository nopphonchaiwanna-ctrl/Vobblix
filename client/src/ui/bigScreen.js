// Which call tile fills the big screen while seated at a table (the
// "C1" layout): players point their cameras at their own side of the
// play mat, so by default you watch someone else's camera, not yours.

export function pickBigTile(tiles, pinnedId) {
  if (pinnedId && tiles.some((t) => t.id === pinnedId)) return pinnedId;
  const peerWithVideo = tiles.find((t) => !t.isLocal && t.videoOn);
  if (peerWithVideo) return peerWithVideo.id;
  const local = tiles.find((t) => t.isLocal && t.videoOn);
  if (local) return local.id;
  return tiles.find((t) => !t.isLocal)?.id ?? null;
}
