// "Perfect negotiation" decisions for the mesh call (see callManager.js).
// Two peers can each send an offer at the same moment - most often both
// turning their camera on together at the start of a match. Without a
// rule, both offers get rolled back and neither side's video arrives.
// One side of each pair is "polite": on a collision it gives way (takes
// the other's offer, then re-sends its own); the impolite side ignores
// the incoming offer and keeps waiting for the answer to its own.

/** Deterministic per pair: the smaller socket id is the polite one. */
export function isPolite(myId, peerId) {
  return myId < peerId;
}

export function offerCollision({ polite, makingOffer, signalingState }) {
  const collision = makingOffer || signalingState !== "stable";
  return { collision, ignore: collision && !polite };
}

/** An answer only means something while our own offer is pending. */
export function shouldIgnoreAnswer(signalingState) {
  return signalingState !== "have-local-offer";
}
