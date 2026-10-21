// Table numbers for a round (event-day design §2.5): numbered 1, 2, 3...
// with the highest-scoring pairs on the shop's real tables first (like a
// feature table), and any pairs beyond the shop's table count on
// "online tables" - a call with no spot on the 3D floor. Byes get none.

export function assignTables(pairings, physicalTableCount) {
  const order = pairings
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => p.player2Id)
    .sort((a, b) => b.p.seedPoints - a.p.seedPoints || a.index - b.index);
  const numberOf = new Map(order.map(({ index }, i) => [index, i + 1]));
  return pairings.map((p, index) => {
    const tableNumber = numberOf.get(index) ?? null;
    return { ...p, tableNumber, tableOnline: tableNumber !== null && tableNumber > physicalTableCount };
  });
}
