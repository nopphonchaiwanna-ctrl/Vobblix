// Table numbers for a round (lobby-events design §5): every match plays
// at an "online table" - a call with no spot on the 3D floor - numbered
// 1, 2, 3... with the highest-scoring pairs first. The shop's real tables
// stay free for everyone else, however long the event runs. Byes get none.

export function assignTables(pairings) {
  const order = pairings
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.player2Id)
    .sort((a, b) => b.p.seedPoints - a.p.seedPoints || a.index - b.index);
  const numberOf = new Map(order.map(({ index }, i) => [index, i + 1]));
  return pairings.map((p, index) => {
    const tableNumber = numberOf.get(index) ?? null;
    return { ...p, tableNumber, tableOnline: tableNumber !== null };
  });
}
