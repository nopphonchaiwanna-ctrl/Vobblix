// Socket.io ack with a deadline. `emit(ack)` sends the event with `ack`
// as its callback. Resolves {timedOut, payload} at the ack or the
// deadline, whichever comes first; an ack that turns up after the
// deadline goes to `onLate(payload)` instead, so the caller can undo
// whatever the server did after the client already gave up on it.

export function emitWithTimeout(emit, ms, onLate) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      resolve({ timedOut: true, payload: undefined });
    }, ms);
    emit((payload) => {
      if (settled) {
        onLate(payload);
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({ timedOut: false, payload });
    });
  });
}
