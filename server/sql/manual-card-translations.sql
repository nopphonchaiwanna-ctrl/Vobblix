-- Manual Thai translation for DZ-BT17/001, done directly by Claude
-- (bypassing Gemini entirely) since the lite/flash API kept failing
-- on this card specifically (full-text echo, twice, even after two
-- rounds of prompt fixes - see translateCardTh.js's header comment).
-- Uses $th$ dollar-quoting so none of the punctuation inside the
-- translation needs escaping.
--
-- Run from the server/ directory, in your own terminal:
--   psql "$DATABASE_URL" -f sql/manual-card-translations.sql
-- (or paste directly into any Postgres client pointed at Neon)

UPDATE cards
SET skill_text_th = $th$[CONT]: การ์ดนี้จะกลายเป็นเพอร์โซนาไรด์ แม้จะนอร์มอลไรด์มาจากเกรด 3 ที่มีชื่ออื่นรวมคำว่า "วาร์กา" และจะกลายเป็นเพอร์โซนาไรด์แม้จะถูกนอร์มอลไรด์ทับก็ตาม
[ACT](V) เทิร์นละ 1 ครั้ง: [COST][ไบนด์การ์ด 1 ใบจากมือหรือโซลที่มีคำว่า "วาร์กา" รวมอยู่ในชื่อ] เลือกการ์ดจากดรอปของคุณสูงสุด 2 ใบที่มีเกรดต่างกันแต่ละใบและไม่ใช่การ์ดที่มีความสามารถการ์เดียน โดยผลรวมเกรดต้องไม่เกินจำนวนการ์ดในดาเมจโซนของคุณ แล้วคอลลงช่อง (R)
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทคแวนการ์ด [COST][เคาน์เตอร์บลาสต์ (1)] ให้ถอยเรียร์การ์ดแถวหน้าทั้งหมด แล้วยูนิตนี้ได้พาวเวอร์ +10000 ในเทิร์นนั้น เมื่อจบการต่อสู้นั้น ให้สแตนด์ยูนิตนี้ และในเทิร์นนั้นได้พาวเวอร์ +5000/ไดรฟ์ -2 ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป เรียร์การ์ดแถวหน้าทั้งหมดของคุณได้พาวเวอร์ +5000 ในเทิร์นนั้นด้วย
[ดิไวน์สกิล] - [AUTO](V): เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทคเกรด 3 ขึ้นไป ถ้ายูนิตนี้แอทแทคในเทิร์นนี้มาแล้ว 2 ครั้งขึ้นไป และ (ดาเมจโซนของคุณหรือฝ่ายตรงข้ามมี 4 ใบขึ้นไป หรือคุณเพอร์โซนาไรด์ในเทิร์นนี้) [COST][เคาน์เตอร์บลาสต์ (1)] ให้สแตนด์ยูนิตนี้ และตั้งไดรฟ์เป็น 2 ในเทิร์นนั้น$th$,
    updated_at = now()
WHERE game = 'vanguard' AND card_number = 'DZ-BT17/001';
