# VobbLiX — Status audit (2026-10-17)

ตรวจจาก `CLAUDE.md` (Open items), `PRODUCT.md`, `README.md` (Roadmap), โค้ดใน
`client/` + `server/` และ query แบบ read-only กับ Neon. ไม่มีการแก้ไฟล์อื่น.

## สรุปตาราง

ขนาดงาน: **S** ≤ ครึ่งวัน · **M** 1–3 วัน · **L** หนึ่งสัปดาห์ขึ้นไป

| ระบบ | สถานะ | สิ่งที่ขาด | ขนาดงาน | ต้องทำก่อนเปิดใช้จริงไหม |
|---|---|---|---|---|
| Migrations (Neon) | ✅ ครบ | `schema_migrations` บน Neon มี 001–016 ตรงกับไฟล์ local ทุกไฟล์ (016 รันเมื่อ 2026-10-16) | – | – |
| แปลการ์ดภาษาไทย (batch1/batch2 + backfill) | ✅ ครบ (ตรวจแล้ว) | สุ่ม 40 แถวจากแต่ละ batch เจอบน Neon ครบ 40/40; การ์ดที่ยังไม่แปลแต่มีข้อความซ้ำกับใบที่แปลแล้ว = 0 → backfill รันแล้ว. ยังแปลแล้ว 7,649 / 16,546 ใบ (ที่เหลือแปลแบบ lazy ตอนเปิดดู). ควรขีดข้อ 4 ใน CLAUDE.md ออก | S | ไม่ |
| Click-test ฟลว์รีวิวร้าน / แจ้งเตือน | ⚠️ ยังไม่เคยเทสจริง | ทุกข้อใน CLAUDE.md #3: Lobby→Events→Back, ปฏิเสธร้านโดยไม่กรอกเหตุผล, notification แบบ offline, แบนเนอร์สีแดง + "Save & resubmit", แท็บ Review history | S | **ใช่** |
| Git / commit | ⚠️ ค้าง | ยังไม่ได้ commit อะไรเลยหลัง `demo_event`: 21 ไฟล์ที่แก้ + ไฟล์ใหม่จำนวนมาก (migration 009–016, cards/decks/notifications, services) | S | **ใช่** (ก่อน deploy) |
| Automated tests | ❌ ไม่มีเลย | ไม่มีไฟล์เทสหรือ script `test`. จุดที่ควรมีเทสก่อน: `tournament/swiss.js` + `bracket.js` (pairing, OPW), `ORDER_TRANSITIONS`, auth/verify/reset, `decklogImport` | M–L | **ใช่** (อย่างน้อย swiss/bracket/auth/orders) |
| Rate limiting | ✅ ทำแล้ว (2026-10-18) | `server/src/middleware/rateLimit.js`: ทั้ง API 300/นาที/IP; login 10/15 นาที; register 5/ชม.; อีเมล (resend/forgot) 5/ชม.; `/cards/:no` 60/นาที/บัญชี; `/decks/import` 10/10 นาที/บัญชี; socket chat 8 ข้อความ/10 วิ (แจ้ง toast), move 40/วิ. เหลือ: store เป็น in-memory ใช้ได้กับ server ตัวเดียว ถ้าขยายหลาย instance ต้องย้ายไป Redis | – | – |
| Error handling (server) | ✅ เกือบครบ (2026-10-18) | มี 404 JSON + error middleware กลาง (413/400/22P02→404/500 แบบไม่เผย stack), `unhandledRejection` log, SIGTERM/SIGINT ปิด socket + pg pool. เหลือ: structured logging / error tracking (เช่น Sentry) | S | ไม่ (ควรมีหลัง launch) |
| Security hardening | ⚠️ ทำไปส่วนใหญ่ (2026-10-18) | ทำแล้ว: `helmet`, CORS REST+socket จำกัดตาม `CORS_ORIGINS`/`CLIENT_URL` ใน production (ไม่ตั้ง = ไม่ start), `trust proxy` สำหรับ Render. เหลือ: `join-shop` ยังสร้างแถว shop ใหม่จากโค้ดอะไรก็ได้; JSON body limit 2mb ทุก route; pg `sslmode` warning (pg v9) | S | ใช่ (`join-shop`) |
| Deploy (Cloudflare Pages + Render + Neon) | ❌ ยังไม่เริ่ม | ไม่มี config deploy, branch `prod` ยังไม่ได้ใช้. client ต้องตั้ง `VITE_SERVER_URL` (fallback ปัจจุบันคือ `http://<host>:3001` ซึ่งใช้บน prod ไม่ได้); ต้องตั้ง env ฝั่ง server; ลิงก์ในอีเมล verify/reset ต้องชี้โดเมนจริง; Render free tier หลับเองแล้วตัด socket | M | **ใช่** |
| TURN server | ❌ ไม่มี | `callManager.js` ใช้ STUN ของ Google อย่างเดียว ผู้ใช้ที่อยู่หลัง NAT แบบ symmetric (เครือข่ายมือถือไทยหลายเจ้า) จะต่อ voice/video ไม่ติด | M | **ใช่**, ถ้าจะโฆษณาว่ามี voice/video |
| Card catalog (หน้าดูการ์ด) | ⚠️ มี backend ไม่มี UI | มี `GET /cards` และ `/cards/:cardNumber` แต่ client ไม่ได้เรียกเลย การ์ดโผล่แค่ในหน้ารายละเอียดเด็ค ทั้งที่ CLAUDE.md บอกว่า "browse a Vanguard card catalog" เป็นฟีเจอร์หลัก | M | แล้วแต่ scope (ถ้าเป็นจุดขาย = ใช่) |
| Events: แก้ไข / ยกเลิก | ⚠️ backend ไม่ครบ | schema มีสถานะ `cancelled` แล้ว แต่ไม่มี route สำหรับยกเลิกหรือแก้ไข event (มีแค่ create/register/drop/start/report/override/advance) ผู้จัดยกเลิกหรือแก้เวลา/จำนวนคนไม่ได้ | S–M | **ใช่** |
| ลบบัญชี | ⚠️ มีแต่ฝั่งผู้ใช้ | ผู้ใช้ส่งคำขอได้ (`account_deletion_requests`) แต่ไม่มี admin route/UI จัดการ ต้องให้แอดมิน query เอง (มีคอมเมนต์ใน `routes/account.js`). ตาม PDPA ควรมีขั้นตอนที่ทำได้จริง | S–M | **ใช่** (PDPA) |
| Decklog `decklog_jp` | ⚠️ ยังไม่เคยเทส end-to-end | ยังไม่มีโค้ดเด็ค JP จริงไว้เทส (CLAUDE.md #5) | S | ควรทำ |
| Script `import-vanguard-cards.js` | ✅ เกือบเสร็จ | ค่า default `--to` ในโค้ดเป็น `DZ-BT17` แล้ว (บรรทัด 66) เหลือแค่คอมเมนต์ usage บรรทัด 41 ที่ยังเขียน `DZ-BT08` | S | ไม่ |
| UI audit (Impeccable) | ⏳ ยังไม่เริ่ม | audit หน้า My Shop + Admin; ข้อความ 11px, `border-left` หนา 2 จุด (รวม `.review-banner`) | S–M | ไม่ (แต่ควรทำ) |
| i18n ไทย/อังกฤษ | ❌ ยังไม่เริ่ม | ข้อความ UI ทั้งหมดเป็นอังกฤษ hardcode ใน `index.html` + `ui/*.js`; ต้องมีระบบ string table + ตัวสลับภาษา + ฟอนต์/line-height สำหรับภาษาไทย | L | **ใช่** สำหรับกลุ่มผู้ใช้ไทย (PRODUCT.md กำหนดให้ "must support") |
| SMS OTP | ❌ ยังไม่เริ่ม (scope ยังไม่ได้ตัดสิน) | ต้องเลือกระหว่าง sellers only กับ both sides + ใช้ gateway ไทย (ThaiBulkSMS) | M | ไม่ (ทำทีหลังได้ ถ้าตอนแรกจำกัดร้านด้วย admin review) |
| Marketplace ↔ การ์ด | ❌ ยังไม่เริ่ม | listing ยังเป็น title/ราคาอิสระ ไม่ได้ผูกกับ `cards` | M | ไม่ |
| Event decklists | ❌ ยังไม่เริ่ม | `010_cards_catalog.sql` วางไว้เป็น "Phase 3" แต่ยังไม่มีตาราง/route ที่ผูก deck กับ event | M | ไม่ |
| Payment gateway | ❌ ยังไม่เริ่ม (ตั้งใจไว้) | คอลัมน์ `payment_provider`/`payment_reference` เตรียมไว้แล้ว | L | ไม่ |
| Owner sprite upload (`shops.assets`) | ❌ ยังไม่เริ่ม | ฝั่ง client ยังไม่อ่าน `assets` และยังไม่มี UI upload/moderation | M | ไม่ |
| Multiple shops ต่อ owner | ❌ ถูกจำกัดโดยตั้งใจ | `shops_one_per_owner_idx` | M | ไม่ |
| Card-game logic ที่โต๊ะ / sprite art / SFU | ❌ ยังไม่เริ่ม | ตาม Roadmap | L | ไม่ |
| `prisma/` | ⚠️ ค้าง | CLAUDE.md บอกว่า stale แต่ `@prisma/client` ยังอยู่ใน `dependencies` ของ runtime (ทำให้ install บน Render หนักขึ้น) | S | ไม่ (ควรย้ายไป dev หรือลบ) |

## ลำดับที่แนะนำก่อนเปิดใช้จริง

1. Click-test (#3) → commit บน `dev`
2. ~~Error middleware + rate limiting + จำกัด CORS/socket origin + helmet~~ (ทำแล้ว 2026-10-18; เหลือจำกัด `join-shop`)
3. Route ยกเลิก/แก้ไข event + ขั้นตอนลบบัญชีฝั่ง admin
4. Tests ขั้นต่ำ: swiss/bracket, order transitions, auth flows
5. TURN (เช่น coturn หรือบริการ TURN ที่มีแผนฟรี) + ตั้งค่า deploy (`VITE_SERVER_URL`, env, URL ในอีเมล)
6. i18n ไทย/อังกฤษ (งานใหญ่สุดในกลุ่มต้องทำ)

## หมายเหตุวิธีตรวจ

- Neon: `BEGIN READ ONLY` → อ่าน `schema_migrations`, นับ `cards.skill_text_th`,
  สุ่มเช็กข้อความจาก `server/sql/batch1-*.sql` และ `batch2-*.sql` → `ROLLBACK`
- จำนวนผู้ใช้บน Neon ตอนตรวจ: admin 1, shop_owner 1, customer 2 (มีแต่บัญชีทดสอบ)
- grep `TODO|FIXME|not built yet|planned`: ในโค้ดไม่มี TODO/FIXME จริง มีแต่คอมเมนต์
  ที่อ้างหัวข้อ README เก่า ("Planned: tournament/event system", "Planned: mandatory
  email verification") ซึ่งทำเสร็จแล้ว แต่หัวข้อใน README ไม่ได้ชื่อนี้แล้ว → คอมเมนต์อ้างอิงผิดที่
