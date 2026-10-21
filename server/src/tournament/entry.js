// Who gets into an event, and in what order (event-day design §2.2-2.3):
// first-come or lottery entry, a waitlist behind it, and - at start -
// the starting roster: approved (checked-in) entrants, with no-show
// spots filled from approved waitlisters in queue order. Pure, so the
// routes stay thin and every rule is unit-tested.

export function entryStatusOnRegister({ mode, maxPlayers, enteredCount, lotteryDrawn }) {
  if (mode === "lottery") return lotteryDrawn ? "waitlisted" : "pending_draw";
  return enteredCount < maxPlayers ? "entered" : "waitlisted";
}

/** Fisher-Yates over the applicants; the first maxPlayers get in, the rest queue in drawn order. */
export function drawLottery(applicantIds, maxPlayers, rng = Math.random) {
  const shuffled = [...applicantIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { entered: shuffled.slice(0, maxPlayers), waitlisted: shuffled.slice(maxPlayers) };
}

export function nextFromWaitlist(waitlisted) {
  const next = waitlisted
    .filter((w) => !w.dropped)
    .sort((a, b) => a.waitlistPosition - b.waitlistPosition)[0];
  return next ? next.id : null;
}

export function startingRoster({ entered, waitlisted, maxPlayers }) {
  const active = entered.filter((p) => !p.dropped);
  const starters = active.filter((p) => p.approved).map((p) => p.id);
  const noShows = active.filter((p) => !p.approved).map((p) => p.id);
  const fillers = waitlisted
    .filter((w) => !w.dropped && w.approved)
    .sort((a, b) => a.waitlistPosition - b.waitlistPosition);
  for (const w of fillers) {
    if (starters.length >= maxPlayers) break;
    starters.push(w.id);
  }
  return { starters, noShows };
}
