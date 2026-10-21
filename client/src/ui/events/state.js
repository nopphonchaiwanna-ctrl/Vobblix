// What the event views show, worked out from GET /events/:id - pure, so
// it's unit-tested (client/test/eventState.test.js) and the views stay
// plain rendering. `view` is that response; `userId` is the viewer.

const RUNNING = ["swiss", "bracket"];

function hasCut(event) {
  return event.format === "swiss_cut" && event.cutEnabled !== false;
}

export function eventSteps(event) {
  const swissRound = event.currentPhase === "swiss" && event.status === "swiss" ? event.currentRound : event.roundCount;
  const steps = [
    { id: "registration", label: "Register" },
    { id: "check_in", label: "Check-in" },
    { id: "swiss", label: event.roundCount ? `Swiss ${swissRound}/${event.roundCount}` : "Swiss" },
    ...(hasCut(event) ? [{ id: "bracket", label: `Top ${event.effectiveCutSize || event.configuredCutSize}` }] : []),
    { id: "completed", label: "Done" },
  ];
  const order = steps.map((s) => s.id);
  const nowIndex = event.status === "cancelled" ? -1 : order.indexOf(event.status);
  return steps.map((s, i) => ({ ...s, state: nowIndex < 0 ? "todo" : i < nowIndex ? "done" : i === nowIndex ? "now" : "todo" }));
}

function me(view, userId) {
  return view.players.find((p) => p.userId === userId) || null;
}

export function myMatch(view, userId) {
  const mine = me(view, userId);
  if (!mine) return null;
  return view.currentRoundMatches.find((m) => m.player1Id === mine.id || m.player2Id === mine.id) || null;
}

/** The "what to do now" card for a player (or would-be player). */
export function playerAction(view, userId) {
  const { event } = view;
  const mine = me(view, userId);
  const active = mine && !mine.dropped;

  if (event.status === "registration" || event.status === "check_in") {
    if (!active) {
      const entered = view.players.filter((p) => !p.dropped && p.entryStatus === "entered").length;
      const label =
        event.status === "check_in" || (event.registrationMode === "first_come" && entered >= event.maxPlayers) || event.lotteryDrawnAt
          ? "Join the waitlist"
          : event.registrationMode === "lottery"
            ? "Enter the draw"
            : "Register";
      return { kind: "register", label };
    }
    if (mine.entryStatus === "pending_draw") return { kind: "pending_draw" };
    if (event.status === "registration") {
      return mine.entryStatus === "waitlisted" ? { kind: "waitlisted", position: mine.waitlistPosition } : { kind: "registered" };
    }
    const waitlisted = mine.entryStatus === "waitlisted";
    if (mine.checkedInAt) return { kind: "ready", waitlisted, position: mine.waitlistPosition };
    if (mine.checkInRequestedAt) return { kind: "awaiting_approval", waitlisted, position: mine.waitlistPosition };
    return { kind: "check_in", waitlisted, position: mine.waitlistPosition };
  }

  if (RUNNING.includes(event.status)) {
    const competing = active && mine.entryStatus === "entered" && !mine.noShow;
    if (!competing) return { kind: "none" };
    const match = myMatch(view, userId);
    if (!match) return { kind: "eliminated" };
    if (!match.player2Id) return { kind: "bye", match };
    const side = match.player1Id === mine.id ? "player1" : "player2";
    const opponentId = side === "player1" ? match.player2Id : match.player1Id;
    const opponent = view.players.find((p) => p.id === opponentId) || null;
    return { kind: "match", match, side, opponent };
  }

  if (event.status === "completed" && mine && mine.finalRank) {
    return { kind: "done", finalRank: mine.finalRank, finalLabel: mine.finalLabel };
  }
  return { kind: "none" };
}

/** The organizer's action bar for the event's current stage. */
export function organizerActions(view) {
  const { event } = view;
  const actions = [];
  const live = view.players.filter((p) => !p.dropped);
  if (event.status === "registration") {
    if (event.registrationMode === "lottery" && !event.lotteryDrawnAt) {
      actions.push({ id: "draw", label: `Run the draw (${live.length} entered)`, primary: true });
    } else {
      actions.push({ id: "open_check_in", label: "Open check-in", primary: true });
    }
  } else if (event.status === "check_in") {
    const inShop = new Set(view.inShopUserIds || []);
    const present = live.filter((p) => inShop.has(p.userId)).length;
    const approved = live.filter((p) => p.checkedInAt).length;
    actions.push({ id: "auto_check_in", label: `Auto check-in (${present} in shop)`, disabled: present === 0 });
    actions.push({ id: "start", label: `Start (${approved} checked in)`, primary: true, disabled: approved < 2 });
  } else if (RUNNING.includes(event.status)) {
    const allIn = view.currentRoundMatches.length > 0 && view.currentRoundMatches.every((m) => m.result);
    const lastSwiss = event.currentPhase === "swiss" && event.currentRound >= event.roundCount;
    actions.push({ id: "notify_pairings", label: "Send pairing alerts" });
    actions.push({
      id: "next_round",
      label: lastSwiss ? (hasCut(event) ? "Finish Swiss - start top cut" : "Finish event") : "Next round",
      primary: true,
      disabled: !allIn,
    });
  }
  if (event.status !== "completed" && event.status !== "cancelled") actions.push({ id: "more", label: "⋯" });
  return actions;
}
