# Deploy VobbLiX (แผนฟรี)

คู่มือนี้ใช้ขึ้น **เว็บเทส** จาก branch `dev` ส่วนเว็บจริง (`prod`) จะทำทีหลังด้วยขั้นตอนเดียวกัน แต่แยก service แยก database

| ส่วน | ไปอยู่ที่ | แผน |
|---|---|---|
| client (หน้าเว็บ + Phaser) | Cloudflare Pages | ฟรี |
| server (Express + Socket.io) | Render (region Singapore) | ฟรี: หลับเมื่อว่าง 15 นาที ตื่นช้า ~30–60 วินาที |
| database | Neon (branch หลัก ใช้ร่วมกับเครื่อง dev) | ฟรี |
| TURN (voice/video) | Cloudflare Realtime TURN | ฟรี 1,000 GB/เดือน แล้ว $0.05/GB |
| อีเมล | Gmail SMTP (ค่าเดิมใน `server/.env`) | ฟรี ประมาณ 500 ฉบับ/วัน |

Deploy อัตโนมัติทุกครั้งที่ push ขึ้น branch **`dev`**

ลำดับ: Neon → push `dev` → Render → Cloudflare Pages → กลับไปกรอก URL ใน Render → TURN → ทดสอบ

---

## 1. Neon: database

เว็บเทสใช้ branch หลักของ Neon ตัวเดียวกับที่เครื่อง dev ใช้อยู่ (ค่า `DATABASE_URL` ใน `server/.env`) ไม่ต้องสร้างอะไรเพิ่ม ข้อมูลเทสจะเห็นร่วมกันทั้งในเครื่องและบนเว็บ

ตอนทำเว็บจริงค่อยสร้าง Neon branch `production` แยก (Branches → Create branch)

## 2. push โค้ดขึ้น `dev`

ให้ Claude ทำ (หรือรันเอง):

```bash
git push origin dev
```

## 3. Render: server

1. สมัครหรือ login [render.com](https://render.com) ด้วย GitHub บัญชี `nopphonchaiwanna-ctrl` แล้วอนุญาตให้เข้าถึง repo `Vobblix`
2. **New** → **Blueprint** → เลือก repo `Vobblix` Render จะอ่าน `render.yaml` แล้วสร้าง service `vobblix-dev` ให้เอง
3. Render จะถามค่าที่ต้องกรอกเอง:

| ช่อง | ใส่อะไร |
|---|---|
| `DATABASE_URL` | ค่าเดียวกับใน `server/.env` (ขั้นที่ 1) |
| `CLIENT_URL` | ใส่ `https://example.com` ไปก่อน จะกลับมาแก้ในขั้นที่ 5 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | ก๊อปค่าเดียวกับใน `server/.env` (Gmail) |
| `GEMINI_API_KEY` | ค่าเดียวกับใน `server/.env` |
| `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | เว้นว่างไปก่อน จะใส่ในขั้นที่ 6 |

`JWT_SECRET` ไม่ต้องกรอก Render สุ่มให้เอง ส่วน `NODE_ENV` ตั้งไว้ใน `render.yaml` แล้ว

4. กด **Apply** แล้วรอ build เสร็จ จะได้ URL แบบ `https://vobblix-dev.onrender.com`
5. เปิด `https://<URL ของ Render>/health` ต้องเห็น `{"ok":true}`

> ถ้า deploy ไม่ผ่านพร้อมข้อความ `Set CORS_ORIGINS (or CLIENT_URL) in production` แปลว่า `CLIENT_URL` ว่างอยู่ ให้ใส่ค่าชั่วคราวไปก่อน

## 4. Cloudflare Pages: client

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → เลือก repo `Vobblix`
2. ตั้งค่า build:

| ช่อง | ค่า |
|---|---|
| Production branch | `dev` |
| Framework preset | None |
| Root directory | `client` |
| Build command | `npm run build` |
| Build output directory | `dist` |

3. **Environment variables** (Production):

| ตัวแปร | ค่า |
|---|---|
| `VITE_SERVER_URL` | URL ของ Render จากขั้นที่ 3 เช่น `https://vobblix-dev.onrender.com` |
| `NODE_VERSION` | `22` |

4. **Save and Deploy** จะได้ URL แบบ `https://vobblix-dev.pages.dev`

> `VITE_SERVER_URL` ถูกฝังลงตอน build ถ้าแก้ค่านี้ทีหลัง ต้อง **Retry deployment** ใน Pages ด้วย

## 5. กลับไปที่ Render: ใส่ URL ของ Pages

Render → `vobblix-dev` → **Environment** → แก้ `CLIENT_URL` เป็น URL ของ Pages เช่น `https://vobblix-dev.pages.dev` (ไม่มี `/` ท้าย) → Save Render จะ deploy ใหม่เอง

ค่านี้ใช้ทั้งเป็นรายชื่อเว็บที่อนุญาตให้เรียก API (CORS) และเป็นลิงก์ในอีเมลยืนยันและรีเซ็ตรหัส

## 6. TURN สำหรับ voice/video

1. Cloudflare dashboard → **Realtime** → **TURN Server** → **Create** ตั้งชื่อ เช่น `vobblix`
2. ก๊อป **Turn Token ID** และ **API Token** (API Token จะเห็นครั้งเดียว)
3. Render → Environment → ใส่ `CLOUDFLARE_TURN_KEY_ID` และ `CLOUDFLARE_TURN_API_TOKEN` → Save
4. (แนะนำ) ตั้งแจ้งเตือนการใช้งานหรืองบใน Billing ของ Cloudflare กันเกินโควตา 1,000 GB โดยไม่รู้ตัว

ถ้าไม่ใส่ค่า TURN call ยังใช้ได้ แต่คนที่อยู่หลังเครือข่ายเข้มงวด (เน็ตมือถือบางค่าย, WiFi ออฟฟิศ) จะต่อไม่ติด

## 7. ทดสอบหลังขึ้นเว็บ

- [ ] เปิด URL ของ Pages ได้ และกด refresh ที่หน้า `/lobby` แล้วไม่ 404
- [ ] สมัครด้วยอีเมลจริง → ได้อีเมล → ลิงก์ยืนยันพาไปที่ URL ของ Pages (ไม่ใช่ localhost) → login ได้
- [ ] เข้าร้าน `111` แล้วเดินได้ กล้องเลื่อนตามตัวละคร
- [ ] เปิด 2 เครื่อง (เช่น คอม + มือถือที่ใช้เน็ตมือถือ ไม่ใช่ WiFi เดียวกัน) แล้ว call + video ที่โต๊ะเดียวกันได้
- [ ] ตรวจว่า TURN ทำงาน: ใน Chrome เปิด `chrome://webrtc-internals` ระหว่าง call ถ้าเห็น candidate ชนิด `relay` แปลว่าใช้ TURN ได้
- [ ] บัญชีแอดมินในเครื่องใช้บนเว็บเทสได้เลย เพราะใช้ database เดียวกัน

## อัปเดตครั้งต่อไป

`git push origin dev` แล้ว Render กับ Pages จะ deploy ใหม่เอง migration ใหม่จะรันอัตโนมัติตอน server start (`render.yaml` → `npm run migrate && npm start`)

## ข้อจำกัดของแผนฟรี

- Render หลับเมื่อไม่มีใครใช้ 15 นาที คนแรกที่เข้าต้องรอ และคนที่ต่อ socket อยู่จะหลุดตอน server หลับหรือ deploy ใหม่
- ประเมินว่ารองรับคนออนไลน์พร้อมกันประมาณ 20–30 คน (ยังไม่ได้วัดจริง จะทำ load test หลัง deploy)
- อัปเกรดได้โดยไม่ต้องแก้โค้ด: Render Starter ~$7/เดือน ให้ server รันตลอด

## เว็บจริง (`prod`) ทีหลัง

ทำซ้ำขั้นตอนข้างบน แต่: สร้าง Neon branch `production` แยก, ก๊อป `render.yaml` เป็น service ใหม่ชื่อ `vobblix-server` ที่ `branch: prod`, สร้าง Pages project ใหม่ที่ Production branch เป็น `prod` แล้ว deploy ด้วย `git push origin dev:prod`
