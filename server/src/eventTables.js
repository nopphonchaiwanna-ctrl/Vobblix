// Which tables in a shop are hosting a match right now, and who may
// speak at each (event-day design §2.5-2.6). The socket layer reads this
// for online-table joins, the speaker/spectator split and the camera
// lock; the event routes refresh it whenever a round starts or ends.
//
// In-shop tables keep their scene ids ("table-3"); online tables are
// "event:<eventId>:t<number>" - a call with no spot on the 3D floor.

import { pool } from "./db/pool.js";
import { getShopById } from "./db/shops.js";
import { resolveScene } from "./scenes/index.js";
import { speakerUserIds } from "./tournament/speakers.js";
import { listPlayers, tableRoomName } from "./rooms.js";

const TTL_MS = 5000;
const cache = new Map(); // shopDbId -> { at, tables: Map }

export function onlineTableId(eventId, tableNumber) {
  return `event:${eventId}:t${tableNumber}`;
}

async function load(shopDbId) {
  const shop = await getShopById(shopDbId);
  const tables = new Map();
  if (!shop) return { shop, tables };
  const scene = resolveScene(shop);
  const { rows } = await pool.query(
    `SELECT m.id AS match_id, m.event_id, m.table_number, m.table_online,
            p1.user_id AS u1, p2.user_id AS u2, p1.dropped AS d1, p2.dropped AS d2
     FROM tournament_matches m
     JOIN tournament_events e ON e.id = m.event_id
     JOIN tournament_players p1 ON p1.id = m.player1_id
     LEFT JOIN tournament_players p2 ON p2.id = m.player2_id
     WHERE e.shop_id = $1 AND e.status IN ('swiss', 'bracket')
       AND m.phase = e.current_phase AND m.round_number = e.current_round AND m.table_number IS NOT NULL
     ORDER BY e.started_at, m.table_number`,
    [shopDbId]
  );
  const eventIds = [...new Set(rows.map((r) => r.event_id))];
  const judges = eventIds.length
    ? (await pool.query(`SELECT event_id, user_id FROM event_judges WHERE event_id = ANY($1::uuid[])`, [eventIds])).rows
    : [];
  for (const r of rows) {
    const staff = [shop.owner_user_id, ...judges.filter((j) => j.event_id === r.event_id).map((j) => j.user_id)].filter(Boolean);
    const sceneTable = r.table_online ? null : scene.TABLES[r.table_number - 1];
    const tableId = sceneTable ? sceneTable.id : onlineTableId(r.event_id, r.table_number);
    if (tables.has(tableId)) continue; // two events on one floor: the earlier-started one keeps the table
    // A player dropped mid-round (e.g. disqualified) loses their voice here.
    const speakingPlayers = [r.d1 ? null : r.u1, r.d2 ? null : r.u2];
    tables.set(tableId, {
      eventId: r.event_id,
      matchId: r.match_id,
      tableNumber: r.table_number,
      online: !sceneTable,
      table: sceneTable,
      playerUserIds: [r.u1, r.u2].filter(Boolean),
      staffUserIds: new Set(staff),
      speakerUserIds: speakerUserIds({ playerUserIds: speakingPlayers, staffUserIds: staff }),
    });
  }
  return { shop, tables };
}

/** Map<tableId, info> for the shop's running events (cached a few seconds). */
export async function activeMatchTables(shopDbId) {
  const hit = cache.get(shopDbId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tables;
  const { tables } = await load(shopDbId);
  cache.set(shopDbId, { at: Date.now(), tables });
  return tables;
}

export function invalidateEventTables(shopDbId) {
  cache.delete(shopDbId);
}

/**
 * After a round starts/ends: recompute, re-label everyone already in a
 * table call (speaker or spectator), and tell each table room its lock
 * (`speakerUserIds`, or null once the table is free again).
 */
export async function refreshEventTables(io, shopDbId) {
  invalidateEventTables(shopDbId);
  const { shop, tables } = await load(shopDbId);
  cache.set(shopDbId, { at: Date.now(), tables });
  if (!shop) return;
  const roomId = shop.code;
  const tableIds = new Set([...resolveScene(shop).TABLES.map((t) => t.id), ...tables.keys()]);
  for (const p of listPlayers(roomId)) if (p.tableId?.startsWith("event:")) tableIds.add(p.tableId);
  for (const tableId of tableIds) {
    const info = tables.get(tableId);
    for (const p of listPlayers(roomId)) {
      if (p.tableId !== tableId || !p.inCall) continue;
      p.callRole = !info || info.speakerUserIds.has(p.userId) ? "speaker" : "spectator";
    }
    io.to(tableRoomName(roomId, tableId)).emit("table-lock", {
      tableId,
      speakerUserIds: info ? [...info.speakerUserIds] : null,
    });
  }
}
