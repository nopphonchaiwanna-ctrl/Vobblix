// Client half of the match-table lock (event-day design §2.6): the call
// is a mesh, so a spectator with a modified client could still send
// audio/video straight to us. The server tells us who may speak at this
// table (`speakerUserIds`); we simply don't play anyone else.

export function shouldPlayPeerMedia({ peerUserId, speakerUserIds }) {
  if (!speakerUserIds) return true;
  return !!peerUserId && speakerUserIds.has(peerUserId);
}
