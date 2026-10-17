-- Batch 1: Thai translations for 1000 Vanguard cards, done directly by
-- Claude (not Gemini) after the API kept failing (echo/foreign-script
-- splicing) on several real cards. 959 cards got a real translation;
-- 41 cards have skill_text = '-' (no ability at all) so skill_text_th
-- is just set to '-' too, to match and stop them from being re-queued.
-- Every translation was validated to contain zero Japanese/Korean/Chinese
-- characters before being included here, and the whole file was test-run
-- against a throwaway local Postgres table (1000/1000 UPDATEs succeeded)
-- before being sent. Uses plain single-quoted strings (standard SQL
-- '' escaping, no dollar-quoting) for compatibility with any DB client.
--
-- Run from the server/ directory, in your own terminal:
--   psql "$(grep -E '^DATABASE_URL=' .env | cut -d'=' -f2-)" -f sql/batch1-manual-translations.sql

BEGIN;

UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'CP/001';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - [ทริกสตา] หรือเกรด 3 ลงมาที่อยู่ในสถานะ [โอเวอร์เดรส] (สามารถเลือกวางซ้อนบนยูนิตที่กำหนดแทนการคอลแบบนอร์มอลที่ (R) ก็ได้)
[CONT][(R)]: พาวเวอร์ของยูนิตนี้ +5000 ต่อการ์ดต้นทางโอเวอร์เดรสของยูนิตนี้ 1 ใบ
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของยูนิตนี้ที่อยู่ในสถานะ [โอเวอร์เดรส] ฮิต [COST] [เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ด 1 ใบจากมือ] แล้วทำให้ยูนิตนี้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/001';
UPDATE cards SET skill_text_th = '[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST] [เรสต์เรียร์การ์ด 2 ใบ] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย และพาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น
[ACT][(V)] เทิร์นละ 1 ครั้ง: ถ้าเรียร์การ์ดของฝ่ายตรงข้ามถอยไปแล้วในเทิร์นนี้ [COST] [โซลบลาสต์ (5)] แล้วดูการ์ดบนสุดของเด็คคุณเป็นจำนวนเท่ากับ (R) ของฝ่ายตรงข้ามที่ไม่มียูนิตอยู่ เลือกการ์ดยูนิตเท่าที่ต้องการจากในนั้นคอลลงที่ (R) ส่วนที่เหลือวางไว้ที่โซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/002';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนการ์ดในโซลของคุณ
- 5 ใบขึ้นไป - จั่ว 1 ใบ
- 10 ใบขึ้นไป - พาวเวอร์ของยูนิตนี้ +10000 / คริติคอล +1 ในบัตเทิลนั้น
- 15 ใบขึ้นไป - คุณและฝ่ายตรงข้ามวางเรียร์การ์ดของตัวเองทั้งหมดไว้ที่โซล จากนั้นเลือกการ์ดจากโซลของคุณสูงสุด 2 ใบคอลลงที่ (R) และพาวเวอร์ของยูนิตเหล่านั้น +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/003';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" พาวเวอร์ของยูนิตนี้ +5000 และถ้ายูนิตนี้สแตนด์ด้วยเอฟเฟกต์ของการ์ดในเทิร์นนี้ คริติคอล +1 เพิ่มเติม
[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/004';
UPDATE cards SET skill_text_th = '[CONT][(V)/(R)]: ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืดหรือราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000
[ACT][(V)]: ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท [COST] [เคาน์เตอร์บลาสต์ (2)] แล้วคอลโทเคนทหารเงาราตรีลงที่ (R) สูงสุด 3 ใบ (เวิลด์ของคุณจะเปลี่ยนไปเมื่อเล่นออเดอร์บางใบ ทหารเงาราตรีมีพาวเวอร์ 15000 และมีความสามารถบูสต์)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/005';
UPDATE cards SET skill_text_th = '[CONT][(R)/(G)]: ถ้ามีการ์ดของฝ่ายตรงข้ามถูกคุมขังอยู่ในคุกของคุณ 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 / ชิลด์ +10000
[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [โซลบลาสต์ (1)] แล้วเลือกเรียร์การ์ดแถวหน้าของฝ่ายตรงข้าม 1 ใบ นำไปคุมขังไว้ในคุกของคุณ (การ์ดจะถูกวางไว้ในออเดอร์โซนที่มีคุกอยู่)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/006';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [เคาน์เตอร์บลาสต์ (2), โซลบลาสต์ (1)] แล้วเลือกการ์ด 1 ใบจากมือคอลลงที่ (R) ถ้าคอลเกรด 3 จั่ว 2 ใบ
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/007';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: เมื่อมียูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ เลือกเรียร์การ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น
[ACT][(V)] เทิร์นละ 1 ครั้ง: ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเปิดเผย [คริติคอลทริกเกอร์] หรือ [ฟรอนต์ทริกเกอร์] จากมือของคุณสูงสุด 1 ใบ วางไว้บนสุดของเด็ค และไดรฟ์ของยูนิตนี้ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/008';
UPDATE cards SET skill_text_th = '[CONT][(V)]: เมื่อคุณเล่นนอร์มอลออเดอร์ คุณสามารถไบนด์นอร์มอลออเดอร์ชื่ออื่น 1 ใบจากดรอปของตัวเอง เพื่อผสานเวทมนตร์ได้ (รวมคอสต์เข้าด้วยกัน และเพิ่มเอฟเฟกต์ต่อท้าย!)
[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเลือกการ์ด 1 ใบจากดรอปของคุณคอลลงที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/009';
UPDATE cards SET skill_text_th = '[AUTO][(R) แถวหลัง]: เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดอื่นของคุณ 1 ใบ มอบพาวเวอร์ของยูนิตนี้ให้กับเรียร์การ์ดนั้นในเทิร์นนั้น (เพิ่มขึ้นเท่ากับพาวเวอร์ ณ ขณะนั้น)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/010';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - [ทริกสตา] (สามารถเลือกวางซ้อนบนยูนิตที่กำหนดแทนการคอลแบบนอร์มอลที่ (R) ก็ได้)
[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าโอเวอร์เดรสแล้ว [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วจั่ว 2 ใบ และพาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/011';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคที่ยูนิตนี้บูสต์อยู่ฮิต [COST] [เคาน์เตอร์บลาสต์ (1), ถอยยูนิตนี้] แล้วเลือกแวนการ์ดของคุณ 1 ใบ ค้นหาการ์ดชื่อเดียวกันจากเด็คสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/012';
UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - เลือกแวนการ์ดของคุณ 1 ใบ ทำให้สแตนด์!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/013';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" [COST] [วางเรียร์การ์ดอื่น 1 ใบไว้ที่โซล] แล้วจั่ว 1 ใบ โซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/014';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) โซลชาร์จ (1)
[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (3)] แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/015';
UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - ตลอดการต่อสู้ครั้งนี้ คุณจะได้รับ ''ในเทิร์นของคุณ พาวเวอร์ของแวนการ์ดทั้งหมดของคุณ +10000 / คริติคอล +1'' !', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/016';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ นำไปคุมขังไว้ในคุกของคุณ หลังจากนั้น ถ้ามีการ์ดของฝ่ายตรงข้ามถูกคุมขังอยู่ในคุกของคุณ 3 ใบขึ้นไป จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/017';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบบัตเทิลที่ยูนิตนี้บูสต์ ถ้ามีเซตออเดอร์อยู่ในออเดอร์โซนของคุณ [COST] [วางยูนิตนี้ไว้ที่โซล] แล้วเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/018';
UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - ในเทิร์นนั้น เพิ่มพาวเวอร์และคริติคอลของยูนิตแถวหน้าทั้งหมดของคุณเป็น 2 เท่า! (พาวเวอร์และคริติคอล ณ ขณะที่เอฟเฟกต์นี้เกิดขึ้นจะเพิ่มเป็น 2 เท่า)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/019';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ยูนิตนี้ไม่สามารถถูกเลือกได้ด้วยเอฟเฟกต์ของการ์ดฝ่ายตรงข้าม
[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต เคาน์เตอร์ชาร์จ (1) / โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/020';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบบัตเทิลที่ยูนิตนี้บูสต์ [COST] [โซลบลาสต์ (1), ถอยยูนิตนี้] แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/021';
UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - ในเทิร์นนั้น คุณจะทำไดรฟ์เช็คแม้ในบัตเทิลที่เรียร์การ์ดเป็นฝ่ายแอทแทคด้วย!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/022';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถทิ้งการ์ดบนสุดของเด็ค 3 ใบได้
[ACT][(R)]: [COST] [ถอยยูนิตนี้] แล้วครั้งต่อไปที่คุณเล่นออเดอร์แบบผสานเวทมนตร์ในเทิร์นนั้น คุณไม่ต้องจ่ายโซลบลาสต์ทั้งหมดของคอสต์นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/023';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จากมือ [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเลือกการ์ดเกรด 2 ลงมาจากดรอปของคุณ 1 ใบ คอลลงที่ (R) และพาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/024';
UPDATE cards SET skill_text_th = '(ใส่ [โอเวอร์ทริกเกอร์] ได้แค่ 1 ใบในเด็ค ถ้าออกจากทริกเกอร์ ให้นำการ์ดใบนั้นออกจากเกม จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +1 ร้อยล้านในเทิร์นนั้น! ถ้าออกจากไดรฟ์เช็ค จะเกิดเอฟเฟกต์เสริมเพิ่มเติม!)
เอฟเฟกต์เสริม - จั่ว 1 ใบ! เลือกยูนิตของคุณ 1 ใบ คริติคอล +1 ในเทิร์นนั้น! พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000! ถ้าดาเมจโซนของคุณมีจำนวนเท่ากับหรือมากกว่าของฝ่ายตรงข้าม เลือกการ์ด 1 ใบจากดาเมจโซนของคุณ ฮีล!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/025';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อแวนการ์ดของคุณแอทแทค ถ้าเรียร์การ์ดของฝ่ายตรงข้ามมี 2 ใบหรือน้อยกว่า [COST] [วางยูนิตนี้ไว้ที่โซล] แล้วเลือกแวนการ์ดของคุณ 1 ใบ คริติคอล +1 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/026';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อ [ยูจีน ปืนใหญ่พายุทราย] ไรด์ทับยูนิตนี้ จั่ว 1 ใบ และเลือกการ์ดจากดรอปของคุณสูงสุด 1 ใบ วางไว้ที่โซล
[AUTO][(V)/(R)]: เมื่อยูนิตนี้แอทแทค ถ้าเรียร์การ์ดของฝ่ายตรงข้ามมี 2 ใบหรือน้อยกว่า [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วโซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/027';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [เคาน์เตอร์บลาสต์ (2)] แล้วโซลชาร์จ (1) และเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/028';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต [COST] [ทิ้งการ์ด 1 ใบจากมือ] แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/029';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเลือกเรียร์การ์ดเกรด 2 ขึ้นไปของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/030';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน (การ์ดที่มีความสามารถการ์เดียนใส่ในเด็คได้รวมกันสูงสุด 4 ใบ)
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้ามือของคุณมี 2 ใบขึ้นไป เลือกการ์ด 1 ใบจากมือ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/031';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณคือ [บารอว์แมกเนส ผู้ปกครองแรงโน้มถ่วง] โซลชาร์จ (2)
[ACT][(R)]: ถ้าโซลของคุณมี 10 ใบขึ้นไป [COST] [เคาน์เตอร์บลาสต์ (2)] แล้วพาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/032';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อ [บารอว์แมกเนส ผู้ปกครองแรงโน้มถ่วง] ไรด์ทับยูนิตนี้ [COST] [วางการ์ด 1 ใบจากมือไว้ที่โซล] แล้วจั่ว 1 ใบ และโซลชาร์จ (1)
[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วโซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/033';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ยูนิตนี้ไม่สามารถถูกเลือกได้ด้วยเอฟเฟกต์ของการ์ดฝ่ายตรงข้าม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/034';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคหรือบูสต์ ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" [COST] [เคาน์เตอร์บลาสต์ (1), วางเรียร์การ์ดอื่น 1 ใบไว้ที่โซล] แล้วเลือกการ์ด 1 ใบจากโซลของคุณ เพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/035';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน (การ์ดที่มีความสามารถการ์เดียนใส่ในเด็คได้รวมกันสูงสุด 4 ใบ)
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้ามือของคุณมี 2 ใบขึ้นไป เลือกการ์ด 1 ใบจากมือ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/036';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเล่นได้!
โซลชาร์จ (1) หลังจากนั้นเลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น ต่อโซลของคุณทุก 5 ใบ ถ้าโซลของคุณมี 10 ใบขึ้นไป จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/037';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (1)] แล้วพาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น เลือกเรียร์การ์ดแถวหน้าของฝ่ายตรงข้าม 1 ใบ นำไปคุมขังไว้ในคุกของคุณ (การ์ดจะถูกวางไว้ในออเดอร์โซนที่มีคุกอยู่)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/038';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: เมื่อเวิลด์ถูกวางไว้ในออเดอร์โซนของคุณ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น
[CONT][(R)]: ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/039';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/040';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดใบนี้ถูกทิ้งจากมือในเทิร์นของคุณ ถ้ามีเซตออเดอร์อยู่ในออเดอร์โซนของคุณ [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วคอลการ์ดใบนี้ลงที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/041';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน (การ์ดที่มีความสามารถการ์เดียนใส่ในเด็คได้รวมกันสูงสุด 4 ใบ)
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้ามือของคุณมี 2 ใบขึ้นไป เลือกการ์ด 1 ใบจากมือ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/042';
UPDATE cards SET skill_text_th = '(เซตออเดอร์หลังเล่นแล้วให้วางไว้ในออเดอร์โซน)
[COST] [โซลบลาสต์ (1)] แล้วเล่นได้!
[AUTO]: เมื่อการ์ดใบนี้ถูกวางไว้ในออเดอร์โซน จั่ว 1 ใบ
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากเวิลด์ ให้มีผลดังนี้ตามจำนวนการ์ดในออเดอร์โซนของคุณ
- 1 ใบ - เวิลด์ของคุณจะกลายเป็นราตรีมืด
- 2 ใบขึ้นไป - เวิลด์ของคุณจะกลายเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/043';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป [COST] [โซลบลาสต์ (2)] แล้วมอบความสามารถ ''บูสต์'' ให้กับยูนิตเกรด 3 ทั้งหมดของคุณในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/044';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดใบนี้ถูกทิ้งจากมือในเทิร์นของคุณ [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/045';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อ [นักเวทมนตร์หญิงแห่งอัญมณีหกเหลี่ยม] ไรด์ทับยูนิตนี้ ดูการ์ดบนสุดของเด็ค 3 ใบ แล้ววางกลับบนสุดของเด็คตามลำดับที่ต้องการ
[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ดูการ์ดบนสุดของเด็ค 1 ใบ แล้ววางไว้บนสุดหรือล่างสุดของเด็ค ถ้าวางไว้ล่างสุด พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/046';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) [COST] [โซลบลาสต์ (1), เรสต์ยูนิตนี้] แล้วดูการ์ดบนสุดของเด็ค 2 ใบ เลือก 1 ใบวางไว้บนสุดของเด็ค ส่วนที่เหลือวางไว้ล่างสุดของเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/047';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อมียูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ [COST] [โซลบลาสต์ (2)] แล้วเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/048';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน (การ์ดที่มีความสามารถการ์เดียนใส่ในเด็คได้รวมกันสูงสุด 4 ใบ)
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้ามือของคุณมี 2 ใบขึ้นไป เลือกการ์ด 1 ใบจากมือ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/049';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) เลือกนอร์มอลออเดอร์จากดรอปของคุณสูงสุด 1 ใบ เพิ่มเข้ามือ
[CONT][(R)]: ถ้าคุณเล่นออเดอร์แล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/050';
UPDATE cards SET skill_text_th = '[ACT][(R)]: [COST] [ถอยยูนิตนี้] แล้วเลือกยูนิตของคุณ 2 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/051';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน (การ์ดที่มีความสามารถการ์เดียนใส่ในเด็คได้รวมกันสูงสุด 4 ใบ)
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้ามือของคุณมี 2 ใบขึ้นไป เลือกการ์ด 1 ใบจากมือ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/052';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (2)] แล้วเล่นได้!
ดูการ์ดบนสุดของเด็ค 4 ใบ เลือกการ์ดยูนิตสูงสุด 1 ใบคอลลงที่ (R) ส่วนที่เหลือทิ้ง ถ้ากำลังผสานเวทมนตร์อยู่ ให้คอลได้สูงสุด 2 ใบแทน 1 ใบ และพาวเวอร์ของยูนิตที่ถูกคอลด้วยออเดอร์นี้ทั้งหมด +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/053';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเล่นได้!
ถ้าแวนการ์ดของคุณคือ [โซลก้า จอมเวทเรียกวิญญาณแห่งฝนพิศวง] เลือกยูนิตของคุณ 3 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/054';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] แล้วเล่นได้!
เลือกการ์ดเกรดเท่ากับหรือต่ำกว่าแวนการ์ดของคุณจากดรอป 1 ใบ คอลลงที่ (R) และพาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/055';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้ามียูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/056';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าเรียร์การ์ดของฝ่ายตรงข้ามมี 2 ใบหรือน้อยกว่า พาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/057';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ [COST] [โซลบลาสต์ (1)] แล้วชิลด์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/058';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/059';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อ [แรนดอลล์ กระสุนมรณะแห่งพายุทราย] ไรด์ทับยูนิตนี้ โซลชาร์จ (1)
[AUTO][(R)]: เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอยในเมนเฟสของคุณ [COST] [เคาน์เตอร์บลาสต์ (1), ถอยยูนิตนี้] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/060';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอยในเมนเฟสของคุณ [COST] [ถอยยูนิตนี้] แล้วดูการ์ดบนสุดของเด็ค 1 ใบ สามารถคอลการ์ดยูนิตนั้นลงที่ (R) ได้ ถ้าไม่คอล ให้วางการ์ดนั้นไว้ที่โซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/061';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/062';
UPDATE cards SET skill_text_th = '(ใส่ [ฮีลทริกเกอร์] ในเด็คได้รวมกันสูงสุด 4 ใบ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/066';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ตามจำนวนที่ต้องการ ตั้งแต่ 1 ขึ้นไป] แล้วเล่นได้!
ต่อเคาน์เตอร์บลาสต์ (1) ที่จ่ายไปด้วยคอสต์นี้ เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/067';
UPDATE cards SET skill_text_th = 'ถ้าดาเมจโซนของคุณมี 3 ใบขึ้นไป เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +15000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/068';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต โซลชาร์จ (1)
[AUTO][(R)]: ตอนจบบัตเทิลที่ยูนิตนี้แอทแทค ถ้าโซลของคุณมี 10 ใบขึ้นไป [COST] [วางยูนิตนี้ไว้ที่โซล] แล้วเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/069';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณโซลชาร์จแล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/070';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/071';
UPDATE cards SET skill_text_th = '[ACT][(R)]: [COST] [วางยูนิตนี้ไว้ที่โซล] แล้วเลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/072';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) เลือกยูนิตอื่นของคุณที่อยู่ในแนวตั้งเดียวกันกับยูนิตนี้ 1 ใบ พาวเวอร์ +2000 ในเทิร์นนั้น ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" ให้เป็น +5000 แทน +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/073';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วในบัตเทิลนั้น ฝ่ายตรงข้ามจะคอลจากมือลงที่ (G) ไม่ได้ เว้นแต่จะคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/074';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) โซลชาร์จ (1)
[CONT][(R)]: ในเทิร์นของคุณ ถ้าโซลของคุณมี 10 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/075';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/076';
UPDATE cards SET skill_text_th = '(ใส่ [ฮีลทริกเกอร์] ในเด็คได้รวมกันสูงสุด 4 ใบ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/080';
UPDATE cards SET skill_text_th = 'ถ้าโซลของคุณมี 5 ใบขึ้นไป เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +15000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/081';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท เมื่อยูนิตนี้แอทแทค จะต่อสู้กับยูนิตทั้งหมดในแนวตั้งหนึ่งแนวของฝ่ายตรงข้าม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/082';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในบัตเทิลที่ยูนิตนี้แอทแทค ถ้ามีการ์ดของฝ่ายตรงข้ามถูกคุมขังอยู่ในคุกของคุณ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/083';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) ค้นหาการ์ดเวิลด์จากเด็คของคุณสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[CONT][(R)]: ในบัตเทิลที่ยูนิตนี้แอทแทคหรือบูสต์ ถ้าเวิลด์ของคุณเป็นราตรีมืดหรือราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/084';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/085';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) [COST] [เคาน์เตอร์บลาสต์ (1)] แล้ว ถ้าเวิลด์ของคุณเป็นราตรีมืด ชิลด์ของยูนิตนี้ +5000 ในเทิร์นนั้น ถ้าเป็นราตรีมืดสนิท ชิลด์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/086';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/087';
UPDATE cards SET skill_text_th = '(ใส่ [ฮีลทริกเกอร์] ในเด็คได้รวมกันสูงสุด 4 ใบ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/091';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] แล้วเล่นได้!
เลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/092';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (2)] แล้วเล่นได้!
เลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +30000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/093';
UPDATE cards SET skill_text_th = '(เซตออเดอร์หลังเล่นแล้วให้วางไว้ในออเดอร์โซน)
[COST] [โซลบลาสต์ (1)] แล้วเล่นได้!
[AUTO]: เมื่อการ์ดใบนี้ถูกวางไว้ในออเดอร์โซน เลือกเรียร์การ์ดแถวหน้าของฝ่ายตรงข้าม 1 ใบ ถอย
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากเวิลด์ ให้มีผลดังนี้ตามจำนวนการ์ดในออเดอร์โซนของคุณ
- 1 ใบ - เวิลด์ของคุณจะกลายเป็นราตรีมืด
- 2 ใบขึ้นไป - เวิลด์ของคุณจะกลายเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/094';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคุณคือ [บาสเตียน จอมเทพแห่งยอดสูงสุด] ชิลด์ของยูนิตนี้ +5000 ต่อยูนิตเกรด 3 ของคุณทุก 2 ใบ (นับยูนิตนี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/095';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อมียูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ [COST] [เคาน์เตอร์บลาสต์ (2)] แล้วทำให้ยูนิตนี้สแตนด์ และพาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/096';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป [COST] [เคาน์เตอร์บลาสต์ (2)] แล้วคริติคอลของยูนิตนี้ +1 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/097';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อมียูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ [COST] [โซลบลาสต์ (1)] แล้วพาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/098';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อ [นักเวทมนตร์หญิงแห่งประกายแสงห้าเหลี่ยม] ไรด์ทับยูนิตนี้ [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วจั่ว 1 ใบ
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อมียูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดแถวหน้าของฝ่ายตรงข้าม 1 ใบ วางไว้ล่างสุดของเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/099';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/100';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/101';
UPDATE cards SET skill_text_th = '(ใส่ [ฮีลทริกเกอร์] ในเด็คได้รวมกันสูงสุด 4 ใบ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/105';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์เกรด 3 (1)] แล้วเล่นได้!
เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ฝ่ายตรงข้ามต้องวางเรียร์การ์ดทั้งหมดในแนวตั้งเดียวกันกับเรียร์การ์ดนั้นไว้ล่างสุดของเด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/106';
UPDATE cards SET skill_text_th = 'ถ้ายูนิตของคุณมี 3 ใบขึ้นไป เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +15000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/107';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] แล้วพาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/108';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด ถ้ามีการ์ดออเดอร์อยู่ในไบนด์โซนของคุณ พาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/109';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/110';
UPDATE cards SET skill_text_th = '[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (1)] แล้วจั่ว 2 ใบ เลือกการ์ดออเดอร์จากมือของคุณสูงสุด 1 ใบ ทิ้ง ถ้าไม่ทิ้ง ให้เลือกการ์ด 2 ใบจากมือทิ้งแทน
[CONT][(R)]: ถ้าคุณเล่นออเดอร์แล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/111';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ พาวเวอร์ของเรียร์การ์ดนั้น +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/112';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/113';
UPDATE cards SET skill_text_th = '(ฮีลทริกเกอร์ใส่ในเด็คได้รวมสูงสุด 4 ใบ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/117';
UPDATE cards SET skill_text_th = '[COST] [ถอยเรียร์การ์ด 2 ใบ] เพื่อใช้การ์ดนี้ได้!
จั่วการ์ด 1 ใบ นำการ์ดนี้ไปไว้ที่โซล จากนั้นเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/118';
UPDATE cards SET skill_text_th = 'เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในบัตเทิลนั้น เลือกเรียร์การ์ดของคุณที่ไม่ได้ถูกแอทแทค 1 ใบ แล้วนำกลับมือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/119';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (2)] เพื่อใช้การ์ดนี้ได้!
เลือกแวนการ์ดของคู่ต่อสู้ 1 ใบ คริติคอลของยูนิตนั้น -1 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/120';
UPDATE cards SET skill_text_th = '[CONT](R): ยูนิตนี้ไม่ถูกเลือกโดยเอฟเฟกต์การ์ดของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/DSR01';
UPDATE cards SET skill_text_th = '[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [ทิ้งการ์ดจากมือ 1 ใบ] เลือกเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลลงเรียร์การ์ด (R)
[AUTO](V): เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] พาวเวอร์ของยูนิตของคุณทุกใบที่มีความสามารถโอเวอร์เดรส รวมถึงยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/DSR02';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแวนการ์ดของคุณแอทแทค ถ้าเรียร์การ์ดของคู่ต่อสู้มี 2 ใบหรือน้อยกว่า [COST] [นำยูนิตนี้ไปไว้ที่โซล] เลือกแวนการ์ดของคุณ 1 ใบ คริติคอล +1 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H01';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์เป็น "ปืนใหญ่พายุทราย ยูจิน" จั่วการ์ด 1 ใบ แล้วเลือกจากดรอปของคุณได้สูงสุด 1 ใบ นำไปไว้ที่โซล
[AUTO](V)/(R): เมื่อยูนิตนี้แอทแทค ถ้าเรียร์การ์ดของคู่ต่อสู้มี 2 ใบหรือน้อยกว่า [COST] [เคาน์เตอร์บลาสต์ (1)] โซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H02';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H03';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์เป็น "กระสุนร้ายพายุทราย แรนดอลล์" โซลชาร์จ (1)
[AUTO](R): เมื่อเรียร์การ์ดของคู่ต่อสู้ถอยในเมนเฟสของคุณ [COST] [เคาน์เตอร์บลาสต์ (1), ถอยยูนิตนี้] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H04';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเรียร์การ์ดของคู่ต่อสู้ถอยในเมนเฟสของคุณ [COST] [ถอยยูนิตนี้] เปิดดูการ์ดบนสุดของเด็คคุณ 1 ใบ แล้วคอลการ์ดยูนิตนั้นลง (R) ได้ ถ้าไม่คอล ให้นำการ์ดที่เหลือไปไว้ที่โซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H05';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์เป็น "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" [COST] [นำการ์ดจากมือ 1 ใบไปไว้ที่โซล] จั่วการ์ด 1 ใบ แล้วโซลชาร์จ (1)
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST] [เคาน์เตอร์บลาสต์ (1)] โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H11';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H12';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
โซลชาร์จ (1) จากนั้นเลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้นต่อโซลของคุณทุก 5 ใบ ถ้าโซลของคุณมี 10 ใบขึ้นไป ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H13';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต โซลชาร์จ (1)
[AUTO](R): เมื่อจบบัตเทิลที่ยูนิตนี้แอทแทค ถ้าโซลของคุณมี 10 ใบขึ้นไป [COST] [นำยูนิตนี้ไปไว้ที่โซล] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H14';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) โซลชาร์จ (1)
[CONT](R): ในเทิร์นของคุณ ถ้าโซลของคุณมี 10 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H15';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H16';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อการ์ดเวิลด์ถูกวางในออเดอร์โซนของคุณ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น
[CONT](R): ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H21';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H22';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
[AUTO]: เมื่อการ์ดนี้ถูกวางในออเดอร์โซน จั่วการ์ด 1 ใบ
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากเวิลด์ ให้ผลต่อไปนี้มีผลตามจำนวนการ์ดในออเดอร์โซนของคุณ
- 1 ใบ - เวิลด์ของคุณเป็นราตรีมืด
- 2 ใบขึ้นไป - เวิลด์ของคุณเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H23';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) ค้นหาการ์ดเวิลด์จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค
[CONT](R): ในบัตเทิลที่ยูนิตนี้แอทแทคหรือบูสต์ ถ้าเวิลด์ของคุณเป็นราตรีมืดหรือราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H24';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H25';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
[AUTO]: เมื่อการ์ดนี้ถูกวางในออเดอร์โซน เลือกเรียร์การ์ดแถวหน้าของคู่ต่อสู้ 1 ใบ แล้วถอย
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากเวิลด์ ให้ผลต่อไปนี้มีผลตามจำนวนการ์ดในออเดอร์โซนของคุณ
- 1 ใบ - เวิลด์ของคุณเป็นราตรีมืด
- 2 ใบขึ้นไป - เวิลด์ของคุณเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H30';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป [COST] [โซลบลาสต์ (2)] ให้ความสามารถ "บูสต์" แก่ยูนิตเกรด 3 ของคุณทุกใบในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H31';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์เป็น "จอมเวทสาวแห่งดวงแก้วหกเหลี่ยม" เปิดดูการ์ดบนสุดของเด็คคุณ 3 ใบ แล้ววางกลับบนเด็คตามลำดับที่ต้องการ
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) เปิดดูการ์ดบนสุดของเด็คคุณ 1 ใบ แล้ววางไว้บนสุดหรือล่างสุดของเด็ค ถ้าวางไว้ล่างสุด พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H32';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST] [โซลบลาสต์ (1), เรสต์ยูนิตนี้] เปิดดูการ์ดบนสุดของเด็คคุณ 2 ใบ เลือก 1 ใบวางไว้บนสุดของเด็ค แล้ววางใบที่เหลือไว้ล่างสุดของเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H33';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H34';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์เป็น "จอมเวทสาวแห่งประกายห้าเหลี่ยม" [COST] [เคาน์เตอร์บลาสต์ (1)] จั่วการ์ด 1 ใบ
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดแถวหน้าของคู่ต่อสู้ 1 ใบ แล้ววางไว้ล่างสุดของเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H35';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H36';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) เลือกนอร์มอลออเดอร์จากดรอปของคุณได้สูงสุด 1 ใบ นำเข้ามือ
[CONT](R): ถ้าคุณเล่นออเดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H41';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H42';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
ถ้าแวนการ์ดของคุณคือ "นักพรากวิญญาณแห่งสายฝนพิศวง โซลก้า" ให้เลือกยูนิตของคุณ 3 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H43';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
เลือกการ์ดจากดรอปของคุณที่มีเกรดเท่ากับหรือต่ำกว่าแวนการ์ดของคุณ 1 ใบ แล้วคอลลง (R) พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H44';
UPDATE cards SET skill_text_th = '[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (1)] จั่วการ์ด 2 ใบ แล้วเลือกทิ้งการ์ดออเดอร์จากมือได้สูงสุด 1 ใบ ถ้าไม่ทิ้ง ให้เลือกทิ้งการ์ดจากมือ 2 ใบ
[CONT](R): ถ้าคุณเล่นออเดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H45';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H46';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา" หรือยูนิตเกรด 3 หรือต่ำกว่าที่อยู่ในสถานะโอเวอร์เดรส
[CONT](R): พาวเวอร์ของยูนิตนี้ +5000 ต่อการ์ดฐานโอเวอร์เดรสของยูนิตนี้ 1 ใบ
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของยูนิตนี้ที่อยู่ในสถานะโอเวอร์เดรสฮิต [COST] [เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP01';
UPDATE cards SET skill_text_th = '[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [เรสต์เรียร์การ์ด 2 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น
[ACT](V) เทิร์นละ 1 ครั้ง: ถ้าเรียร์การ์ดของคู่ต่อสู้ถอยในเทิร์นนี้ [COST] [โซลบลาสต์ (5)] เปิดดูการ์ดบนสุดของเด็คคุณเท่ากับจำนวนช่อง (R) ที่ไม่มียูนิตของคู่ต่อสู้ แล้วเลือกการ์ดยูนิตจำนวนเท่าที่ต้องการคอลลง (R) ส่วนที่เหลือนำไปไว้ที่โซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP02';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนโซลของคุณ
- 5 ใบขึ้นไป - จั่วการ์ด 1 ใบ
- 10 ใบขึ้นไป - พาวเวอร์ของยูนิตนี้ +10000/คริติคอล +1 ในบัตเทิลนั้น
- 15 ใบขึ้นไป - คุณและคู่ต่อสู้นำเรียร์การ์ดของตนเองทั้งหมดไปไว้ที่โซล จากนั้นเลือกจากโซลของคุณได้สูงสุด 2 ใบ คอลลง (R) พาวเวอร์ของยูนิตเหล่านั้น +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP03';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณอยู่ในสถานะ "บุกเต็มกำลัง" พาวเวอร์ของยูนิตนี้ +5000 และถ้ายูนิตนี้สแตนด์ด้วยเอฟเฟกต์การ์ดในเทิร์นนี้ คริติคอล +1 เพิ่มเติม
[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP04';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืดหรือราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000
[ACT](V): ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท [COST] [เคาน์เตอร์บลาสต์ (2)] คอลโทเค็นนักรบเงาราตรีได้สูงสุด 3 ใบลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP05';
UPDATE cards SET skill_text_th = '[CONT](R)/(G): ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000/ชิลด์ +10000
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST] [โซลบลาสต์ (1)] เลือกเรียร์การ์ดแถวหน้าของคู่ต่อสู้ 1 ใบ แล้วคุมขังไว้ในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST] [เคาน์เตอร์บลาสต์ (2), โซลบลาสต์ (1)] เลือกการ์ดจากมือของคุณ 1 ใบ แล้วคอลลง (R) ถ้าคอลเกรด 3 ให้จั่วการ์ด 2 ใบ
[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP07';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อยูนิตทริกเกอร์ออกมาจากไดรฟ์เช็คของคุณ เลือกเรียร์การ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น
[ACT](V) เทิร์นละ 1 ครั้ง: ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกคริติคอลทริกเกอร์หรือฟรอนต์ทริกเกอร์จากมือของคุณได้สูงสุด 1 ใบ เปิดเผยแล้ววางไว้บนสุดของเด็ค ไดรฟ์ของยูนิตนี้ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP08';
UPDATE cards SET skill_text_th = '[CONT](V): เมื่อคุณเล่นนอร์มอลออเดอร์ คุณสามารถไบนด์นอร์มอลออเดอร์ชื่ออื่นจากดรอปของคุณ 1 ใบ เพื่อผสานเวทได้
[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดจากดรอปของคุณ 1 ใบ แล้วคอลลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP09';
UPDATE cards SET skill_text_th = '[AUTO][เรียร์การ์ดแถวหลัง (R)]: เมื่อยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ แล้วมอบพาวเวอร์ของยูนิตนี้ให้ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP10';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา"
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าโอเวอร์เดรส [COST] [เคาน์เตอร์บลาสต์ (1)] จั่วการ์ด 2 ใบ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP11';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิต [COST] [เคาน์เตอร์บลาสต์ (1), ถอยยูนิตนี้] เลือกแวนการ์ดของคุณ 1 ใบ ค้นหาการ์ดชื่อเดียวกับยูนิตนั้นจากเด็คได้สูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP12';
UPDATE cards SET skill_text_th = 'เอฟเฟกต์เพิ่มเติม - เลือกแวนการ์ดของคุณ 1 ใบ แล้วสแตนด์!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP13';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าคุณอยู่ในสถานะ "บุกเต็มกำลัง" [COST] [นำเรียร์การ์ดอื่น 1 ใบไปไว้ที่โซล] จั่วการ์ด 1 ใบ โซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP14';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โซลชาร์จ (1)
[ACT](R) เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (3)] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP15';
UPDATE cards SET skill_text_th = 'เอฟเฟกต์เพิ่มเติม - ตลอดการต่อสู้นี้ คุณได้รับผล "ในเทิร์นของคุณ พาวเวอร์ของแวนการ์ดทุกใบของคุณ +10000/คริติคอล +1"!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP16';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วคุมขังไว้ในคุกของคุณ จากนั้นถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 3 ใบขึ้นไป ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP17';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบบัตเทิลที่ยูนิตนี้บูสต์ ถ้ามีเซ็ตออเดอร์ในออเดอร์โซนของคุณ [COST] [นำยูนิตนี้ไปไว้ที่โซล] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP18';
UPDATE cards SET skill_text_th = 'เอฟเฟกต์เพิ่มเติม - ในเทิร์นนั้น พาวเวอร์และคริติคอลของยูนิตแถวหน้าทุกใบของคุณเพิ่มเป็น 2 เท่า!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP19';
UPDATE cards SET skill_text_th = '[CONT](R): ยูนิตนี้ไม่ถูกเลือกโดยเอฟเฟกต์การ์ดของคู่ต่อสู้
[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต เคาน์เตอร์ชาร์จ (1)/โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP20';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบบัตเทิลที่ยูนิตนี้บูสต์ [COST] [โซลบลาสต์ (1), ถอยยูนิตนี้] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP21';
UPDATE cards SET skill_text_th = 'เอฟเฟกต์เพิ่มเติม - ในเทิร์นนั้น คุณทำไดรฟ์เช็คได้แม้ในบัตเทิลที่เรียร์การ์ดแอทแทค!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP22';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) คุณสามารถทิ้งการ์ดบนสุดของเด็คคุณ 3 ใบ
[ACT](R): [COST] [ถอยยูนิตนี้] ในเทิร์นนั้น เมื่อคุณเล่นออเดอร์ด้วยการผสานเวทครั้งต่อไป คุณไม่ต้องจ่ายโซลบลาสต์ทั้งหมดในคอสต์นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP23';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากมือ [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกการ์ดเกรด 2 หรือต่ำกว่าจากดรอปของคุณ 1 ใบ แล้วคอลลง (R) พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP24';
UPDATE cards SET skill_text_th = 'เอฟเฟกต์เพิ่มเติม - จั่วการ์ด 1 ใบ! เลือกยูนิตของคุณ 1 ใบ คริติคอล +1 ในเทิร์นนั้น! พาวเวอร์ของยูนิตแถวหน้าทุกใบของคุณ +10000! ถ้าดาเมจโซนของคุณมีจำนวนใบเท่ากับหรือมากกว่าคู่ต่อสู้ ให้เลือกการ์ดจากดาเมจโซนของคุณ 1 ใบ แล้วฮีล!', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP25';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP26';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP27';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP28';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP29';
UPDATE cards SET skill_text_th = '[CONT]: การ์เดียน
[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตในบัตเทิลนั้น ถ้าคุณมีการ์ดในมือ 2 ใบขึ้นไป ให้เลือกทิ้งการ์ดจากมือ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP30';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อการ์ดเวิลด์ถูกวางในออเดอร์โซนของคุณ เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น
[CONT](R): ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP31';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) ค้นหาการ์ดเวิลด์จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค
[CONT](R): ในบัตเทิลที่ยูนิตนี้แอทแทคหรือบูสต์ ถ้าเวิลด์ของคุณเป็นราตรีมืดหรือราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP32';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP33';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) เลือกนอร์มอลออเดอร์จากดรอปของคุณได้สูงสุด 1 ใบ นำเข้ามือ
[CONT](R): ถ้าคุณเล่นออเดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP36';
UPDATE cards SET skill_text_th = '[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [โซลบลาสต์ (1)] จั่วการ์ด 2 ใบ แล้วเลือกทิ้งการ์ดออเดอร์จากมือได้สูงสุด 1 ใบ ถ้าไม่ทิ้ง ให้เลือกทิ้งการ์ดจากมือ 2 ใบ
[CONT](R): ถ้าคุณเล่นออเดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP37';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง ให้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP38';
UPDATE cards SET skill_text_th = '(นี่คือการ์ดที่ใช้แทนโทเค็นนักรบเงาราตรี ไม่สามารถใส่ในเด็คได้)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/T01';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): ในบัตเทิลที่ยูนิตนี้แอทแทคเรียร์การ์ด คู่ต่อสู้ไม่สามารถคอลจากมือลง (G) ได้
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของยูนิตนี้ฮิต [COST] [เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] สแตนด์ยูนิตนี้ ไดรฟ์ -1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/001';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา" (แทนที่จะนอร์มอลคอลลง (R) คุณสามารถวางซ้อนบนยูนิตที่กำหนดเพื่อออกมาแทนก็ได้)
[AUTO][มือ]: เมื่อจบบัตเทิลที่ "ทริกสตา" ของคุณแอทแทคแวนการ์ด ถ้าแวนการ์ดของคุณคือ "มังกรศักดิ์สิทธิ์วงแหวนสวรรค์ นิรวาณ่า" [COST] [โซลบลาสต์ (2)] นำการ์ดนี้ไปโอเวอร์เดรสแบบสแตนด์ทับ "ทริกสตา" ที่ (R) ของคุณ แล้วเคาน์เตอร์ชาร์จ (1)
[CONT](R)/(G): ถ้ายูนิตนี้อยู่ในสถานะโอเวอร์เดรส พาวเวอร์ของยูนิตนี้ +10000/ชิลด์ +10000 (มีผลแม้ในเทิร์นของคู่ต่อสู้)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/002';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด โซลชาร์จ (1)
[ACT][โซล]: [COST] [เคาน์เตอร์บลาสต์ (1), นำการ์ดนี้ไปไว้ที่ดรอป] โซลชาร์จ (1) แล้วเลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/003';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณอยู่ในสถานะ "บุกเต็มกำลัง" พาวเวอร์ของยูนิตนี้ +5000 และเมื่อยูนิตนี้แอทแทค จะต่อสู้กับยูนิตทุกใบของคู่ต่อสู้ในแถวตั้งเดียวกัน 1 แถว
[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต โซลชาร์จ (1) และถ้าแวนการ์ดของคุณคือ "ดิอาโบลส ''ทรราช'' บรูซ" ให้เลือกจากโซลได้สูงสุด 1 ใบ แล้วคอลลงช่อง (R) ที่ไม่มียูนิต', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/004';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าเวิลด์ของคุณเป็นราตรีมืด พาวเวอร์ของยูนิตนี้ +2000 ถ้าเป็นราตรีมืดสนิทแทน พาวเวอร์ +5000
[AUTO](R): เมื่อจบบัตเทิลที่ยูนิตนี้แอทแทค [COST] [ถอยโทเค็นนักรบเงาราตรี 1 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้ได้สูงสุด 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/005';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000
[AUTO][เรียร์การ์ดแถวหน้า (R)]: เมื่อการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณออกมาที่ (R) พาวเวอร์ของยูนิตนั้น -5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/006';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ ยูนิตนี้ได้รับความสามารถ "บูสต์"
[AUTO][เรียร์การ์ดแถวหลัง (R)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตอื่นของคุณสแตนด์ด้วยเอฟเฟกต์การ์ด สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/007';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) คุณสามารถเลือกการ์ดที่มีคำว่า "บลาสเตอร์" จากโซลของคุณ 1 ใบ แล้วคอลลง (R)
[ACT](V) เทิร์นละ 1 ครั้ง: [COST] [เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ด 3 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้ได้สูงสุด 2 ใบ แล้วถอย พาวเวอร์ของยูนิตนี้ +10000/คริติคอล +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/008';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาไม้ แมกโนเลีย" [COST] [โซลบลาสต์ (1)] เลือกเรียร์การ์ดของคุณ 1 ใบ ในเทิร์นนั้นยูนิตนั้นแอทแทคจากแถวหลังได้ และพาวเวอร์ +5000
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้ถูกเลือกโดยเอฟเฟกต์แวนการ์ดของคุณ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/009';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณเล่นออเดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) เมื่อคุณเล่นออเดอร์ด้วยการผสานเวทครั้งต่อไปในเทิร์นนี้ คอสต์เคาน์เตอร์บลาสต์ของการ์ดนั้นลดลง 1 (ลดจากยอดรวม ถ้าค่าติดลบก็ไม่ถือว่าเป็นการเคาน์เตอร์ชาร์จ)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/010';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบบัตเทิลที่ยูนิตนี้แอทแทค [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกเรียร์การ์ดแถวหน้าของคู่ต่อสู้ 1 ใบ แล้วถอย ถ้าแวนการ์ดของคุณคือ "มังกรศักดิ์สิทธิ์วงแหวนสวรรค์ นิรวาณ่า" ให้เลือกเกรด 0 จากดรอปของคุณได้สูงสุด 1 ใบ แล้วคอลลง (R) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/011';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ คุณสามารถนำการ์ดนี้ไปไว้ที่โซลได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/012';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าเรียร์การ์ดของคู่ต่อสู้ถอยในเทิร์นนี้ [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกทำอย่างใดอย่างหนึ่งต่อไปนี้
- พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น
- นำยูนิตนี้ไปไว้ที่โซล แล้วเลือกเรียร์การ์ดเกรด 2 ขึ้นไปของคู่ต่อสู้ 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/013';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" [COST] [ทิ้งการ์ดจากมือ 1 ใบ] พาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น ถ้าโซลของคุณมี 10 ใบขึ้นไป ให้เคาน์เตอร์ชาร์จ (1) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/014';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคู่ต่อสู้เป็นเกรด 3 [COST] [เคาน์เตอร์บลาสต์ (1)] โซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น ถ้าเรียร์การ์ดอื่นของคุณมี 3 ใบขึ้นไป ให้เป็น +10000 แทน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/015';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์แวนการ์ด ถ้าคุณอยู่ในสถานะ "บุกเต็มกำลัง" [COST] [เคาน์เตอร์บลาสต์ (1)] เลือกแวนการ์ดของคุณ 1 ใบ ให้ความสามารถ "ทริปเปิลไดรฟ์" ในเทิร์นนั้น (ทำไดรฟ์เช็คได้ 3 ครั้ง!)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/016';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 1 ใบขึ้นไป [COST] [โซลบลาสต์ (1)] เลือกยูนิตของคุณ 1 ใบ ยูนิตนั้นจะไม่ถูกฮิตจากการแอทแทคของยูนิตเกรด 2 หรือต่ำกว่าในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/017';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์โทเค็นนักรบเงาราตรี คุณสามารถให้พาวเวอร์ของยูนิตนี้ +15000 ในเทิร์นนั้นได้ ถ้าทำเช่นนั้น เมื่อจบบัตเทิลนั้น ให้ถอยเรียร์การ์ดทุกใบของคุณในแถวตั้งเดียวกันกับยูนิตนี้ แล้วจั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/018';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST] [ทิ้งการ์ดเซ็ตออเดอร์จากมือ 1 ใบ] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/019';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าเรียร์การ์ดเกรด 3 ของคุณมี 4 ใบขึ้นไป [COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] จั่วการ์ด 1 ใบ ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ คุณสามารถเลือก "พาวเวอร์ของยูนิตนี้ +5000/คริติคอล +1 ในเทิร์นนั้น" แทนการจั่วการ์ดได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/020';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าคุณไม่มีการ์ดหงายหน้าในดาเมจโซน พาวเวอร์ของยูนิตนี้ +5000 ในบัตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/021';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากมือ ถ้าแวนการ์ดของคุณคือ "จอมเวทสาวแห่งดวงแก้วหกเหลี่ยม" หรือ "จอมเวทสาวแห่งประกายห้าเหลี่ยม" [COST] [เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] เปิดดูการ์ดบนสุดของเด็คคุณ 2 ใบ เลือกการ์ดยูนิตได้สูงสุด 2 ใบคอลลง (R) ส่วนที่เหลือวางกลับบนเด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/022';
UPDATE cards SET skill_text_th = '[CONT](R): เมื่อคุณย้ายหรือสลับเรียร์การ์ดในเมนเฟส คุณสามารถย้ายไปตามแถวนอนได้ด้วย
[CONT](R): ยูนิตของคุณที่อยู่ด้านหน้ายูนิตนี้ไม่ถูกเลือกโดยเอฟเฟกต์ของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/023';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
เลือกเรียร์การ์ดใบใดใบหนึ่ง 1 ใบ แล้วถอย จากนั้นเลือกการ์ดเกรดเดียวกันจากดรอปของคุณได้สูงสุด 1 ใบ แล้วคอลลง (R) ถ้าอยู่ระหว่างผสานเวท ให้เลือกคอลได้สูงสุด 2 ใบแทน 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/024';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อใช้การ์ดนี้ได้!
ทิ้งการ์ดบนสุดของเด็คคุณ 3 ใบ แล้วเลือกการ์ดจากดรอปที่มีเกรดเท่ากับหรือต่ำกว่าแวนการ์ดของคุณได้สูงสุด 1 ใบ แล้วคอลลง (R) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาไม้ แมกโนเลีย" ให้เลือกได้สูงสุด 2 ใบแทน 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/025';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่พายุทราย ยูจีน" จ่าย [COST] [โซลบลาสต์ (1) และเรสต์ยูนิตนี้] เพื่อเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอยมันออก
[AUTO](R): ตอนเริ่มแบทเทิลเฟสของคุณ ถ้าคู่ต่อสู้มีเรียร์การ์ด 1 ใบหรือน้อยกว่า ให้สแตนด์ยูนิตนี้ และพาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/026';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยยูนิตที่มีคำว่า "โอเวอร์โหลด" ให้คอลการ์ดนี้ลง (R)
[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์โหลด" จ่าย [COST] [โซลบลาสต์ (1)] เพื่อให้แวนการ์ดทุกใบของคุณและยูนิตนี้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/027';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์โหลด" ยูนิตนี้พาวเวอร์ +5000 ในแบทเทิลนั้น และจ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพิ่มเติม เพื่อเลือกเรียร์การ์ดเกรด 2 หรือต่ำกว่าของคู่ต่อสู้ 1 ใบ แล้วถอยมันออก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/028';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกยูนิตเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลลง (R)
[AUTO](R): เมื่อยูนิตนี้แอทแทค จ่าย [COST] [โซลบลาสต์ (1)] เพื่อเลือกยูนิตเกรด 0 ของคุณ 1 ใบ ให้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/029';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 หรือสูงกว่า ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/030';
UPDATE cards SET skill_text_th = '[COST] [ทิ้งการ์ดที่มีความสามารถโอเวอร์เดรสจากมือ 1 ใบ] เพื่อเล่นการ์ดนี้ได้!
จั่ว 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/031';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จ่าย [COST] [ส่งการ์ดจากมือลงโซล 1 ใบ] เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/032';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST] [โซลบลาสต์ (1)] เพื่อไม่ให้คู่ต่อสู้อินเตอร์เซ็ปต์ได้ในเทิร์นนั้น และถ้าคุณอยู่ในสถานะ "อิคคิคาเซย์" ยูนิตนี้พาวเวอร์ +5000 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/033';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคที่ยูนิตนี้บูสต์ฮิต ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" ให้โซลชาร์จ (1) และถ้าโซลของคุณมี 10 ใบขึ้นไป จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพิ่มเติม เพื่อจั่ว 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/034';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 หรือสูงกว่า ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/035';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1) และทิ้งการ์ดจากมือ 1 ใบ] เพื่อเล่นการ์ดนี้ได้!
โซลชาร์จ (3) จากนั้นถ้าโซลของคุณมี 10 ใบขึ้นไป คุณสามารถเลือกการ์ดจากโซล 1 ใบ แล้วเก็บเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/036';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
จั่ว 1 ใบ แล้วเลือกการ์ดจากมือของคุณ 1 ใบ คอลลง (R) จากนั้นถ้าคุณอยู่ในสถานะ "อิคคิคาเซย์" ยูนิตแถวหน้าทุกใบของคุณพาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/037';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของยูนิตนี้ที่ถูกบูสต์โดยโทเค็นนักรบเงาราตรีฮิต ให้จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/038';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกเวิลด์การ์ดได้สูงสุด 1 ใบ เปิดเผยแล้วเก็บเข้ามือ ส่วนที่เหลือวางกลับไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/039';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคหรือบูสต์ ถ้าเวิลด์ของคุณคือราตรีมืดสนิท จ่าย [COST] [ถอยโทเค็นนักรบเงาราตรี 1 ใบ] เพื่อเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/040';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณมี 1 ใบหรือน้อยกว่า จ่าย [COST] [เรสต์ยูนิตนี้] เพื่อเลือกยูนิตการ์ดจากดรอปของคู่ต่อสู้ 1 ใบ แล้วส่งเข้าคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/041';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 หรือสูงกว่า ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/042';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ถ้ามือของคู่ต่อสู้มี 4 ใบขึ้นไป คู่ต่อสู้เลือกการ์ดจากมือของตัวเอง 1 ใบ แล้วส่งเข้าคุกของคุณ จากนั้นถ้าการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณมี 3 ใบขึ้นไป คุณเลือกยูนิตของตัวเอง 1 ใบ ให้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/043';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณคือ "นักเวทมนตร์สาวแห่งลูกแก้วหกเหลี่ยม" จ่าย [COST] [โซลบลาสต์ (1)] เพื่อดูการ์ดบนสุดของเด็คคุณ 2 ใบ เลือกได้สูงสุด 2 ใบ วางกลับบนเด็คตามลำดับที่ต้องการ ส่วนที่เหลือวางไว้ใต้เด็คตามลำดับที่ต้องการ
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อไดรฟ์เช็คของคุณออกเป็นทริกเกอร์ยูนิต จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อให้พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/044';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" ยูนิตนี้พาวเวอร์ +5000 ในเทิร์นนั้น และจ่าย [COST] [โซลบลาสต์ (1) และถอยเรียร์การ์ดอื่น 1 ใบ] เพิ่มเติม เพื่อดูการ์ดบนสุดของเด็คคุณ 5 ใบ เลือกยูนิตการ์ดเกรด 1 หรือต่ำกว่าได้สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/045';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) หรือ (R) จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และถอยเรียร์การ์ดอื่น 1 ใบ] เพื่อเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอยมันออก และให้ไดรฟ์ของยูนิตนี้ +1 ในเทิร์นนั้น
[CONT](R): ในเทิร์นของคุณ ถ้าเรียร์การ์ดของคุณถอยไปแล้วในเทิร์นนี้ ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/046';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" เมื่อถอยยูนิตนี้เพื่อเป็นต้นทุนของการ์ดของคุณ สามารถนับเป็นการถอย 2 ใบได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/047';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 หรือสูงกว่า ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/048';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ทำทั้งหมดต่อไปนี้ตามจำนวนยูนิตเกรด 3 ของคุณ
-2 ใบขึ้นไป - เลือกยูนิตของคุณ 1 ใบ ให้พาวเวอร์ +5000 ในเทิร์นนั้น
-3 ใบขึ้นไป - จั่ว 1 ใบ
-4 ใบขึ้นไป - เลือกแวนการ์ดของคุณ 1 ใบ ให้ไดรฟ์ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/049';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้ามียูนิตอยู่ด้านหน้ายูนิตนี้ 2 ใบขึ้นไป ยูนิตนี้พาวเวอร์ +5000 ในแบทเทิลนั้น และถ้ามี 3 ใบขึ้นไป โซลชาร์จ (1) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/050';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าคุณผสานเวทออเดอร์ในเทิร์นนี้ จ่าย [COST] [โซลบลาสต์ (1)] เพื่อให้พาวเวอร์ของยูนิตนี้ +5000 ในแบทเทิลนั้น และคู่ต่อสู้จะคอลจากมือลง (G) ได้ก็ต่อเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/051';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคที่ยูนิตนี้บูสต์ฮิตที่แวนการ์ด จ่าย [COST] [ไบนด์ยูนิตนี้] เพื่อเลือกออเดอร์การ์ดจากไบนด์โซนของคุณ 1 ใบ แล้วเก็บเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/052';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถส่งการ์ดทั้งหมดในไบนด์โซนของคุณลงดรอปได้ ถ้าทำ ยูนิตนี้จะพาวเวอร์ +5000 ในเทิร์นนั้น ต่อการ์ด 1 ใบที่ส่งลงไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/053';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 หรือสูงกว่า ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/054';
UPDATE cards SET skill_text_th = 'คุณสามารถเลือกการ์ดเกรด 3 ที่มีคำว่า "โซลก้า" จากไรด์เด็คของคุณ 1 ใบ แล้วเปิดเผยได้ ถ้าคุณเปิดเผย หรือแวนการ์ดของคุณคือเกรด 3 หรือสูงกว่าที่มีคำว่า "โซลก้า" ให้เลือกเรียร์การ์ดของคุณ 1 ใบ แล้วให้พาวเวอร์ +5000 ในเทิร์นนั้น ต่อดรอปของคุณทุก 5 ใบ ถ้าดรอปของคุณมี 15 ใบขึ้นไป ให้คริติคอลของยูนิตนั้น +1 เพิ่มเติมในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/055';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแถวหน้าของคู่ต่อสู้ไม่มีเรียร์การ์ดอยู่เลย ยูนิตนี้พาวเวอร์ +5000 ในแบทเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/056';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วย้ายไปยัง (R) แถวหน้าที่ไม่มียูนิตอยู่ของคู่ต่อสู้ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/057';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าคู่ต่อสู้มีเรียร์การ์ด 2 ใบหรือน้อยกว่า ยูนิตนี้ชิลด์ +10000 ในแบทเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/058';
UPDATE cards SET skill_text_th = '[AUTO][แถวหน้า (R)]: เมื่อยูนิตเกรด 0 ของคุณแอทแทค ให้ยูนิตที่แอทแทคนั้นและยูนิตนี้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/059';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคที่ยูนิตนี้บูสต์แวนการ์ดฮิต จ่าย [COST] [ถอยยูนิตนี้] เพื่อเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/060';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อเลือกเรียร์การ์ดของคู่ต่อสู้ในคอลัมน์เดียวกับยูนิตนี้ 1 ใบ แล้วถอยมันออก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/061';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคที่ยูนิตนี้บูสต์ฮิต จ่าย [COST] [โซลบลาสต์ (1) และถอยยูนิตนี้] เพื่อเลือกยูนิตของคุณ 1 ใบ ให้พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/062';
UPDATE cards SET skill_text_th = '[CONT](R): ในแบทเทิลที่ยูนิตนี้บูสต์เกรด 0 ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/063';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "อัศวินมังกร เนฮาเร็น" จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อค้นหาเกรด 1 จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเก็บเข้ามือ จากนั้นสับเด็ค
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อแอทแทคของแวนการ์ดของคุณฮิต ยูนิตนี้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/064';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้ามี "นางพรตแห่งเปลวเพลิง เรยู" หรือ "นางพรตแห่งเปลวเพลิง รินโน" อยู่ที่ (V) หรือ (R) ของคุณ ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/065';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นคนที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/066';
UPDATE cards SET skill_text_th = 'เลือกแวนการ์ดของคุณ 1 ใบ แล้วมอบความสามารถนี้ให้ในเทิร์นนั้น『[CONT](V): เมื่อยูนิตทุกใบของคุณแอทแทค สามารถแอทแทคเรียร์การ์ดแถวหลังของคู่ต่อสู้ได้』', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/067';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ถ้าคุณมีเรียร์การ์ดที่มีความสามารถโอเวอร์เดรส เลือกยูนิตของคุณ 1 ใบ ให้พาวเวอร์ +15000 ในแบทเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/068';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าโซลของคุณมี 4 ใบหรือน้อยกว่า จ่าย [COST] [ส่งยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ ให้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/069';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/070';
UPDATE cards SET skill_text_th = '[AUTO](V)/(R): เมื่อยูนิตนี้แอทแทคแวนการ์ด จ่าย [COST] [โซลบลาสต์ (1)] เพื่อให้พาวเวอร์ของยูนิตนี้ +5000 ในแบทเทิลนั้น ถ้าคุณอยู่ในสถานะ "อิคคิคาเซย์" ให้เป็น +15000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/071';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด ถ้าโซลของคุณมี 10 ใบขึ้นไป จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อทำให้ในแบทเทิลนั้น คู่ต่อสู้จะคอลจากมือลง (G) ได้ก็ต่อเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/072';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าโซลของคุณมี 5 ใบขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/073';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "ไดอาโบลส “ทรราช” บรูซ" จ่าย [COST] [เคาน์เตอร์บลาสต์ (2)] เพื่อให้พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/074';
UPDATE cards SET skill_text_th = '[AUTO][แถวหน้า (R)]: เมื่อแวนการ์ดของคุณลงสนาม โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/075';
UPDATE cards SET skill_text_th = '[AUTO](R): ตอนจบแบทเทิลที่ยูนิตนี้บูสต์ ถ้าคุณอยู่ในสถานะ "อิคคิคาเซย์" จ่าย [COST] [ส่งยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ ให้พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/076';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และส่งยูนิตนี้ลงโซล] เพื่อเลือกยูนิตแถวหน้าของคุณ 3 ใบ ให้พาวเวอร์ +5000 ในเทิร์นนั้น (การเพิ่มพาวเวอร์จากการบูสต์ของยูนิตนี้จะหายไป)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/077';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์เรียร์การ์ด ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อทำให้ในแบทเทิลนั้น คู่ต่อสู้ไม่สามารถคอลเกรด 1 ขึ้นไปจากมือลง (G) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/078';
UPDATE cards SET skill_text_th = '[CONT](R): ในแบทเทิลที่ยูนิตนี้บูสต์แวนการ์ด ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/079';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าโซลของคุณมี 5 ใบขึ้นไป ยูนิตนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/080';
UPDATE cards SET skill_text_th = 'เลือก "ไดอาโบลส “ทรราช” บรูซ" ที่ (V) หรือ (R) ของคุณ 1 ใบ ให้พาวเวอร์ +20000 ในแบทเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/081';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค จ่าย [COST] [โซลบลาสต์ (1) และถอยโทเค็นนักรบเงาราตรี 1 ใบ] เพื่อทำให้ในแบทเทิลนั้น คู่ต่อสู้จะคอลจากมือลง (G) ได้ก็ต่อเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/082';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ส่งเข้าคุกของคุณ และให้พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/083';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/084';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าจำนวนเรียร์การ์ดของคุณมากกว่าคู่ต่อสู้ จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อโซลชาร์จ (1) และให้พาวเวอร์ของยูนิตนี้ +10000 ในแบทเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/085';
UPDATE cards SET skill_text_th = '[AUTO](R): ตอนจบแต่ละเทิร์น ถ้าเวิลด์ของคุณคือราตรีมืดสนิท คุณและคู่ต่อสู้เลือกเรียร์การ์ดของตัวเอง 1 ใบ แล้วถอยมันออก (ไฟท์เตอร์ของเทิร์นนั้นเลือกยูนิตที่จะถอยก่อน)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/086';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) เลือกการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณ 1 ใบ แล้วส่งลงดรอปของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/087';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของยูนิตนี้ฮิตที่แวนการ์ด ถ้ายูนิตนี้ถูกบูสต์อยู่ จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/088';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางลงที่ (G) ถ้าเวิลด์ของคุณคือราตรีมืด โซลชาร์จ (1) ถ้าเป็นราตรีมืดสนิท โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/089';
UPDATE cards SET skill_text_th = '[CONT](R): ในแบทเทิลที่ยูนิตนี้บูสต์ ถ้าการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณมี 2 ใบขึ้นไป ยูนิตนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/090';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณมี 5 ใบขึ้นไป เลือกเคาน์เตอร์ชาร์จ (1) หรือโซลชาร์จ (3)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/091';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้ามีเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ ยูนิตนี้จะได้รับความสามารถ "อินเตอร์เซ็ปต์"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/092';
UPDATE cards SET skill_text_th = '[COST] [โซลบลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
เลือกยูนิตของคู่ต่อสู้ที่กำลังแอทแทค 1 ใบ ให้พาวเวอร์ -5000 ในเทิร์นนั้น ต่อการ์ดของคู่ต่อสู้ที่ถูกขังอยู่ในคุกของคุณ 1 ใบ (แม้พาวเวอร์จะติดลบ ก็ไม่ถอยยูนิตนั้น)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/093';
UPDATE cards SET skill_text_th = '(เซ็ตออเดอร์หลังเล่นแล้วให้วางไว้ในออเดอร์โซน)
[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
[AUTO]: เมื่อการ์ดนี้ถูกวางลงในออเดอร์โซน คอลโทเค็นนักรบเงาราตรี 1 ใบลง (R) (นักรบเงาราตรีมีพาวเวอร์ 15000 และมีความสามารถบูสต์)
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากเวิลด์การ์ด ผลต่อไปนี้จะมีผลตามจำนวนการ์ดรวมในออเดอร์โซนของคุณ
-1 ใบ - เวิลด์ของคุณจะกลายเป็นราตรีมืด
-2 ใบขึ้นไป - เวิลด์ของคุณจะกลายเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/094';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถอยออกจาก (R) เพื่อเป็นต้นทุนของการ์ดของคุณ จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] เพื่อให้ยูนิตทุกใบของคุณที่มีคำว่า "บลาสเตอร์" พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/095';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อไดรฟ์เช็คของคุณออกเป็นทริกเกอร์ยูนิต ถ้าแวนการ์ดของคุณคือ "นักเวทมนตร์สาวแห่งลูกแก้วหกเหลี่ยม" จ่าย [COST] [ถอยยูนิตนี้] เพื่อเลือกเคาน์เตอร์ชาร์จ (1) หรือโซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/096';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ออกมาจากไดรฟ์เช็คของคุณ คุณสามารถคอลการ์ดนี้ลง (R) ที่ไม่มียูนิตอยู่ได้ ถ้าทำ ยูนิตนี้จะได้รับความสามารถ "บูสต์" ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/097';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ จ่าย [COST] [เคาน์เตอร์บลาสต์ (2) และโซลบลาสต์ (1)] เพื่อเลือกคอลัมน์ 1 คอลัมน์ แล้วให้คู่ต่อสู้นำเรียร์การ์ดทั้งหมดของตัวเองในคอลัมน์นั้นไปไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/098';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/099';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จากมือ จ่าย [COST] [เคาน์เตอร์บลาสต์ (1) และเรสต์เรียร์การ์ดอื่น 1 ใบ] เพื่อเปิดเผยการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นออเดอร์การ์ดหรือเกรด 3 ให้เก็บเข้ามือ ถ้าไม่ใช่ ให้คอลลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/100';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST] [โซลบลาสต์ (1) และส่งยูนิตนี้ลงดาเมจโซน] เพื่อเลือกการ์ดเกรด 3 ที่หงายอยู่ในดาเมจโซนของคุณ 1 ใบ แล้วคอลลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/101';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จ่าย [COST] [โซลบลาสต์ (1)] เพื่อจั่ว 1 ใบ แล้วเลือกการ์ดจากมือของคุณ 1 ใบ ทิ้งไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/102';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST] [โซลบลาสต์ (2)] เพื่อเพิ่มค่าพาวเวอร์ที่ได้จากทริกเกอร์ที่ออกในไดรฟ์เช็คของคุณอีก +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/103';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "บลาสเตอร์ ดาร์ก" เปิดเผยการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นยูนิตการ์ด ให้คอลลง (R) แบบเรสต์ ถ้าไม่ใช่ ให้ทิ้งไป
[CONT](R): ในเทิร์นของคุณ ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" ยูนิตนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/104';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" จ่าย [COST] [เรสต์ยูนิตนี้] เพื่อดูการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นยูนิตการ์ด คุณสามารถคอลลง (R) ได้ ตอนจบเทิร์นนั้น ให้ถอยยูนิตที่คอลมานั้นออก (ถ้าไม่คอล ให้วางกลับไว้บนเด็ค)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/105';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นคนที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/106';
UPDATE cards SET skill_text_th = 'ถ้ายูนิตเกรด 3 ของคุณมี 3 ใบขึ้นไป เลือกแวนการ์ดของคุณ 1 ใบ ให้พาวเวอร์ +20000 ในแบทเทิลนั้น (รวม (G) ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/107';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): ถ้าคุณไม่ได้คอลเรียร์การ์ดจากที่อื่นนอกจากมือในเทิร์นนี้ ยูนิตนี้จะไม่สามารถแอทแทคได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/108';
UPDATE cards SET skill_text_th = '[CONT](V): เมื่อคุณเล่นนอร์มอลออเดอร์ คุณสามารถไบนด์นอร์มอลออเดอร์ชื่อเดียวกันจากดรอป 1 ใบ แล้วผสานเวทได้ (รวมต้นทุนเข้าด้วยกัน และเพิ่มเอฟเฟกต์ต่อท้าย!)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/109';
UPDATE cards SET skill_text_th = '[ACT][ดรอป] เทิร์นละ 1 ครั้ง: จ่าย [COST] [โซลบลาสต์ (1) และไบนด์ออเดอร์การ์ดจากดรอป 1 ใบ] เพื่อคอลการ์ดนี้ลง (R) ที่ไม่มียูนิตอยู่', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/110';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อให้ยูนิตนี้ได้รับความสามารถนี้ในเทิร์นนั้น『[CONT][แถวหลัง (R)]: เมื่อยูนิตนี้แอทแทค จะแบทเทิลกับยูนิตแถวหน้าทุกใบของคู่ต่อสู้』', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/111';
UPDATE cards SET skill_text_th = '[CONT](R): ยูนิตนี้สามารถอินเตอร์เซ็ปต์ได้แม้อยู่แถวหลัง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/112';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าออเดอร์การ์ดในดรอปและไบนด์โซนของคุณรวมกันมี 3 ใบขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/113';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค จ่าย [COST] [โซลบลาสต์ (2)] เพื่อให้พาวเวอร์ของยูนิตนี้ +5000 ในแบทเทิลนั้น ต่อเรียร์การ์ดอื่นของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/114';
UPDATE cards SET skill_text_th = '[CONT]: การ์ดนี้ไม่สามารถไรด์ คอล หรือย้ายไปยังแถวหน้าได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/115';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคที่ยูนิตนี้บูสต์ฮิตที่แวนการ์ด คุณสามารถทิ้งการ์ดบนสุดของเด็คคุณ 5 ใบได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/116';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST] [โซลบลาสต์ (1) และถอยยูนิตนี้] เพื่อดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกยูนิตการ์ดได้สูงสุด 1 ใบ คอลลง (R) แถวหลัง ส่วนที่เหลือทิ้งไป ในเทิร์นนั้น ยูนิตที่คอลมาจะไม่สามารถย้ายไปยัง (R) อื่นได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/117';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคหรือบูสต์ จ่าย [COST] [โซลบลาสต์ (1)] เพื่อให้พาวเวอร์ของยูนิตนี้ +2000 ในแบทเทิลนั้น ต่อเรียร์การ์ดของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/118';
UPDATE cards SET skill_text_th = 'ในเทิร์นนั้น เรียร์การ์ดแถวหลังทั้งหมดของคุณพาวเวอร์ +5000 และคุณจะไม่สามารถย้ายเรียร์การ์ดไปยัง (R) อื่น หรือบูสต์ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/119';
UPDATE cards SET skill_text_th = '[COST] [เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ไบนด์การ์ดนี้ แล้วเลือกออเดอร์การ์ดจากดรอปของคุณได้สูงสุด 2 ใบ เก็บเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/120';
UPDATE cards SET skill_text_th = '[AUTO](V): ตอนเริ่มไรด์เฟสของคุณ คุณจะเข้าสู่สถานะ "อิคคิคาเซย์" ในเทิร์นนั้น
[AUTO](V): เมื่อยูนิตนี้แอทแทค ถ้าคุณอยู่ในสถานะ "อิคคิคาเซย์" จ่าย [COST] [โซลบลาสต์ (5)] เพื่อสแตนด์เรียร์การ์ดแถวหน้าทั้งหมดของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/DSR01';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ ยูนิตเกรด 3 ทุกใบของคุณพาวเวอร์ +2000
[AUTO](V) เทิร์นละ 1 ครั้ง: ตอนจบแบทเทิลที่ไดรฟ์เช็คของคุณออกเป็นเกรด 3 จ่าย [COST] [ทิ้งการ์ดจากมือ 1 ใบ] เพื่อเลือกเรียร์การ์ดของคุณ 1 ใบ สแตนด์ แล้วให้พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/DSR02';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่พายุทราย ยูจีน" จ่าย [COST] [โซลบลาสต์ (1) และเรสต์ยูนิตนี้] เพื่อเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอยมันออก
[AUTO](R): ตอนเริ่มแบทเทิลเฟสของคุณ ถ้าคู่ต่อสู้มีเรียร์การ์ด 1 ใบหรือน้อยกว่า ให้สแตนด์ยูนิตนี้ และพาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H01';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยยูนิตที่มีคำว่า "โอเวอร์โหลด" ให้คอลการ์ดนี้ลง (R)
[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์โหลด" จ่าย [COST] [โซลบลาสต์ (1)] เพื่อให้แวนการ์ดทุกใบของคุณและยูนิตนี้พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H02';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์โหลด" ยูนิตนี้พาวเวอร์ +5000 ในแบทเทิลนั้น และจ่าย [COST] [เคาน์เตอร์บลาสต์ (1)] เพิ่มเติม เพื่อเลือกเรียร์การ์ดเกรด 2 หรือต่ำกว่าของคู่ต่อสู้ 1 ใบ แล้วถอยมันออก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H03';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลลงสู่ (R)
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าจ่าย [COST][โซลบลาสต์ (1)] เลือกยูนิตเกรด 0 ของคุณ 1 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H04';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H05';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][ทิ้งการ์ดที่มีความสามารถโอเวอร์เดรสจากมือ 1 ใบ]!
จั่วการ์ด 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ สามารถย้ายไปยัง (R) แถวหน้าของคู่ต่อสู้ที่ไม่มียูนิตอยู่ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H07';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคที่ยูนิตนี้บูสต์แวนการ์ดฮิต ถ้าจ่าย [COST][ถอยยูนิตนี้] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H08';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ทับโดย "ดราก้อนไนท์ เนฮาเร็น" ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ค้นหาเกรด 1 จากเด็คของคุณสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของแวนการ์ดคุณฮิต พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H09';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H10';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าจ่าย [COST][ส่งการ์ดจากมือลงโซล 1 ใบ] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H11';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าจ่าย [COST][โซลบลาสต์ (1)] ตลอดเทิร์นนั้นคู่ต่อสู้อินเตอร์เซ็ปต์ไม่ได้ และถ้าคุณ "อิคคิคาเซย์" พาวเวอร์ของยูนิตนี้ +5000 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H12';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิต ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" โซลชาร์จ (1) และถ้าโซลของคุณมี 10 ใบขึ้นไป จ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพิ่มเติมเพื่อจั่วการ์ด 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H13';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H14';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ]!
โซลชาร์จ (3) จากนั้นถ้าโซลของคุณมี 10 ใบขึ้นไป สามารถเลือกการ์ดจากโซล 1 ใบ แล้วเพิ่มเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H15';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
จั่วการ์ด 1 ใบ เลือกการ์ด 1 ใบจากมือของคุณ แล้วคอลลงสู่ (R) จากนั้นถ้าคุณ "อิคคิคาเซย์" พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H16';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าโซลของคุณมี 4 ใบหรือน้อยกว่า ถ้าจ่าย [COST][ส่งยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H17';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อจบการต่อสู้ที่ยูนิตนี้บูสต์ ถ้าคุณ "อิคคิคาเซย์" ถ้าจ่าย [COST][ส่งยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H18';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ส่งยูนิตนี้ลงโซล] เลือกยูนิตแถวหน้าของคุณ 3 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H19';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์เรียร์การ์ด ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] ตลอดการต่อสู้นั้น คู่ต่อสู้คอลเกรด 1 ขึ้นไปลงสู่ (G) จากมือไม่ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H20';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ที่ถูกบูสต์โดยโทเคนทหารเงาราตรีฮิต จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H21';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) เปิดดูการ์ด 3 ใบบนสุดของเด็คคุณ เลือกการ์ดโลกสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ ส่วนที่เหลือวางไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H22';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคหรือบูสต์ ถ้าโลกของคุณคือราตรีมืดสนิท ถ้าจ่าย [COST][ถอยโทเคนทหารเงาราตรี 1 ใบ] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H23';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 1 ใบหรือน้อยกว่า ถ้าจ่าย [COST][เรสต์ยูนิตนี้] เลือกการ์ดยูนิตจากดรอปของคู่ต่อสู้ 1 ใบ แล้วคุมขังไว้ในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H24';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H25';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][โซลบลาสต์ (1)]!
ถ้ามือของคู่ต่อสู้มี 4 ใบขึ้นไป คู่ต่อสู้เลือกการ์ดจากมือตัวเอง 1 ใบ แล้วให้คุณคุมขังไว้ในคุกของคุณ จากนั้นถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 3 ใบขึ้นไป เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H26';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อจบแต่ละเทิร์น ถ้าโลกของคุณคือราตรีมืดสนิท ทั้งคุณและคู่ต่อสู้เลือกเรียร์การ์ดของตัวเอง 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H27';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) เลือกการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณ 1 ใบ แล้ววางลงดรอปของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H28';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 5 ใบขึ้นไป เลือกทำ เคาน์เตอร์ชาร์จ (1) หรือ โซลชาร์จ (3)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H29';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออร์เดอร์โซน คอลโทเคนทหารเงาราตรี 1 ใบลงสู่ (R)
[CONT][ออร์เดอร์โซน]: ถ้าในออร์เดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากการ์ดโลก จำนวนการ์ดทั้งหมดในออร์เดอร์โซนของคุณจะทำให้สิ่งต่อไปนี้มีผล
-1 ใบ - โลกของคุณกลายเป็นราตรีมืด
-2 ใบขึ้นไป - โลกของคุณกลายเป็นราตรีมืดสนิท', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H30';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งปิ่นมณีหกเหลี่ยม" ถ้าจ่าย [COST][โซลบลาสต์ (1)] เปิดดูการ์ด 2 ใบบนสุดของเด็คคุณ เลือกสูงสุด 2 ใบ วางกลับบนเด็คตามลำดับที่ต้องการ ส่วนที่เหลือวางไว้ใต้เด็คตามลำดับที่ต้องการ
[AUTO][(R)]: เมื่อไดรฟ์เช็คของคุณออกเป็นยูนิตทริกเกอร์ ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] พาวเวอร์ของยูนิตนี้ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H31';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น นอกจากนี้ถ้าจ่าย [COST][โซลบลาสต์ (1), ถอยเรียร์การ์ดอื่น 1 ใบ] เปิดดูการ์ด 5 ใบบนสุดของเด็คคุณ เลือกการ์ดยูนิตเกรด 1 หรือต่ำกว่าสูงสุด 1 ใบ แล้วคอลลงสู่ (R) จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H32';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (V) หรือ (R) ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ดอื่น 1 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย ไดรฟ์ของยูนิตนี้ +1 ตลอดเทิร์นนั้น
[CONT][(R)]: ในเทิร์นของคุณ ถ้าเรียร์การ์ดของคุณถอยไปแล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H33';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ เมื่อถอยยูนิตนี้เป็นคอสต์ของการ์ดคุณ สามารถนับเป็นการถอย 2 ใบได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H34';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H35';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)]!
ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนยูนิตเกรด 3 ของคุณ
-2 ใบขึ้นไป - เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น
-3 ใบขึ้นไป - จั่วการ์ด 1 ใบ
-4 ใบขึ้นไป - เลือกแวนการ์ดของคุณ 1 ใบ ไดรฟ์ +1 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H36';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) จากมือ ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), เรสต์เรียร์การ์ดอื่น 1 ใบ] เปิดเผยการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดออร์เดอร์หรือเกรด 3 ให้เพิ่มเข้ามือ ถ้าไม่ใช่ให้คอลลงสู่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H37';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ทับโดย "บลาสเตอร์ ดาร์ก" เปิดเผยการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดยูนิตให้คอลลงสู่ (R) ในสถานะเรสต์ ถ้าไม่ใช่ให้ทิ้ง
[CONT][(R)]: ในเทิร์นของคุณ ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H38';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ ถ้าจ่าย [COST][เรสต์ยูนิตนี้] เปิดดูการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดยูนิต สามารถคอลลงสู่ (R) ได้ เมื่อจบเทิร์นนั้นให้ถอยยูนิตที่คอลมา', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H39';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H40';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้ามียูนิตอยู่ด้านหน้ายูนิตนี้ 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น และถ้ามี 3 ใบขึ้นไป โซลชาร์จ (1) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H41';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าคุณผสานเวทออร์เดอร์ในเทิร์นนี้ ถ้าจ่าย [COST][โซลบลาสต์ (1)] พาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น และเมื่อคู่ต่อสู้จะคอลลงสู่ (G) จากมือ จะคอลไม่ได้นอกเสียจากจะคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H42';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิตแวนการ์ด ถ้าจ่าย [COST][ไบนด์ยูนิตนี้] เลือกการ์ดออร์เดอร์จากไบนด์โซนของคุณ 1 ใบ แล้วเพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H43';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) สามารถวางการ์ดทั้งหมดในไบนด์โซนของคุณลงดรอปได้ ถ้าทำ พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น ต่อการ์ด 1 ใบที่วางลงไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H44';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H45';
UPDATE cards SET skill_text_th = 'สามารถเลือกเกรด 3 ที่มีคำว่า "โซลก้า" อยู่ในชื่อจากไรด์เด็คของคุณ 1 ใบ แล้วเปิดเผยได้ ถ้าเปิดเผย หรือแวนการ์ดของคุณคือเกรด 3 ขึ้นไปที่มีคำว่า "โซลก้า" อยู่ในชื่อ เลือกเรียร์การ์ดของคุณ 1 ใบ พาวเวอร์ +5000 ตลอดเทิร์นนั้น ต่อดรอปของคุณทุก 5 ใบ ถ้าดรอปของคุณมี 15 ใบขึ้นไป คริติคอลของยูนิตนั้น +1 เพิ่มเติมตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H46';
UPDATE cards SET skill_text_th = '[ACT][ดรอป] เทิร์นละ 1 ครั้ง: ถ้าจ่าย [COST][โซลบลาสต์ (1), ไบนด์การ์ดออร์เดอร์จากดรอป 1 ใบ] คอลการ์ดนี้ลงสู่ (R) ที่ไม่มียูนิตอยู่', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H47';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ยูนิตนี้จะได้รับความสามารถ "[CONT][(R) แถวหลัง]: เมื่อยูนิตนี้แอทแทค จะต่อสู้กับยูนิตแถวหน้าทั้งหมดของคู่ต่อสู้" ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H48';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าจ่าย [COST][โซลบลาสต์ (1), ถอยยูนิตนี้] เปิดดูการ์ด 3 ใบบนสุดของเด็คคุณ เลือกการ์ดยูนิตสูงสุด 1 ใบ แล้วคอลลงสู่ (R) แถวหลัง ส่วนที่เหลือทิ้ง ยูนิตที่คอลมาจะย้ายไปยัง (R) อื่นไม่ได้ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H49';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
ไบนด์การ์ดนี้ แล้วเลือกการ์ดออร์เดอร์จากดรอปของคุณสูงสุด 2 ใบ เพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/H50';
UPDATE cards SET skill_text_th = '[CONT][(V)/(R)]: ตลอดการต่อสู้ที่ยูนิตนี้แอทแทคเรียร์การ์ด คู่ต่อสู้คอลลงสู่ (G) จากมือไม่ได้
[AUTO][(V)] เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของยูนิตนี้ฮิต ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] สแตนด์ยูนิตนี้ และไดรฟ์ -1 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP01';
UPDATE cards SET skill_text_th = 'โอเวอร์เดรส - "ทริกสตา"
[AUTO][มือ]: เมื่อจบการต่อสู้ที่ "ทริกสตา" ของคุณแอทแทคแวนการ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเทพแห่งวงล้อสวรรค์ นิรวาณะ" ถ้าจ่าย [COST][โซลบลาสต์ (2)] ให้โอเวอร์เดรสการ์ดนี้ทับ "ทริกสตา" ของคุณที่ (R) ในสถานะสแตนด์ แล้วเคาน์เตอร์ชาร์จ (1)
[CONT][(R)/(G)]: ถ้ายูนิตนี้อยู่ในสถานะโอเวอร์เดรส พาวเวอร์ของยูนิตนี้ +10000 / ชิลด์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP02';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด โซลชาร์จ (1)
[ACT][โซล]: ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), วางการ์ดนี้ลงดรอป] โซลชาร์จ (1) แล้วเลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP03';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณ "อิคคิคาเซย์" พาวเวอร์ของยูนิตนี้ +5000 และเมื่อยูนิตนี้แอทแทค จะต่อสู้กับยูนิตทั้งหมดในแนวตั้งหนึ่งแถวของคู่ต่อสู้
[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต โซลชาร์จ (1) และถ้าแวนการ์ดของคุณคือ "ดิอาโบลส ''ทรราช'' บรูซ" เลือกการ์ดจากโซลสูงสุด 1 ใบ แล้วคอลลงสู่ (R) ที่ไม่มียูนิตอยู่', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP04';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในเทิร์นของคุณ ถ้าโลกของคุณคือราตรีมืด พาวเวอร์ของยูนิตนี้ +2000 ถ้าไม่ใช่ราตรีมืดแต่เป็นราตรีมืดสนิท พาวเวอร์ +5000
[AUTO][(R)]: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าจ่าย [COST][ถอยโทเคนทหารเงาราตรี 1 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้สูงสุด 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP05';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในเทิร์นของคุณ ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000
[AUTO][(R) แถวหน้า]: เมื่อการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณออกสู่ (R) พาวเวอร์ของยูนิตนั้น -5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP06';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ ยูนิตนี้จะได้รับความสามารถ "บูสต์"
[AUTO][(R) แถวหลัง] เทิร์นละ 1 ครั้ง: เมื่อยูนิตอื่นของคุณสแตนด์ด้วยเอฟเฟกต์ของการ์ด สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP07';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (V) สามารถเลือกการ์ดที่มีคำว่า "บลาสเตอร์" อยู่ในชื่อจากโซลของคุณ 1 ใบ แล้วคอลลงสู่ (R) ได้
[ACT][(V)] เทิร์นละ 1 ครั้ง: ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ด 3 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้สูงสุด 2 ใบ แล้วถอย พาวเวอร์ของยูนิตนี้ +10000 / คริติคอล +1 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP08';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาไม้ แมกโนเลีย" ถ้าจ่าย [COST][โซลบลาสต์ (1)] เลือกเรียร์การ์ดของคุณ 1 ใบ ยูนิตนั้นสามารถแอทแทคได้แม้จากแถวหลัง และพาวเวอร์ +5000 ตลอดเทิร์นนั้น
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้ถูกเลือกโดยเอฟเฟกต์ของแวนการ์ดของคุณ พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP09';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณเล่นออร์เดอร์ในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000
[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ครั้งต่อไปที่คุณผสานเวทออร์เดอร์แล้วเล่นในเทิร์นนี้ คอสต์ของมันจะลดลงเคาน์เตอร์บลาสต์ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP10';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกเรียร์การ์ดแถวหน้าของคู่ต่อสู้ 1 ใบ แล้วถอย และถ้าแวนการ์ดของคุณคือ "มังกรเทพแห่งวงล้อสวรรค์ นิรวาณะ" เลือกเกรด 0 จากดรอปของคุณสูงสุด 1 ใบ แล้วคอลลงสู่ (R) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP11';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ สามารถส่งการ์ดนี้ลงโซลได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP12';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าเรียร์การ์ดของคู่ต่อสู้ถอยไปแล้วในเทิร์นนี้ ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกทำอย่างใดอย่างหนึ่งต่อไปนี้
-พาวเวอร์ของยูนิตนี้ +10000 ตลอดเทิร์นนั้น
-ส่งยูนิตนี้ลงโซล แล้วเลือกเรียร์การ์ดของคู่ต่อสู้เกรด 2 ขึ้นไป 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP13';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาโรว์แมกเนส" ถ้าจ่าย [COST][ทิ้งการ์ดจากมือ 1 ใบ] พาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น และถ้าโซลของคุณมี 10 ใบขึ้นไป เคาน์เตอร์ชาร์จ (1) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP14';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] โซลชาร์จ (1) และพาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น ถ้าเรียร์การ์ดอื่นของคุณมี 3 ใบขึ้นไป ให้เป็น +10000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP15';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์แวนการ์ด ถ้าคุณ "อิคคิคาเซย์" ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกแวนการ์ดของคุณ 1 ใบ แล้วให้ความสามารถ "ทริปเปิลไดรฟ์" ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP16';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางลง (G) ถ้าการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณมี 1 ใบขึ้นไป ถ้าจ่าย [COST][โซลบลาสต์ (1)] เลือกยูนิตของคุณ 1 ใบ ตลอดการต่อสู้นั้นยูนิตนี้จะไม่ถูกฮิตจากการแอทแทคของยูนิตเกรด 2 หรือต่ำกว่า', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP17';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์โทเคนทหารเงาราตรี สามารถเพิ่มพาวเวอร์ของยูนิตนี้ +15000 ตลอดเทิร์นนั้นได้ ถ้าทำ เมื่อจบการต่อสู้นั้นให้ถอยเรียร์การ์ดทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้ แล้วจั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP18';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าจ่าย [COST][ทิ้งการ์ดออร์เดอร์เซ็ตจากมือ 1 ใบ] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP19';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าเรียร์การ์ดเกรด 3 ของคุณมี 4 ใบขึ้นไป ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] จั่วการ์ด 1 ใบ ถ้าคุณเพอร์โซนาไรด์ในเทิร์นนี้ สามารถเลือกทำ "พาวเวอร์ของยูนิตนี้ +5000 / คริติคอล +1 ตลอดเทิร์นนั้น" แทนการจั่วการ์ด 1 ใบได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP20';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าดาเมจโซนของคุณไม่มีการ์ดที่เปิดหน้าอยู่เลย พาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP21';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) จากมือ ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งปิ่นมณีหกเหลี่ยม" หรือ "นักเวทย์หญิงแห่งแสงประกายห้าเหลี่ยม" ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] เปิดดูการ์ด 2 ใบบนสุดของเด็คคุณ เลือกการ์ดยูนิตสูงสุด 2 ใบ แล้วคอลลงสู่ (R) ส่วนที่เหลือวางไว้บนเด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP22';
UPDATE cards SET skill_text_th = '[CONT][(R)]: เมื่อคุณย้ายหรือสลับเรียร์การ์ดในเมนเฟส สามารถย้ายไปตามแนวนอนได้ด้วย
[CONT][(R)]: ยูนิตของคุณที่อยู่ด้านหน้ายูนิตนี้จะไม่ถูกเลือกโดยเอฟเฟกต์ของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP23';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)]!
เลือกเรียร์การ์ดใบใดใบหนึ่ง 1 ใบ แล้วถอย จากนั้นเลือกการ์ดจากดรอปของคุณที่เกรดเท่ากันสูงสุด 1 ใบ แล้วคอลลงสู่ (R) ถ้ากำลังผสานเวทอยู่ สามารถเลือกคอลได้สูงสุด 2 ใบแทน 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP24';
UPDATE cards SET skill_text_th = 'เล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
ทิ้งการ์ดบนสุดของเด็คคุณ 3 ใบ แล้วเลือกการ์ดจากดรอปที่เกรดเท่ากับหรือต่ำกว่าแวนการ์ดของคุณสูงสุด 1 ใบ แล้วคอลลงสู่ (R) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาไม้ แมกโนเลีย" สามารถเลือกได้สูงสุด 2 ใบแทน 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP25';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP26';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP27';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP28';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP29';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP30';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ทับโดยยูนิตที่มีคำว่า "โอเวอร์ลอร์ด" อยู่ในชื่อ คอลการ์ดนี้ลงสู่ (R)
[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์ลอร์ด" อยู่ในชื่อ ถ้าจ่าย [COST][โซลบลาสต์ (1)] พาวเวอร์ของแวนการ์ดทั้งหมดของคุณและยูนิตนี้ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP31';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีคำว่า "โอเวอร์ลอร์ด" อยู่ในชื่อ พาวเวอร์ของยูนิตนี้ +5000 ตลอดการต่อสู้นั้น นอกจากนี้ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของคู่ต่อสู้เกรด 2 หรือต่ำกว่า 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP32';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคที่ยูนิตนี้บูสต์แวนการ์ดฮิต ถ้าจ่าย [COST][ถอยยูนิตนี้] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP33';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ทับโดย "ดราก้อนไนท์ เนฮาเร็น" ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ค้นหาเกรด 1 จากเด็คของคุณสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อการแอทแทคของแวนการ์ดคุณฮิต พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP34';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP35';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น นอกจากนี้ถ้าจ่าย [COST][โซลบลาสต์ (1), ถอยเรียร์การ์ดอื่น 1 ใบ] เปิดดูการ์ด 5 ใบบนสุดของเด็คคุณ เลือกการ์ดยูนิตเกรด 1 หรือต่ำกว่าสูงสุด 1 ใบ แล้วคอลลงสู่ (R) จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP36';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (V) หรือ (R) ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ดอื่น 1 ใบ] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย ไดรฟ์ของยูนิตนี้ +1 ตลอดเทิร์นนั้น
[CONT][(R)]: ในเทิร์นของคุณ ถ้าเรียร์การ์ดของคุณถอยไปแล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP37';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ทับโดย "บลาสเตอร์ ดาร์ก" เปิดเผยการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดยูนิตให้คอลลงสู่ (R) ในสถานะเรสต์ ถ้าไม่ใช่ให้ทิ้ง
[CONT][(R)]: ในเทิร์นของคุณ ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP38';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" อยู่ในชื่อ ถ้าจ่าย [COST][เรสต์ยูนิตนี้] เปิดดูการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดยูนิต สามารถคอลลงสู่ (R) ได้ เมื่อจบเทิร์นนั้นให้ถอยยูนิตที่คอลมา', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP39';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT02/SP40';
UPDATE cards SET skill_text_th = 'โอเวอร์เดรส - ยูนิตที่อยู่ในสถานะโอเวอร์เดรส (สามารถเลือกให้ออกสู่ (R) แบบซ้อนทับยูนิตที่กำหนด แทนการคอลแบบปกติได้)
[CONT][(R)]: ยูนิตนี้ได้รับพาวเวอร์ดั้งเดิมของฐานโอเวอร์เดรสทั้งหมดของยูนิตนี้ (มีผลแม้ในเทิร์นของคู่ต่อสู้)
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ดเกรด 3 ขึ้นไป ถ้ายูนิตนี้อยู่ในสถานะโอเวอร์เดรส ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] พาวเวอร์ของยูนิตนี้ +15000 / คริติคอล +1 ตลอดการต่อสู้นั้น เมื่อจบการต่อสู้นั้นให้วางฐานโอเวอร์เดรสทั้งหมดของยูนิตนี้ลงดรอป (เมื่อไม่มีฐานโอเวอร์เดรสเหลือ จะไม่อยู่ในสถานะโอเวอร์เดรสอีกต่อไป)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/001';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่แห่งธุลีทราย ยูจีน" ถ้าจ่าย [COST][ส่งการ์ดจากมือลงโซล 1 ใบ] จั่วการ์ด 1 ใบ แล้วเลือกเรียร์การ์ดของคู่ต่อสู้เกรด 2 ขึ้นไป 1 ใบ แล้วถอย
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าจ่าย [COST][โซลบลาสต์ (1)] พาวเวอร์ของยูนิตนี้ +2000 ตลอดการต่อสู้นั้น ต่อ (R) ของคู่ต่อสู้ที่ไม่มียูนิตอยู่ 1 ช่อง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/002';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ถ้าโซลของคุณมี "มังกรปีศาจความโลภ กรีดอน" อยู่ จำนวนการ์ดที่ทำให้คุณแพ้ในดาเมจโซนจะกลายเป็น 7 ใบ
[AUTO][(V)]: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าจ่าย [COST][โซลบลาสต์ (2), ส่งเรียร์การ์ดที่อยู่ในสถานะสแตนด์ลงโซล 4 ใบ] สแตนด์ยูนิตนี้ ถ้าโซลของคุณมี 10 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +15000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/003';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณ "อิคคิคาเซย์" พาวเวอร์ของยูนิตนี้ +5000
[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ส่งเรียร์การ์ดลงโซล 1 ใบ] ต่อโซลของคุณทุก 4 ใบ เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย จากนั้นถ้าคุณ "อิคคิคาเซย์" เปิดดูการ์ดบนสุดของเด็คคุณเท่ากับจำนวน (R) ของคู่ต่อสู้ที่ไม่มียูนิตอยู่ เลือกการ์ดยูนิตจำนวนเท่าที่ต้องการ แล้วคอลลงสู่ (R) ส่วนที่เหลือวางลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/004';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (V) ค้นหาการ์ดอุกกาบาตจากเด็คของคุณสูงสุด 2 ใบ แล้ววางลงออร์เดอร์โซน จากนั้นสับเด็ค
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1), วางการ์ดอุกกาบาตจากออร์เดอร์โซนลงดรอปตั้งแต่ 1 ใบขึ้นไปตามจำนวนที่ต้องการ] พาวเวอร์ของยูนิตนี้ +15000 ตลอดการต่อสู้นั้น และถ้าการ์ดอุกกาบาตที่วางลงดรอปด้วยคอสต์นี้มี 3 ใบขึ้นไป คริติคอล +1 เพิ่มเติม ถ้ามี 5 ใบขึ้นไป เอฟเฟกต์ทริกเกอร์ของคุณจะทำงาน 2 ครั้งเพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/005';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าโลกของคุณคือราตรีมืด พาวเวอร์ของยูนิตนี้ +2000 ถ้าไม่ใช่ราตรีมืดแต่เป็นราตรีมืดสนิท พาวเวอร์ของยูนิตนี้ +5000 (มีผลแม้ในเทิร์นของคู่ต่อสู้)
[AUTO][(R)]: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าจ่าย [COST][ถอยโทเคนทหารเงาราตรี 3 ใบ] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/006';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (2), เรสต์เรียร์การ์ดอื่นตามจำนวนที่ต้องการ] ตลอดการต่อสู้นั้นยูนิตนี้จะทำไดรฟ์เช็ค และพาวเวอร์ +5000 เมื่อจบการต่อสู้นั้น ถ้ายูนิตที่เรสต์ด้วยคอสต์นี้มี 3 ใบหรือน้อยกว่า เลือกการ์ดจากมือคุณ 3 ใบ แล้วทิ้ง และถ้ายูนิตที่เรสต์ด้วยคอสต์นี้มี 1 ใบหรือน้อยกว่า เลือกเพิ่มอีก 2 ใบ แล้วทิ้ง (ไดรฟ์เช็คจะทำหลังจากคอลการ์เดียนแล้ว)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/007';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งปิ่นมณีหกเหลี่ยม" หรือ "นักเวทย์หญิงแห่งแสงประกายห้าเหลี่ยม" ถ้าจ่าย [COST][โซลบลาสต์ (1)] เปิดดูการ์ด 2 ใบบนสุดของเด็คคุณ แล้ววางกลับบนเด็คตามลำดับที่ต้องการ
[CONT][(R)/(G)]: ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งปิ่นมณีหกเหลี่ยม" พาวเวอร์ของยูนิตนี้ +2000 / ชิลด์ +5000 (มีผลแม้ในเทิร์นของคู่ต่อสู้)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/008';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนครั้งที่คุณแอทแทคในเทิร์นนี้
-3 ครั้งขึ้นไป - จั่วการ์ด 1 ใบ
-4 ครั้งขึ้นไป - เลือกเรียร์การ์ดของคู่ต่อสู้ 2 ใบ แล้วถอย
-5 ครั้งขึ้นไป - พาวเวอร์ของยูนิตนี้ +10000 ตลอดการต่อสู้นั้น และเมื่อคู่ต่อสู้จะคอลลงสู่ (G) จากมือ จะคอลไม่ได้นอกเสียจากจะคอลพร้อมกันตั้งแต่ 3 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/009';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) จากมือ ค้นหาการ์ดออร์เดอร์จากเด็คของคุณสูงสุด 1 ใบ แล้วเปิดเผย ถ้าไม่มีการ์ดชื่อเดียวกันอยู่ในดรอปของคุณ ให้ทิ้งการ์ดที่เปิดเผยนั้น จากนั้นสับเด็ค
[AUTO][(R)]: เมื่อคุณเล่นออร์เดอร์ ถ้าจ่าย [COST][โซลบลาสต์ (1)] พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น ถ้าผสานเวท สามารถเลือกเรียร์การ์ดอื่นของคุณ 1 ใบ แล้วนำกลับมือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/010';
UPDATE cards SET skill_text_th = '[CONT][(R)/(G)]: ถ้าดรอปของคู่ต่อสู้มี 4 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +2000 / ชิลด์ +5000 ถ้ามี 8 ใบขึ้นไป ชิลด์ +5000 เพิ่มเติม (มีผลแม้ในเทิร์นของคู่ต่อสู้)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/011';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) ถ้าจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เปิดดูการ์ด 7 ใบบนสุดของเด็คคุณ เลือกการ์ดที่มีความสามารถโอเวอร์เดรสสูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/012';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกสู่ (R) พาวเวอร์ของยูนิตนี้ +5000 ตลอดเทิร์นนั้น
[CONT][(R)]: เมื่อคุณไรด์จากไรด์เด็ค สามารถไรด์ด้วยการ "ส่งยูนิตนี้ลงโซล" แทน "เลือกการ์ดจากมือ 1 ใบ แล้วทิ้ง" ได้ด้วย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/013';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าโซลของคุณมี 7 ใบขึ้นไป ชิลด์ของยูนิตนี้ +5000
[AUTO]: เมื่อยูนิตนี้ถอยจาก (G) คุณสามารถวางการ์ดนี้ลงโซลได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/014';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), วางเรียร์การ์ดอื่นลงโซล 2 ใบ] เพื่อเลือกการ์ด 1 ใบจากโซลของคุณ คอลลงเรียร์การ์ด (R) จากนั้นเทิร์นนี้ พาวเวอร์ของยูนิตนั้นและยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/015';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด (R) ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์ โซลชาร์จ (1)
[AUTO]: เมื่อยูนิตนี้ถูกวางจาก (R) ลงโซลด้วยความสามารถของแวนการ์ดของคุณ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (2)] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ จากนั้นเทิร์นนี้ พาวเวอร์ +5000 / ไดรฟ์ +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/016';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (3)] เพื่อเลือกเรียร์การ์ดของฝ่ายตรงข้ามสูงสุด 3 ใบ กักขังไว้ในคุกของคุณ จากนั้นถ้าการ์ดฝ่ายตรงข้ามที่ถูกกักขังในคุกของคุณมี 3 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +10000 ในแบตเทิลนั้น และถ้ามี 5 ใบขึ้นไป คริติคอล +1 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/017';
UPDATE cards SET skill_text_th = '[CONT](R)/(G): ถ้าการ์ดเซ็ตออเดอร์ในดรอปและออเดอร์โซนของคุณรวมกันมี 5 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 / ชิลด์ +5000 (มีผลแม้ในเทิร์นของฝ่ายตรงข้าม)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/018';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถเลือกการ์ดยูนิตของฝ่ายตรงข้ามที่ถูกกักขังในคุกของคุณ 1 ใบ แล้วคอลลงเรียร์การ์ด (R) ของฝ่ายตรงข้ามที่ไม่มียูนิตอยู่ได้ ถ้าคอลแล้ว เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ กักขังไว้ในคุกของคุณ (คุณเป็นผู้เลือกเซอร์เคิลที่จะคอล)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/019';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อเปิดดูการ์ดบนสุดของเด็คคุณ 1 ใบ ถ้าเป็นการ์ดยูนิต คุณสามารถคอลลง (R) ในคอลัมน์เดียวกับยูนิตนี้ได้ (ถ้าไม่คอล ให้นำกลับไปไว้ที่เดิม)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/020';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้ามือของคุณมี 4 ใบหรือน้อยกว่า คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเปิดดูการ์ดบนสุดของเด็คคุณ 5 ใบ เลือกการ์ดยูนิตเกรด 3 สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/021';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อค้นหาการ์ด "ร็กกะคุโฮจุ โนะ อนนะมาจุสึชิ" จากเด็คของคุณสูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/022';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อจบแบตเทิลที่ยูนิตนี้แอทแทคเรียร์การ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง ฟลัคเบิร์ก ดราก้อน" คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อทำให้ยูนิตนี้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/023';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตอื่นของคุณในคอลัมน์เดียวกับยูนิตนี้แอทแทค คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อให้พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น เลือกเรียร์การ์ดของฝ่ายตรงข้ามทั้งหมด ในแบตเทิลที่ยูนิตนี้แอทแทคในเทิร์นนี้ ฝ่ายตรงข้ามไม่สามารถคอลยูนิตเกรดเดียวกับยูนิตที่ถูกเลือกจากมือลง (G) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/024';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) หรือถูกวางที่ (G) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาต้นไม้ มักโนเลีย" เทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000 / ชิลด์ +5000
[AUTO] เรียร์การ์ดแถวหลัง (R): เมื่อจบแบตเทิลที่ยูนิตนี้แอทแทค คุณสามารถนำยูนิตนี้กลับมือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/025';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ ถ้าแวนการ์ดของคุณคือ "มังกรเทพวงล้อสวรรค์ เนียร์วานา" คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/026';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของยูนิตนี้โดน คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกการ์ดที่มีความสามารถโอเวอร์เดรสจากดรอปของคุณ 1 ใบ นำเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/027';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของแวนการ์ดคุณโดน คุณสามารถจ่าย [COST][ให้ยูนิตนี้ถอย] เพื่อจั่ว 1 ใบ และเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/028';
UPDATE cards SET skill_text_th = '[ACT][โซล]: ถ้าเรียร์การ์ดของฝ่ายตรงข้ามถอยไปแล้วในเทิร์นนี้ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อคอลการ์ดนี้ลง (R)
[AUTO](R): เมื่อแวนการ์ดของคุณเกรด 3 ขึ้นไปแอทแทค คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/029';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบแบตเทิลที่ยูนิตนี้บูสต์ คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/030';
UPDATE cards SET skill_text_th = 'เลือกแวนการ์ดของคุณ 1 ใบ แล้วมอบความสามารถต่อไปนี้ให้ในเทิร์นนั้น "[AUTO](V): เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอยในเมนเฟสของคุณ คุณจั่ว 1 ใบ"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/031';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: จ่าย [COST][โซลบลาสต์ (2)] เพื่อให้พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +5000 ในเทิร์นนั้น และถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" เลือกแวนการ์ดของคุณ 1 ใบ คริติคอล +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/032';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณคือ "ผู้ครองแรงโน้มถ่วง บาร์โรว์แมกเนส" คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกนอร์มอลยูนิตจากโซลของคุณตามจำนวนที่ต้องการ แล้วเทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000 ต่อ 1 ใบที่เลือก จากนั้นนำการ์ดที่เลือกทั้งหมดกลับเข้าเด็คแล้วสับเด็ค (การ์ดจากไรด์เด็คให้นำกลับไรด์เด็คแบบหน้าเปิด)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/033';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "มังกรมารตะกละ กรีดอน" คุณสามารถจ่าย [COST][วางการ์ดจากมือลงโซล 1 ใบ] เพื่อค้นหาการ์ดชื่อเดียวกับการ์ดนี้จากเด็คของคุณสูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค
[CONT][โซล]: ในเทิร์นของคุณ ถ้าดาเมจโซนของคุณมี 4 ใบขึ้นไป พาวเวอร์ของ "มังกรมารตะกละ กรีดอน" ที่ (V) ของคุณ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/034';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) จากมือ ถ้าแวนการ์ดของคุณคือ "มังกรมารตะกละ กรีดอน" คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (2)] เพื่อเลือกการ์ด 1 ใบจากโซลของคุณ คอลลง (R)
[AUTO](R): เมื่อแวนการ์ดของคุณแอทแทค ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์ เลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/035';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบแบตเทิลที่ยูนิตนี้บูสต์ คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/036';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
โซลชาร์จ (4) จากนั้นถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" ให้ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนโซลของคุณ
-6 ใบขึ้นไป - จั่ว 1 ใบ
-8 ใบขึ้นไป - เทิร์นนี้พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000
-12 ใบขึ้นไป - เลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้คริติคอล +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/037';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) หรือ (R) ถ้ามีการ์ดอุกกาบาตอยู่ในออเดอร์โซนของคุณ คุณสามารถจ่าย [COST][โซลบลาสต์ (3)] เพื่อจั่ว 1 ใบ และเทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000
[CONT](R): ถ้าการ์ดเซ็ตออเดอร์ในดรอปและออเดอร์โซนของคุณรวมกันมี 5 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 (มีผลแม้ในเทิร์นของฝ่ายตรงข้าม)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/038';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อการ์ดของฝ่ายตรงข้ามลงสนามที่ (R) จากออเดอร์โซนของคุณ โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/039';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) เปิดดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกการ์ดเวิลด์สูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ ส่วนที่เหลือนำไปไว้ใต้เด็คตามลำดับที่ต้องการ
[ACT](R): ถ้าแวนการ์ดของคุณคือ "เทพแห่งเครื่องจักรหีบศพ ออร์ฟิสต์" คุณสามารถจ่าย [COST][โซลบลาสต์ (1), ให้ยูนิตนี้ถอย] เพื่อคอลโทเคนนักรบเงาราตรี 1 ใบลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/040';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคหรือบูสต์ ถ้าการ์ดอุกกาบาตในออเดอร์โซนของคุณมี 3 ใบขึ้นไป คุณสามารถจ่าย [COST][โซลบลาสต์ (2)] เพื่อเคาน์เตอร์ชาร์จ (1) และเทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/041';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบแบตเทิลที่ยูนิตนี้บูสต์ คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/042';
UPDATE cards SET skill_text_th = '(หลังเล่นเซ็ตออเดอร์แล้ว ให้นำไปไว้ที่ออเดอร์โซน)
[COST][โซลบลาสต์ (2)] เพื่อเล่นการ์ดนี้ได้!
[CONT][ออเดอร์โซน]: ถ้าในออเดอร์โซนของคุณไม่มีการ์ดอื่นนอกจากการ์ดเวิลด์ ให้ใช้ผลต่อไปนี้ตามจำนวนการ์ดในออเดอร์โซนของคุณ
-1 ใบ - เวิลด์ของคุณกลายเป็นราตรีมืด
-2 ใบขึ้นไป - เวิลด์ของคุณกลายเป็นราตรีมืดสนิท
[AUTO][ออเดอร์โซน]: เมื่อโทเคนนักรบเงาราตรีของคุณลงสนาม เทิร์นนี้พาวเวอร์ของยูนิตที่ลงสนามนั้น +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/043';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถอยจาก (R) ด้วยคอสต์ของการ์ดของคุณ เปิดดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกการ์ดที่มีคำว่า "บลาสเตอร์" สูงสุด 1 ใบ เปิดเผยแล้วนำเข้ามือ ส่วนที่เหลือนำไปไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/044';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อออกการ์ดทริกเกอร์ยูนิตจากไดรฟ์เช็คของคุณ คุณสามารถจ่าย [COST][วางการ์ดจากมือลงโซล 1 ใบ] เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/045';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][วางการ์ดยูนิตจากดรอปลงโซล 1 ใบ] เพื่อเปิดดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกการ์ดชื่อเดียวกับการ์ดที่ถูกวางลงโซลด้วยคอสต์นี้สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/046';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบแบตเทิลที่ยูนิตนี้บูสต์ คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/047';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1), เปิดเผยคริติคอลทริกเกอร์หรือฟรอนต์ทริกเกอร์จากมือ 1 ใบ] เพื่อเล่นการ์ดนี้ได้!
ถ้าแวนการ์ดของฝ่ายตรงข้ามเกรด 3 ขึ้นไป คุณจั่ว 1 ใบ แล้ววางการ์ดที่เปิดเผยด้วยคอสต์นี้ไว้บนสุดของเด็คตัวเอง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/048';
UPDATE cards SET skill_text_th = '(หลังเล่นเซ็ตออเดอร์แล้ว ให้นำไปไว้ที่ออเดอร์โซน)
[COST][ทิ้งการ์ดจากมือ 1 ใบ] เพื่อเล่นการ์ดนี้ได้!
[CONT][ออเดอร์โซน]: มอบความสามารถ "บูสต์" ให้กับเรียร์การ์ดเกรด 3 ทั้งหมดของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/049';
UPDATE cards SET skill_text_th = '[AUTO]: คอสต์นี้สามารถจ่ายด้วย "เปิดเผย "มังกรเรือธง ฟลัคเบิร์ก ดราก้อน" หรือ "อินโรด ชูตเตอร์" จากมือ 1 ใบ" ได้เช่นกัน เมื่อยูนิตนี้ถูกไรด์ คุณสามารถจ่าย [COST][โซลบลาสต์ (1) การ์ดอื่นที่ไม่ใช่การ์ดนี้] เพื่อคอลการ์ดนี้ลง (R)
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดอื่นของคุณแอทแทคแวนการ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง ฟลัคเบิร์ก ดราก้อน" คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อทำให้ยูนิตนี้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/050';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าโซลของคุณมี 0 ใบ โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/051';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง ฟลัคเบิร์ก ดราก้อน" เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ แล้วมอบความสามารถต่อไปนี้ให้ในเทิร์นนั้น "[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าเป็นแบตเทิลแรกของเทิร์นนี้ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เพื่อทำให้ยูนิตนี้สแตนด์"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/052';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าเทิร์นนี้คุณเล่นออเดอร์ไปแล้ว คุณสามารถจ่าย [COST][ทิ้งการ์ดออเดอร์จากมือ 1 ใบ] เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/053';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบแบตเทิลที่ยูนิตนี้บูสต์ คุณสามารถจ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกยูนิตของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/054';
UPDATE cards SET skill_text_th = 'คอสต์นี้จะลดลง [เคาน์เตอร์บลาสต์ (1)] ต่อการ์ดในไบนด์โซนของคุณ 1 ใบ (ถ้าใช้เวทประสาน ให้ลดจากคอสต์รวม)
[COST][เคาน์เตอร์บลาสต์ (4)] เพื่อเล่นการ์ดนี้ได้!
จั่ว 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/055';
UPDATE cards SET skill_text_th = '[CONT]: ยูนิตนี้จะกลายเป็นเพอร์โซนาไรด์ แม้ถูกนอร์มอลไรด์จากมือด้วยยูนิตที่มีชื่อต่างกัน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/056';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) หรือ (R) คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (2)] เพื่อเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ แล้วให้เรียร์การ์ดของฝ่ายตรงข้ามทั้งหมดในคอลัมน์เดียวกับยูนิตนั้นถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/057';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้ถูกบูสต์ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกเรียร์การ์ดของฝ่ายตรงข้ามเกรด 2 ขึ้นไป 1 ใบ ให้ถอย และพาวเวอร์ของยูนิตนี้ +2000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/058';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของยูนิตนี้โดน คุณสามารถจ่าย [COST][ให้ยูนิตนี้ถอย] เพื่อจั่ว 1 ใบ และเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/059';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเรียร์การ์ดเกรด 0 ของคุณแอทแทค คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ให้ยูนิตนี้ถอย] เพื่อให้พาวเวอร์ของยูนิตที่แอทแทคนั้น +10000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/060';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเรียร์การ์ดของคุณลงสนาม ถ้าโอเวอร์เดรส เทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/061';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าแอทแทคของแวนการ์ดคุณโดนแล้วในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/062';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเรียร์การ์ดของคุณลงสนาม ถ้าโอเวอร์เดรส คุณสามารถจั่ว 1 ใบได้ ถ้าจั่วแล้ว เลือกการ์ดจากมือของคุณ 1 ใบ แล้วทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/063';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคไม่ได้ถูกบูสต์ ชิลด์ของยูนิตนี้ +10000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/064';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าเรียร์การ์ดของฝ่ายตรงข้ามมี 2 ใบหรือน้อยกว่า พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/065';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ามีเรียร์การ์ดเกรด 0 ของคุณอยู่ ชิลด์ของยูนิตนี้ +5000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/066';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
เลือกแวนการ์ดของคุณ 1 ใบ แล้วมอบความสามารถต่อไปนี้ให้ในเทิร์นนั้น "[AUTO](V): เมื่อเรียร์การ์ดของคุณลงสนาม ถ้าโอเวอร์เดรส จั่ว 1 ใบ และเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/067';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่พายุทราย ยูจีน" เลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในแบตเทิลนั้น และเมื่อจบแบตเทิลนั้น เลือกเรียร์การ์ดที่บูสต์ในแบตเทิลนั้น 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/068';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป เทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000
[ACT](R): ถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เพื่อให้ยูนิตนี้แบตเทิลกับยูนิตแถวหน้าทั้งหมดของฝ่ายตรงข้ามเมื่อแอทแทคในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/069';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค เทิร์นนี้พาวเวอร์ของยูนิตนี้ +2000 ต่อเรียร์การ์ดของคุณที่สแตนด์อยู่ 1 ใบ ถ้าดาเมจโซนของคุณมี 5 ใบขึ้นไป ให้เป็น +5000 แทน +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/070';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด เทิร์นนี้พาวเวอร์ของยูนิตนี้ +2000 และถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพิ่มเติม เพื่อเลือกแวนการ์ดของคุณ 1 ใบ พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/071';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางจาก (R) ลงโซลด้วยความสามารถของแวนการ์ดของคุณ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/072';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อคุณโซลชาร์จด้วยความสามารถของการ์ดตัวเอง ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/073';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าโซลของคุณมี 7 ใบขึ้นไป เรียร์การ์ดของฝ่ายตรงข้ามทั้งหมดในคอลัมน์เดียวกับยูนิตนี้จะสูญเสียความสามารถ "อินเตอร์เซ็ปต์" และ "บูสต์" และไม่สามารถได้รับกลับมาได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/074';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST][วางยูนิตนี้ลงโซล] เพื่อเลือกเรียร์การ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +2000 จากนั้นถ้าโซลของคุณมี 7 ใบขึ้นไป ในแบตเทิลที่เรียร์การ์ดนั้นแอทแทคในเทิร์นนี้ ฝ่ายตรงข้ามไม่สามารถคอลยูนิตเกรด 1 ขึ้นไปจากมือลง (G) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/075';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์ยูนิตเกรด 3 ฝ่ายตรงข้ามไม่สามารถอินเตอร์เซ็ปต์ได้ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/076';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเริ่มเมนเฟสของคุณ ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป โซลชาร์จ (1) และถ้าคุณอยู่ในสถานะ "อิคคิคาเซอิ" เทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/077';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "เดไซร์เดวิล โบช็อค" คุณสามารถจ่าย [COST][เปิดเผย "มังกรมารตะกละ กรีดอน" จากไรด์เด็ค 1 ใบ] เพื่อจั่ว 1 ใบ
[AUTO]: เมื่อยูนิตนี้ถูกวางจาก (R) ลงโซลด้วยความสามารถของแวนการ์ดของคุณ ถ้าแวนการ์ดของฝ่ายตรงข้ามเกรด 3 ขึ้นไป คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อทำให้เทิร์นนี้ ฝ่ายตรงข้ามไม่สามารถคอลลง (G) จากมือได้ เว้นแต่จะคอลพร้อมกัน 2 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/078';
UPDATE cards SET skill_text_th = '[ACT][โซล]: ถ้าแวนการ์ดของคุณคือ "มังกรมารตะกละ กรีดอน" คุณสามารถจ่าย [COST][วางการ์ดนี้ลงดรอป] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/079';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นหลัง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/080';
UPDATE cards SET skill_text_th = 'ถ้าโซลของคุณมี 4 ใบขึ้นไป โซลชาร์จ (1) แล้วเลือกแวนการ์ดของฝ่ายตรงข้ามที่กำลังแอทแทค 1 ใบ พาวเวอร์ -5000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/081';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้ถูกบูสต์โดยโทเคนนักรบเงาราตรี คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/082';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแอทแทคของยูนิตนี้โดน ค้นหาการ์ดอุกกาบาตจากเด็คของคุณสูงสุด 1 ใบ วางลงออเดอร์โซน แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/083';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ฝ่ายตรงข้ามเลือกการ์ดจากมือตัวเอง 1 ใบ กักขังไว้ในคุกของคุณ ถ้ากักขังแล้ว ฝ่ายตรงข้ามจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/084';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าเวิลด์ของคุณเป็นราตรีมืดสนิท ยูนิตนี้สามารถแอทแทคยูนิตแถวหลังของฝ่ายตรงข้ามได้ด้วย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/085';
UPDATE cards SET skill_text_th = '[CONT](R): ในแบตเทิลที่ยูนิตนี้แอทแทค ถ้าการ์ดอุกกาบาตในออเดอร์โซนของคุณมี 3 ใบขึ้นไป ฝ่ายตรงข้ามไม่สามารถคอลลง (G) จากมือได้ เว้นแต่จะคอลพร้อมกัน 2 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/086';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) คุณสามารถจ่าย [COST][โซลบลาสต์ (1), ทิ้งการ์ดเซ็ตออเดอร์จากมือ 1 ใบ] เพื่อให้ชิลด์ของยูนิตนี้ +15000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/087';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแวนการ์ดของคุณถูกแอทแทค คุณสามารถจ่าย [COST][ให้ยูนิตนี้ถอย] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ ถ้าเวิลด์ของคุณเป็นราตรีมืด พาวเวอร์ +5000 ในแบตเทิลนั้น ถ้าเป็นราตรีมืดสนิทไม่ใช่ราตรีมืด พาวเวอร์ +10000 ในแบตเทิลนั้นแทน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/088';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ กักขังไว้ในคุกของคุณ แล้วโซลชาร์จ (1) ต่อเกรด 1 ของการ์ดที่ถูกกักขังนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/089';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) เปิดดูการ์ดบนสุดของเด็คคุณ 7 ใบ เลือกการ์ดอุกกาบาตตามจำนวนที่ต้องการ เปิดเผยแล้วนำเข้ามือ จากนั้นสับเด็ค
[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "กราวิเดีย เนลทริงเกอร์" คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อเลือกการ์ดอุกกาบาตจากมือสูงสุด 2 ใบ วางลงออเดอร์โซน และเทิร์นนี้พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/090';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ามีการ์ดเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อให้ชิลด์ของยูนิตนี้ +10000 ในแบตเทิลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/091';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นหลัง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/092';
UPDATE cards SET skill_text_th = '(หลังเล่นเซ็ตออเดอร์แล้ว ให้นำไปไว้ที่ออเดอร์โซน)
[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออเดอร์โซน จั่ว 1 ใบ
[CONT][ออเดอร์โซน]: มอบความสามารถ "บูสต์" ให้กับเรียร์การ์ดเกรด 2 ทั้งหมดของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/093';
UPDATE cards SET skill_text_th = '(หลังเล่นเซ็ตออเดอร์แล้ว ให้นำไปไว้ที่ออเดอร์โซน)
[CONT]: "นีทเนส เมทิโอร์ชาวเวอร์" สามารถใส่ในเด็คได้สูงสุด 16 ใบ
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออเดอร์โซน คุณสามารถโซลชาร์จ (1) ได้ ถ้าถูกวางด้วยความสามารถของแวนการ์ดของคุณ คุณสามารถจั่วเพิ่มอีก 1 ใบได้
[AUTO]: เมื่อการ์ดนี้ถูกวางจากออเดอร์โซนลงดรอป เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/094';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตของคุณสแตนด์ด้วยความสามารถของการ์ด คุณสามารถจ่าย [COST][ให้ยูนิตนี้เรสต์] เพื่อเลือกเรียร์การ์ดอื่นของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/095';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อออกการ์ดทริกเกอร์ยูนิตจากไดรฟ์เช็คของคุณ ถ้าแวนการ์ดของคุณคือ "ร็กกะคุโฮจุ โนะ อนนะมาจุสึชิ" คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพื่อให้เทิร์นนี้พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/096';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) ถ้าเกรดแวนการ์ดของคุณกับฝ่ายตรงข้ามเท่ากัน คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเลือกเรียร์การ์ดอื่นของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ของยูนิตนั้นและยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/097';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์ คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (2), ให้ยูนิตนี้ถอย] เพื่อเลือกยูนิตเกรด 3 ของคุณ 1 ใบ เทิร์นนี้ไดรฟ์ +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/098';
UPDATE cards SET skill_text_th = '[ACT](R): จ่าย [COST][วางยูนิตนี้ลงโซล, ให้เรียร์การ์ดอื่น 1 ใบเรสต์] เพื่อเปิดดูการ์ดบนสุดของเด็คคุณ 3 ใบ เลือกการ์ดเกรด 3 ตามจำนวนที่ต้องการ เปิดเผยแล้วนำเข้ามือ ส่วนที่เหลือทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/099';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) เลือกคริติคอลทริกเกอร์หรือฟรอนต์ทริกเกอร์จากมือของคุณสูงสุด 1 ใบ เปิดเผยแล้ววางไว้ใต้เด็ค ถ้าวางแล้ว คุณสามารถจ่าย [COST][โซลบลาสต์ (1)] เพิ่มเติม เพื่อจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/100';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][วางการ์ดจากมือลงโซล 1 ใบ] เพื่อเลือกแวนการ์ดของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ของยูนิตนั้นและยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/101';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ลงสนามที่ (R) หรือถูกทิ้งจากมือในเทิร์นของคุณ เลือกเรียร์การ์ดแถวหลังของคุณ 1 ใบ ทำให้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/102';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][โซลบลาสต์ (1), เปิดเผยการ์ดเกรด 3 จากมือ 3 ใบ] เพื่อเลือกการ์ดเกรด 3 จากดรอปของคุณ 1 ใบ วางไว้บนสุดของเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/103';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][ทิ้ง "ร็กกะคุโฮจุ โนะ อนนะมาจุสึชิ" จากมือ 1 ใบ] เพื่อเลือก "ร็กกะคุโฮจุ โนะ อนนะมาจุสึชิ" ที่ (V) หรือ (R) ของคุณ 1 ใบ เทิร์นนี้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/104';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (R) คุณสามารถจ่าย [COST][ทิ้งการ์เดียนจากมือ 1 ใบ] เพื่อเคาน์เตอร์ชาร์จ (1) หรือโซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/105';
UPDATE cards SET skill_text_th = '[CONT](G): ชิลด์ของยูนิตเกรด 3 ทั้งหมดของคุณ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/106';
UPDATE cards SET skill_text_th = 'เลือก "ร็กกะคุโฮจุ โนะ อนนะมาจุสึชิ" ที่ (V) หรือ (R) ของคุณ 1 ใบ พาวเวอร์ +10000 ในแบตเทิลนั้น คุณสามารถจ่าย [COST][เคาน์เตอร์บลาสต์ (2)] เพื่อให้เป็น +40000 แทน +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/107';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่ (V) คุณสามารถเลือกนอร์มอลออเดอร์จากดรอปของคุณ 1 ใบ แล้วเล่นโดยไม่ต้องจ่ายคอสต์ได้ (การเล่นนี้นับรวมในจำนวนครั้งที่เล่นด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/108';
UPDATE cards SET skill_text_th = '[CONT](R): พาวเวอร์ของยูนิตนี้ +5000 ต่อการ์ดออเดอร์ในไบนด์โซนของคุณ 1 ใบ (มีผลแม้ในเทิร์นของฝ่ายตรงข้าม)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/109';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าเรียร์การ์ดของคุณยังไม่สแตนด์ด้วยเอฟเฟกต์ในเทิร์นนี้ ยูนิตนี้จะแอทแทคไม่ได้
[CONT](R): ในแบตเทิลที่ยูนิตนี้แอทแทคแวนการ์ด พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/110';
UPDATE cards SET skill_text_th = '[CONT] เรียร์การ์ดแถวหลัง (R): พาวเวอร์ของเรียร์การ์ดแถวหลังทั้งหมดของคุณ +2000 (รวมยูนิตนี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/111';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): ยูนิตนี้ไม่สามารถแอทแทคจากแถวหน้าได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/112';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "แอสเซนแดนซ์ อัสซอลต์" คอลการ์ดนี้ลง (R)
[CONT](R): ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง ฟลัคเบิร์ก ดราก้อน" หรือ "แอสเซนแดนซ์ อัสซอลต์" ยูนิตนี้จะได้รับความสามารถ "อินเตอร์เซ็ปต์" และพาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/113';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อเรียร์การ์ดอื่นของคุณแอทแทคจากแถวหลัง [COST][เรสต์ยูนิตนี้] ระหว่างการต่อสู้นั้น ยูนิตที่แอทแทคได้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/114';
UPDATE cards SET skill_text_th = '[ACT][(R)]: [COST][เคาน์เตอร์บลาสต์ (1) และไบนด์ยูนิตนี้] เลือกออเดอร์การ์ด 1 ใบจากดรอปของคุณ เพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/115';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตอื่นของคุณแอทแทค ถ้าเป็นการต่อสู้ครั้งที่ 5 ในเทิร์นนี้ [COST][วางยูนิตนี้ลงโซล] เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/116';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดอื่นของคุณออกมา ตลอดเทิร์นนั้น ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/117';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/118';
UPDATE cards SET skill_text_th = 'เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้น มอบความสามารถ "[AUTO][(V)/(R)]: เมื่อยูนิตอื่นของคุณแอทแทค ตลอดเทิร์นนั้น ยูนิตนี้ได้พาวเวอร์ +5000" ให้กับยูนิตนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/119';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1) และนำออเดอร์การ์ด 4 ใบจากไบนด์โซนไปวางที่ดรอป] เพื่อเล่นการ์ดนี้ได้!
เลือกยูนิตของคุณที่ถูกเรียร์การ์ดแอทแทค 1 ใบ ระหว่างการต่อสู้นั้นได้พาวเวอร์ +20000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/120';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นยูนิตนั้นแอทแทคจากแถวหลังได้ด้วยและได้พาวเวอร์ +5000 ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์อยู่ ให้เลือก 3 ใบแทน 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/DSR01';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ระหว่างเทิร์นของคุณ ถ้ามีการ์ดของคู่ต่อสู้ถูกคุมขังอยู่ในคุกของคุณตั้งแต่ 1 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +10000 และถ้ามีตั้งแต่ 3 ใบขึ้นไป ยูนิตนี้ได้ไดรฟ์ +1 เพิ่มด้วย
[ACT][(V)/(R)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของคู่ต่อสู้ 2 ใบ นำไปคุมขังในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/DSR02';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ ถ้าแวนการ์ดของคุณคือ "เทนรินเซริว นิรวานะ" [COST][โซลบลาสต์ (1)] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H01';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดที่มีความสามารถ [โอเวอร์เดรส] จากดรอปของคุณ 1 ใบ เพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H02';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของแวนการ์ดคุณฮิต [COST][ถอยยูนิตนี้] จั่วการ์ด 1 ใบ และเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H03';
UPDATE cards SET skill_text_th = '[ACT][โซล]: ถ้าเรียร์การ์ดของคู่ต่อสู้ถอยไปแล้วในเทิร์นนี้ [COST][เคาน์เตอร์บลาสต์ (1)] คอลการ์ดนี้ลง (R)
[AUTO][(R)]: เมื่อแวนการ์ดเกรด 3 ขึ้นไปของคุณแอทแทค [COST][วางยูนิตนี้ลงโซล] เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H04';
UPDATE cards SET skill_text_th = 'เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้น มอบความสามารถ "[AUTO][(V)]: เมื่อเรียร์การ์ดของคู่ต่อสู้ถอยในเมนเฟสของคุณ จั่วการ์ด 1 ใบ" ให้กับยูนิตนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H05';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) หรือ (R) [COST][เคาน์เตอร์บลาสต์ (2)] เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ให้เรียร์การ์ดของคู่ต่อสู้ทั้งหมดในคอลัมน์เดียวกับยูนิตนั้นถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H06';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต [COST][ถอยยูนิตนี้] จั่วการ์ด 1 ใบ เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H07';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อเรียร์การ์ดของคุณออกมา ถ้าทำโอเวอร์เดรส จั่วการ์ด 1 ใบได้ ถ้าจั่ว เลือกการ์ดจากมือคุณ 1 ใบ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H08';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้น มอบความสามารถ "[AUTO][(V)]: เมื่อเรียร์การ์ดของคุณออกมา ถ้าทำโอเวอร์เดรส จั่วการ์ด 1 ใบ ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000" ให้กับยูนิตนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H09';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่พายุทราย ยูจิน" เลือกแวนการ์ดของคุณ 1 ใบ ระหว่างการต่อสู้นั้นได้พาวเวอร์ +10000 ตอนจบการต่อสู้นั้น เลือกเรียร์การ์ดที่บูสต์ในการต่อสู้นั้น 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H10';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST][โซลบลาสต์ (2)] ตลอดเทิร์นนั้น ยูนิตแถวหน้าทั้งหมดของคุณได้พาวเวอร์ +5000 ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" เลือกแวนการ์ดของคุณ 1 ใบ ได้คริติคอล +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H11';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณคือ "ผู้ปกครองแรงโน้มถ่วง บาโรว์แม็กเนส" [COST][เคาน์เตอร์บลาสต์ (1)] เลือกนอร์มอลยูนิตจากโซลของคุณจำนวนเท่าที่ต้องการ ทุก 1 ใบที่เลือก ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000 จากนั้นนำการ์ดที่เลือกทั้งหมดกลับเข้าเด็คแล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H12';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "มังกรปีศาจตะกละ กรีดอน" [COST][วางการ์ด 1 ใบจากมือลงโซล] ค้นหาการ์ดที่ชื่อเดียวกับการ์ดนี้จากเด็คของคุณ 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[CONT][โซล]: ระหว่างเทิร์นของคุณ ถ้าดาเมจโซนของคุณมีตั้งแต่ 4 ใบขึ้นไป "มังกรปีศาจตะกละ กรีดอน" ที่เป็น (V) ของคุณได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H13';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
โซลชาร์จ (4) จากนั้นถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" ให้ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนใบในโซลของคุณ
- ตั้งแต่ 6 ใบขึ้นไป จั่วการ์ด 1 ใบ
- ตั้งแต่ 8 ใบขึ้นไป ตลอดเทิร์นนั้น ยูนิตแถวหน้าทั้งหมดของคุณได้พาวเวอร์ +10000
- ตั้งแต่ 12 ใบขึ้นไป เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้คริติคอล +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H14';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000
[ACT][(R)]: ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" [COST][เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (1)] ตลอดเทิร์นนั้น เมื่อยูนิตนี้แอทแทค จะต่อสู้กับยูนิตแถวหน้าทั้งหมดของคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H15';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางลงโซลจาก (R) ด้วยความสามารถของแวนการ์ดของคุณ [COST][เคาน์เตอร์บลาสต์ (1)] เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H16';
UPDATE cards SET skill_text_th = '[ACT][(R)]: [COST][วางยูนิตนี้ลงโซล] เลือกเรียร์การ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000 จากนั้นถ้าโซลของคุณมีตั้งแต่ 7 ใบขึ้นไป ในการต่อสู้ที่เรียร์การ์ดใบนั้นแอทแทคในเทิร์นนี้ คู่ต่อสู้จะคอลเกรด 1 ขึ้นไปจากมือลง (G) ไม่ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H17';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "ดีไซร์เดวิล โบช็อค" [COST][เปิดเผยการ์ด "มังกรปีศาจตะกละ กรีดอน" 1 ใบจากไรด์เด็ค] จั่วการ์ด 1 ใบ
[AUTO]: เมื่อยูนิตนี้ถูกวางลงโซลจาก (R) ด้วยความสามารถของแวนการ์ดของคุณ ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] ตลอดเทิร์นนั้น คู่ต่อสู้จะคอลการ์ดจากมือลง (G) ได้เฉพาะเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H18';
UPDATE cards SET skill_text_th = '[ACT][โซล]: ถ้าแวนการ์ดของคุณคือ "มังกรปีศาจตะกละ กรีดอน" [COST][วางการ์ดนี้ลงดรอป] เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H19';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H20';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) หรือ (R) ถ้ามีการ์ดอุกกาบาตอยู่ในออเดอร์โซนของคุณ [COST][โซลบลาสต์ (3)] จั่วการ์ด 1 ใบ ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000
[CONT][(R)]: ถ้าเซ็ตออเดอร์ในดรอปและออเดอร์โซนของคุณรวมกันตั้งแต่ 5 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H21';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อการ์ดของคู่ต่อสู้ออกมาที่ (R) จากออเดอร์โซนของคุณ โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H22';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) เปิดดูเด็คของคุณ 3 ใบจากบนสุด เลือกการ์ดโลกได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ ส่วนที่เหลือนำไปวางไว้ใต้เด็คตามลำดับที่ต้องการ
[ACT][(R)]: ถ้าแวนการ์ดของคุณคือ "เทพแห่งเครื่องศพ ออร์ฟิสต์" [COST][โซลบลาสต์ (1) และถอยยูนิตนี้] คอลโทเคนนักรบเงาราตรี 1 ใบลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H23';
UPDATE cards SET skill_text_th = '[COST][โซลบลาสต์ (2)] เพื่อเล่นการ์ดนี้ได้!
[CONT][ออเดอร์โซน]: ถ้าไม่มีการ์ดอื่นที่ไม่ใช่การ์ดโลกอยู่ในออเดอร์โซนของคุณ ความสามารถต่อไปนี้จะมีผลตามจำนวนใบในออเดอร์โซนของคุณ
- 1 ใบ โลกของคุณกลายเป็นราตรีมืด
- ตั้งแต่ 2 ใบขึ้นไป โลกของคุณกลายเป็นราตรีมืดสนิท
[AUTO][ออเดอร์โซน]: เมื่อโทเคนนักรบเงาราตรีของคุณออกมา ตลอดเทิร์นนั้น ยูนิตที่ออกมานั้นได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H24';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อการแอทแทคของยูนิตนี้ฮิต ค้นหาการ์ดอุกกาบาตจากเด็คของคุณได้สูงสุด 1 ใบ วางลงออเดอร์โซน จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H25';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) คู่ต่อสู้เลือกการ์ด 1 ใบจากมือของตัวเอง นำไปคุมขังในคุกของคุณ ถ้าคุมขังแล้ว คู่ต่อสู้จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H26';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ระหว่างการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าออเดอร์โซนของคุณมีการ์ดอุกกาบาตตั้งแต่ 3 ใบขึ้นไป คู่ต่อสู้จะคอลการ์ดจากมือลง (G) ได้เฉพาะเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H27';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) เปิดดูเด็คของคุณ 7 ใบจากบนสุด เลือกการ์ดอุกกาบาตจำนวนเท่าที่ต้องการ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "กราวิเดีย เนลทริงเกอร์" [COST][โซลบลาสต์ (1)] เลือกการ์ดอุกกาบาตจากมือได้สูงสุด 2 ใบ วางลงออเดอร์โซน ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H28';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H29';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] เพื่อเล่นการ์ดนี้ได้!
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออเดอร์โซน จั่วการ์ด 1 ใบ
[CONT][ออเดอร์โซน]: มอบความสามารถ "บูสต์" ให้เรียร์การ์ดเกรด 2 ทั้งหมดของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H30';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถอยจาก (R) ด้วยคอสต์ของการ์ดคุณ เปิดดูเด็คของคุณ 3 ใบจากบนสุด เลือกการ์ดที่มีคำว่า "บลาสเตอร์" อยู่ในชื่อได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ ส่วนที่เหลือนำไปวางไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H31';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อมีทริกเกอร์ยูนิตออกมาจากไดรฟ์เช็คของคุณ [COST][วางการ์ด 1 ใบจากมือลงโซล] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H32';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST][วางการ์ดยูนิต 1 ใบจากดรอปลงโซล] เปิดดูเด็คของคุณ 3 ใบจากบนสุด เลือกการ์ดที่ชื่อเดียวกับการ์ดที่ถูกวางลงโซลด้วยคอสต์นี้ได้สูงสุด 1 ใบ คอลลง (R) จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H33';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1) และเปิดเผยคริติคอลทริกเกอร์หรือฟรอนต์ทริกเกอร์ 1 ใบจากมือ] เพื่อเล่นการ์ดนี้ได้!
ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป คุณจั่วการ์ด 1 ใบ และนำการ์ดที่เปิดเผยด้วยคอสต์นี้ไปวางไว้บนสุดของเด็คคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H34';
UPDATE cards SET skill_text_th = '[COST][ทิ้งการ์ด 1 ใบจากมือ] เพื่อเล่นการ์ดนี้ได้!
[CONT][ออเดอร์โซน]: มอบความสามารถ "บูสต์" ให้เรียร์การ์ดเกรด 3 ทั้งหมดของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H35';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าเกรดแวนการ์ดของคุณกับคู่ต่อสู้เท่ากัน [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ ตลอดเทิร์นนั้นยูนิตนั้นกับยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H36';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์อยู่ [COST][เคาน์เตอร์บลาสต์ (2) และถอยยูนิตนี้] เลือกยูนิตเกรด 3 ของคุณ 1 ใบ ตลอดเทิร์นนั้นได้ไดรฟ์ +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H37';
UPDATE cards SET skill_text_th = '[ACT][(R)]: [COST][วางยูนิตนี้ลงโซล และเรสต์เรียร์การ์ดอื่น 1 ใบ] เปิดดูเด็คของคุณ 3 ใบจากบนสุด เลือกเกรด 3 จำนวนเท่าที่ต้องการ เปิดเผยแล้วเพิ่มเข้ามือ ส่วนที่เหลือทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H38';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ออกมาที่ (R) หรือถูกทิ้งจากมือในเทิร์นของคุณ เลือกเรียร์การ์ดแถวหลังของคุณ 1 ใบ สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H39';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ยูนิตเกรด 3 ทั้งหมดของคุณได้ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H40';
UPDATE cards SET skill_text_th = '[AUTO]: คอสต์นี้จ่ายด้วย "เปิดเผยการ์ด 1 ใบจากมือที่เป็น ''มังกรเรือธง แฟลกเบิร์กดราก้อน'' หรือ ''อินโรด ชูตเตอร์''" ก็ได้ เมื่อยูนิตนี้ถูกไรด์ [COST][โซลบลาสต์ (1) ด้วยการ์ดอื่นที่ไม่ใช่การ์ดนี้] คอลการ์ดนี้ลง (R)
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดอื่นของคุณแอทแทคแวนการ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟลกเบิร์กดราก้อน" [COST][เคาน์เตอร์บลาสต์ (1)] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H41';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าโซลของคุณมี 0 ใบ โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H42';
UPDATE cards SET skill_text_th = 'คอสต์นี้ลดลง เคาน์เตอร์บลาสต์ (1) ต่อการ์ด 1 ใบในไบนด์โซนของคุณ
[COST][เคาน์เตอร์บลาสต์ (4)] เพื่อเล่นการ์ดนี้ได้!
จั่วการ์ด 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H43';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ยูนิตนี้ได้พาวเวอร์ +5000 ต่อออเดอร์การ์ด 1 ใบในไบนด์โซนของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H44';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าเรียร์การ์ดของคุณยังไม่สแตนด์ด้วยความสามารถในเทิร์นนี้ ยูนิตนี้จะแอทแทคไม่ได้
[CONT][(R)]: ระหว่างการต่อสู้ที่ยูนิตนี้แอทแทคแวนการ์ด ยูนิตนี้ได้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H45';
UPDATE cards SET skill_text_th = '[CONT][(R) แถวหลัง]: เรียร์การ์ดแถวหลังทั้งหมดของคุณได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H46';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "แอสเซนแดนซ์ อัสซอลต์" คอลการ์ดนี้ลง (R)
[CONT][(R)]: ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟลกเบิร์กดราก้อน" หรือ "แอสเซนแดนซ์ อัสซอลต์" ยูนิตนี้ได้รับความสามารถ "อินเตอร์เซ็ปต์" และพาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H47';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อเรียร์การ์ดอื่นของคุณแอทแทคจากแถวหลัง [COST][เรสต์ยูนิตนี้] ระหว่างการต่อสู้นั้น ยูนิตที่แอทแทคได้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H48';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H49';
UPDATE cards SET skill_text_th = 'เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้น มอบความสามารถ "[AUTO][(V)/(R)]: เมื่อยูนิตอื่นของคุณแอทแทค ตลอดเทิร์นนั้น ยูนิตนี้ได้พาวเวอร์ +5000" ให้กับยูนิตนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/H50';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - ยูนิตที่อยู่ในสถานะ [โอเวอร์เดรส]
[CONT][(R)]: ยูนิตนี้ได้รับพาวเวอร์ดั้งเดิมทั้งหมดของการ์ดที่เป็นเดรสซอร์สของยูนิตนี้
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ดเกรด 3 ขึ้นไป ถ้ายูนิตนี้อยู่ในสถานะ [โอเวอร์เดรส] [COST][เคาน์เตอร์บลาสต์ (1)] ระหว่างการต่อสู้นั้น ยูนิตนี้ได้พาวเวอร์ +15000 และคริติคอล +1 ตอนจบการต่อสู้นั้น นำเดรสซอร์สทั้งหมดของยูนิตนี้ไปวางที่ดรอป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP01';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณคือ "ปืนใหญ่พายุทราย ยูจิน" [COST][วางการ์ด 1 ใบจากมือลงโซล] จั่วการ์ด 1 ใบ เลือกเรียร์การ์ดของคู่ต่อสู้เกรด 2 ขึ้นไป 1 ใบ ให้ถอย
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค [COST][โซลบลาสต์ (1)] ต่อ (R) ของคู่ต่อสู้ที่ไม่มียูนิตอยู่ 1 ช่อง ระหว่างการต่อสู้นั้นยูนิตนี้ได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP02';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ถ้ามี "มังกรปีศาจตะกละ กรีดอน" อยู่ในโซลของคุณ เงื่อนไขแพ้จากดาเมจโซนของคุณจะกลายเป็น 7 ใบ
[AUTO][(V)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][โซลบลาสต์ (2) และวางเรียร์การ์ดที่สแตนด์อยู่ 4 ใบลงโซล] สแตนด์ยูนิตนี้ ถ้าโซลของคุณมีตั้งแต่ 10 ใบขึ้นไป ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +15000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP03';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" ยูนิตนี้ได้พาวเวอร์ +5000
[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1) และวางเรียร์การ์ด 1 ใบลงโซล] ทุก 4 ใบในโซลของคุณ เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ให้ถอย จากนั้นถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" เปิดดูเด็คของคุณจากบนสุดเท่ากับจำนวน (R) ของคู่ต่อสู้ที่ไม่มียูนิตอยู่ เลือกการ์ดยูนิตจำนวนเท่าที่ต้องการ คอลลง (R) ส่วนที่เหลือวางลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP04';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) ค้นหาการ์ดอุกกาบาตจากเด็คของคุณได้สูงสุด 2 ใบ วางลงออเดอร์โซน จากนั้นสับเด็ค
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1) และวางการ์ดอุกกาบาตจากออเดอร์โซนลงดรอปจำนวนเท่าที่ต้องการตั้งแต่ 1 ใบขึ้นไป] ระหว่างการต่อสู้นั้นยูนิตนี้ได้พาวเวอร์ +15000 ถ้าการ์ดอุกกาบาตที่ถูกวางลงดรอปด้วยคอสต์นี้มีตั้งแต่ 3 ใบขึ้นไป ได้คริติคอล +1 เพิ่มด้วย และถ้ามีตั้งแต่ 5 ใบขึ้นไป ความสามารถทริกเกอร์ของคุณจะทำงาน 2 ครั้งเพิ่มด้วย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP05';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้าโลกของคุณเป็นราตรีมืด ยูนิตนี้ได้พาวเวอร์ +2000 ถ้าไม่ใช่ราตรีมืดแต่เป็นราตรีมืดสนิท ยูนิตนี้ได้พาวเวอร์ +5000
[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][ถอยโทเคนนักรบเงาราตรี 3 ใบ] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP06';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด [COST][เคาน์เตอร์บลาสต์ (2) และเรสต์เรียร์การ์ดอื่นจำนวนเท่าที่ต้องการ] ระหว่างการต่อสู้นั้น ยูนิตนี้ทำไดรฟ์เช็ค และได้พาวเวอร์ +5000 ตอนจบการต่อสู้นั้น ถ้ายูนิตที่ถูกเรสต์ด้วยคอสต์นี้มี 3 ใบหรือน้อยกว่า เลือกการ์ดจากมือคุณ 3 ใบ ทิ้ง และถ้ายูนิตที่ถูกเรสต์ด้วยคอสต์นี้มี 1 ใบหรือน้อยกว่า เลือกเพิ่มอีก 2 ใบ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP07';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณคือ "นักเวทหญิงแห่งดวงแก้วหกเหลี่ยม" หรือ "นักเวทหญิงแห่งแสงห้าเหลี่ยม" [COST][โซลบลาสต์ (1)] เปิดดูเด็คของคุณ 2 ใบจากบนสุด นำไปวางไว้บนสุดของเด็คตามลำดับที่ต้องการ
[CONT][(R)/(G)]: ถ้าแวนการ์ดของคุณคือ "นักเวทหญิงแห่งดวงแก้วหกเหลี่ยม" ยูนิตนี้ได้พาวเวอร์ +2000/ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP08';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด [COST][เคาน์เตอร์บลาสต์ (1)] ให้ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนครั้งที่คุณแอทแทคในเทิร์นนี้
- ตั้งแต่ 3 ครั้งขึ้นไป จั่วการ์ด 1 ใบ
- ตั้งแต่ 4 ครั้งขึ้นไป เลือกเรียร์การ์ดของคู่ต่อสู้ 2 ใบ ให้ถอย
- ตั้งแต่ 5 ครั้งขึ้นไป ระหว่างการต่อสู้นั้นยูนิตนี้ได้พาวเวอร์ +10000 และคู่ต่อสู้จะคอลการ์ดจากมือลง (G) ได้เฉพาะเมื่อคอลพร้อมกันตั้งแต่ 3 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP09';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากมือ ค้นหาออเดอร์การ์ดจากเด็คของคุณได้สูงสุด 1 ใบแล้วเปิดเผย ถ้าไม่มีการ์ดชื่อเดียวกันอยู่ในดรอปของคุณ ให้ทิ้งการ์ดที่เปิดเผยนั้น จากนั้นสับเด็ค
[AUTO][(R)]: เมื่อคุณเล่นออเดอร์ [COST][โซลบลาสต์ (1)] ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000 ถ้าผสานเวทแล้ว เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ นำกลับเข้ามือก็ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP10';
UPDATE cards SET skill_text_th = '[CONT][(R)/(G)]: ถ้าดรอปของคู่ต่อสู้มีตั้งแต่ 4 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +2000/ชิลด์ +5000 ถ้ามีตั้งแต่ 8 ใบขึ้นไป ได้ชิลด์ +5000 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP11';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST][เคาน์เตอร์บลาสต์ (1)] เปิดดูเด็คของคุณ 7 ใบจากบนสุด เลือกการ์ดที่มีความสามารถ [โอเวอร์เดรส] ได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP12';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000
[CONT][(R)]: เมื่อคุณไรด์จากไรด์เด็ค คุณสามารถไรด์ด้วยการ "วางยูนิตนี้ลงโซล" แทน "เลือกการ์ด 1 ใบจากมือ ทิ้ง" ก็ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP13';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าโซลของคุณมีตั้งแต่ 7 ใบขึ้นไป ยูนิตนี้ได้ชิลด์ +5000
[AUTO]: เมื่อยูนิตนี้ถอยจาก (G) นำการ์ดนี้ลงโซลก็ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP14';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" [COST][เคาน์เตอร์บลาสต์ (1) และวางเรียร์การ์ดอื่น 2 ใบลงโซล] เลือกการ์ด 1 ใบจากโซลของคุณ คอลลง (R) ตลอดเทิร์นนั้นยูนิตนั้นกับยูนิตนี้ได้พาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP15';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์อยู่ โซลชาร์จ (1)
[AUTO]: เมื่อยูนิตนี้ถูกวางลงโซลจาก (R) ด้วยความสามารถของแวนการ์ดของคุณ [COST][เคาน์เตอร์บลาสต์ (2)] เลือกแวนการ์ดของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +5000/ไดรฟ์ +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP16';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1) และโซลบลาสต์ (3)] เลือกเรียร์การ์ดของคู่ต่อสู้ได้สูงสุด 3 ใบ นำไปคุมขังในคุกของคุณ จากนั้นถ้ามีการ์ดของคู่ต่อสู้ถูกคุมขังอยู่ในคุกของคุณตั้งแต่ 3 ใบขึ้นไป ระหว่างการต่อสู้นั้นยูนิตนี้ได้พาวเวอร์ +10000 และถ้ามีตั้งแต่ 5 ใบขึ้นไป ได้คริติคอล +1 เพิ่มด้วย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP17';
UPDATE cards SET skill_text_th = '[CONT][(R)/(G)]: ถ้าเซ็ตออเดอร์ในดรอปและออเดอร์โซนของคุณรวมกันตั้งแต่ 5 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +5000/ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP18';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) เลือกการ์ดยูนิตของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณ 1 ใบ คอลลง (R) ของคู่ต่อสู้ที่ไม่มียูนิตอยู่ก็ได้ ถ้าคอล เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ นำไปคุมขังในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP19';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) [COST][โซลบลาสต์ (1)] เปิดดูเด็คของคุณ 1 ใบจากบนสุด ถ้าเป็นการ์ดยูนิต คอลลง (R) ในคอลัมน์เดียวกับยูนิตนี้ก็ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP20';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้ามือของคุณมี 4 ใบหรือน้อยกว่า [COST][เคาน์เตอร์บลาสต์ (1)] เปิดดูเด็คของคุณ 5 ใบจากบนสุด เลือกการ์ดยูนิตเกรด 3 ได้สูงสุด 1 ใบ คอลลง (R) จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP21';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] ค้นหา "นักเวทหญิงแห่งดวงแก้วหกเหลี่ยม" จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP22';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทคเรียร์การ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟลกเบิร์กดราก้อน" [COST][โซลบลาสต์ (1)] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP23';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตอื่นของคุณในคอลัมน์เดียวกับยูนิตนี้แอทแทค [COST][โซลบลาสต์ (1)] ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +10000 เลือกเรียร์การ์ดของคู่ต่อสู้ทั้งหมด ในการต่อสู้ที่ยูนิตนี้แอทแทคในเทิร์นนี้ คู่ต่อสู้จะคอลเกรดเดียวกับยูนิตที่เลือกจากมือลง (G) ไม่ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP24';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) หรือถูกวางลง (G) ถ้าแวนการ์ดของคุณคือ "ราชาอสูรเขาไม้ แมกโนเลีย" ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000/ชิลด์ +5000
[AUTO][(R) แถวหลัง]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค นำยูนิตนี้กลับเข้ามือก็ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP25';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "มังกรปีศาจตะกละ กรีดอน" [COST][วางการ์ด 1 ใบจากมือลงโซล] ค้นหาการ์ดที่ชื่อเดียวกับการ์ดนี้จากเด็คของคุณ 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[CONT][โซล]: ระหว่างเทิร์นของคุณ ถ้าดาเมจโซนของคุณมีตั้งแต่ 4 ใบขึ้นไป "มังกรปีศาจตะกละ กรีดอน" ที่เป็น (V) ของคุณได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP26';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) หรือ (R) ถ้ามีการ์ดอุกกาบาตอยู่ในออเดอร์โซนของคุณ [COST][โซลบลาสต์ (3)] จั่วการ์ด 1 ใบ ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000
[CONT][(R)]: ถ้าเซ็ตออเดอร์ในดรอปและออเดอร์โซนของคุณรวมกันตั้งแต่ 5 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP27';
UPDATE cards SET skill_text_th = '[AUTO]: คอสต์นี้จ่ายด้วย "เปิดเผยการ์ด 1 ใบจากมือที่เป็น ''มังกรเรือธง แฟลกเบิร์กดราก้อน'' หรือ ''อินโรด ชูตเตอร์''" ก็ได้ เมื่อยูนิตนี้ถูกไรด์ [COST][โซลบลาสต์ (1) ด้วยการ์ดอื่นที่ไม่ใช่การ์ดนี้] คอลการ์ดนี้ลง (R)
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดอื่นของคุณแอทแทคแวนการ์ด ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟลกเบิร์กดราก้อน" [COST][เคาน์เตอร์บลาสต์ (1)] สแตนด์ยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP28';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "ดีไซร์เดวิล โบช็อค" [COST][เปิดเผยการ์ด "มังกรปีศาจตะกละ กรีดอน" 1 ใบจากไรด์เด็ค] จั่วการ์ด 1 ใบ
[AUTO]: เมื่อยูนิตนี้ถูกวางลงโซลจาก (R) ด้วยความสามารถของแวนการ์ดของคุณ ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] ตลอดเทิร์นนั้น คู่ต่อสู้จะคอลการ์ดจากมือลง (G) ได้เฉพาะเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP29';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP30';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) เปิดดูเด็คของคุณ 7 ใบจากบนสุด เลือกการ์ดอุกกาบาตจำนวนเท่าที่ต้องการ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[ACT][(R)] เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "กราวิเดีย เนลทริงเกอร์" [COST][โซลบลาสต์ (1)] เลือกการ์ดอุกกาบาตจากมือได้สูงสุด 2 ใบ วางลงออเดอร์โซน ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP31';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP32';
UPDATE cards SET skill_text_th = '[CONT]: "นีทเนส เมทิออร์ชาวเวอร์" ใส่ในเด็คได้สูงสุด 16 ใบ
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออเดอร์โซน โซลชาร์จ (1) ก็ได้ ถ้าถูกวางด้วยความสามารถของแวนการ์ดของคุณ จั่วการ์ด 1 ใบเพิ่มก็ได้
[AUTO]: เมื่อการ์ดนี้ถูกวางลงดรอปจากออเดอร์โซน เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ ให้ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP33';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "แอสเซนแดนซ์ อัสซอลต์" คอลการ์ดนี้ลง (R)
[CONT][(R)]: ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟลกเบิร์กดราก้อน" หรือ "แอสเซนแดนซ์ อัสซอลต์" ยูนิตนี้ได้รับความสามารถ "อินเตอร์เซ็ปต์" และพาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP34';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นผู้เล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP35';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้บูสต์ [COST][วางยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP36';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้บูสต์ [COST][วางยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP37';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้บูสต์ [COST][วางยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP38';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้บูสต์ [COST][วางยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP39';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้บูสต์ [COST][วางยูนิตนี้ลงโซล] เลือกยูนิตของคุณ 1 ใบ ตลอดเทิร์นนั้นได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT03/SP40';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา"
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าทำโอเวอร์เดรส นำการ์ดทั้งหมดจากดรอปของคุณที่เป็น "ทริกสตา" และมีความสามารถ [โอเวอร์เดรส] มาวางเป็นเดรสซอร์สของยูนิตนี้
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อแวนการ์ดของคุณแอทแทค [COST][โซลบลาสต์ (1)] สแตนด์ยูนิตนี้ ทุกเดรสซอร์ส 1 ใบของยูนิตนี้ ตลอดเทิร์นนั้นยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/001';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ ถ้ามียูนิตของคุณที่อยู่ในสถานะโอเวอร์เดรส พาวเวอร์ของยูนิตแนวหน้าทั้งหมดของคุณ+10000
[ACT](V) เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดที่มีคำว่า "นิรวานา" 1 ใบจากมือหรือโซลลงดรอป] เลือกเกรด 0 จากดรอปของคุณ 1 ใบ คอลลง (R) แล้วเลือกแวนการ์ดของฝ่ายตรงข้าม 1 ใบ ถ้าดาเมจโซนของฝ่ายตรงข้ามมี 4 ใบหรือน้อยกว่า ให้ 1 ดาเมจ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/002';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวจากดรอปลง (R) แนวหลังตรงกลาง รับเคาน์เตอร์ชาร์จ (1)
[เดรสบูสต์] - [AUTO](R): เมื่อยูนิตนี้บูสต์ ในระหว่างการต่อสู้นั้น พาวเวอร์ของยูนิตที่ถูกบูสต์+10000 ต่อการ์ดที่ "ฟูเอ็นโนะ มิโกะ บาวซาการะ" ของคุณสวมใส่อยู่ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/003';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อเริ่มไรด์เฟสของคุณ ในเทิร์นนั้น คุณจะกลายเป็น "อิคคิคาเซอิ"
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าคุณเป็น "อิคคิคาเซอิ" [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (5)] ทำให้ยูนิตแนวหน้าทั้งหมดของคุณสแตนด์ และในเทิร์นนั้น ไดรฟ์ของยูนิตนี้ -2', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/004';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: ในเทิร์นของคุณ เมื่อเรียร์การ์ดอื่นของคุณถูกนำไปไว้ในโซลด้วยความสามารถของแวนการ์ดของคุณ [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ด 1 ใบจากมือของคุณ คอลลง (R) ที่ไม่มียูนิต ถ้าโซลของคุณมี 10 ใบขึ้นไป จั่วเพิ่มอีก 1 ใบ (ใช้ได้แม้ยูนิตนี้จะถูกนำไปไว้ในโซลพร้อมกับยูนิตอื่นด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/005';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) รับโซลชาร์จ (1)
[AUTO](R): เมื่อการ์ดของคุณถูกนำไปไว้ในโซลด้วยโซลชาร์จ ถ้าแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไป ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000 (ถ้าโซลชาร์จ (2) จะเป็น +10000)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/006';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (V) [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์การ์ดที่มีคำว่า "เซราส" (1)] ให้ฝ่ายตรงข้ามเลือกจากมือ เรียร์การ์ด และโซลของตัวเองอย่างละ 2 ใบ นำไปขังไว้ในคุกของคุณ
[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตแนวหน้าทั้งหมดของคุณ+5000 ต่อการ์ดฝ่ายตรงข้ามที่ถูกขังอยู่ในคุกของคุณทุก 2 ใบ ถ้ามี 10 ใบขึ้นไป คริติคอลของยูนิตแนวหน้าทั้งหมดของคุณ+1 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/007';
UPDATE cards SET skill_text_th = '[ACT](R): [COST][ถอยโทเคนทหารเงาราตรี 1 ใบ] ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000 ถ้าเป็นการใช้ความสามารถนี้ครั้งที่ 3 ในเทิร์นนี้ ในเทิร์นนั้น คริติคอลของยูนิตนี้+1 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/008';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][โซลบลาสต์ (1)] เลือกการ์ดสะเก็ดดาวจากดรอปของคุณ 1 ใบ นำไปไว้ในออเดอร์โซน
[CONT](R): ในเทิร์นของคุณ ถ้าเทิร์นนี้มีเรียร์การ์ดของฝ่ายตรงข้ามถอยไปแล้ว พาวเวอร์ของยูนิตนี้+5000 และถ้าถอยไปแล้ว 3 ใบขึ้นไป คริติคอล+1 เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/009';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตแนวหน้าทั้งหมดของคุณ+2000
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกเกรด 3 ขึ้นไป [COST][ทิ้งการ์ดที่มีคำว่า "บาสเตียน" 1 ใบจากมือหรือโซลลงดรอป] ทำให้เรียร์การ์ดเกรด 3 ทั้งหมดของคุณสแตนด์ และในเทิร์นนั้น พาวเวอร์+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/010';
UPDATE cards SET skill_text_th = '[ACT](R): [COST][โซลบลาสต์ (1), เรสต์ยูนิตนี้] เปิดดูเด็คของคุณ 3 ใบจากบนสุด เลือกการ์ดยูนิตเกรด 3 ขึ้นไปที่มีชื่อต่างจากยูนิตนี้ได้สูงสุด 1 ใบ คอลลง (R) ส่วนที่เหลือจัดเรียงตามต้องการแล้ววางไว้ใต้เด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/011';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกยูนิตทริกเกอร์ ถ้าแวนการ์ดของคุณคือ "รคคาคุโฮจุ โนะ มาจุสึชิ" [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ ทำให้สแตนด์ แล้วถอยยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/012';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (V) เลือกการ์ด 1 ใบจากโซลของคุณ คอลลง (R) ได้
[CONT](V): ถ้าในโซลหรือ (R) ของคุณมีการ์ดที่มีคำว่า "แมกโนเลีย" 1 ใบขึ้นไป เรียร์การ์ดทั้งหมดของคุณสามารถแอทแทคและอินเตอร์เซ็ปต์ได้แม้จากแนวหลัง และพาวเวอร์+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/013';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทคแวนการ์ดเกรด 3 ขึ้นไป ถ้าเป็นการต่อสู้ครั้งที่ 1 ในเทิร์นนี้ และแวนการ์ดของคุณคือ "คิกังริว แฟล็กเบิร์ก ดราก้อน" [COST][โซลบลาสต์ (1)] ทำให้ยูนิตนี้สแตนด์
[AUTO](R): เมื่อจบเทิร์นของคุณ ถ้าเทิร์นนี้แอทแทครวมแล้ว 4 ครั้งขึ้นไป [COST][นำยูนิตนี้ไปไว้ในโซล] จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/014';
UPDATE cards SET skill_text_th = '[AUTO][ดรอป]: เมื่อคุณเล่นนอร์มอลออเดอร์ คอลการ์ดนี้ลง (R) ได้ ถ้าทำแบบนั้น ให้ทำอย่างใดอย่างหนึ่งต่อไปนี้ 1 อย่าง ถ้าผสานเวทแล้ว ให้ทำทั้งหมดแทนที่จะทำแค่ 1 อย่าง
- ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000
- ในเทิร์นนั้น คริติคอลของยูนิตนี้+1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/015';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้า (V) ของคุณมีการ์ดสวมใส่ 1 ใบ [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดสวมใส่ 1 ใบจากมือหรือดรอปของคุณ แล้วสวมใส่ให้แวนการ์ดของคุณ 1 ใบ
[CONT](R): ในเทิร์นของคุณ ถ้า (V) ของคุณมีการ์ดสวมใส่ 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/016';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าเทิร์นนี้มีเรียร์การ์ดของฝ่ายตรงข้ามถอยไปแล้ว [COST][เคาน์เตอร์บลาสต์ (1)] รับโซลชาร์จ (1) เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอยการ์ดนั้น และในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/017';
UPDATE cards SET skill_text_th = 'การ์ดสวมใส่เทพ (ขวา) - "ฟูเอ็นโนะ มิโกะ บาวซาการะ" (หลังเล่นแล้ว แวนการ์ดที่ถูกกำหนดจะสวมใส่การ์ดนี้ ถ้าสวมใส่การ์ดสวมใส่เทพ (ขวา) ใบใหม่ ให้นำการ์ดนี้ไปไว้ในดรอป)
เล่นได้ด้วย [COST][เคาน์เตอร์บลาสต์ (1)]!
[AUTO](V): เมื่อการ์ดนี้ถูกสวมใส่ จั่ว 1 ใบ และในเทิร์นนี้คุณเล่นการ์ดสวมใส่เพิ่มได้อีก 1 ใบ
[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตที่สวมใส่การ์ดนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/018';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ในเมนเฟสของคุณ [COST][เคาน์เตอร์บลาสต์ (1)] เปิดดูเด็คของคุณ 1 ใบจากบนสุด แล้วคอลลง (R) เมื่อจบเทิร์นนั้น ถอยยูนิตที่ถูกคอลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/019';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ให้ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนโซลของคุณ
- 7 ใบขึ้นไป - [COST][เคาน์เตอร์บลาสต์ (1), ทิ้ง 1 ใบจากมือ] เลือกการ์ด 1 ใบจากโซลของคุณ เอาเข้ามือ แล้วรับโซลชาร์จ (1)
- 13 ใบขึ้นไป - ในเทิร์นนั้น พาวเวอร์ของยูนิตแนวหน้าทั้งหมดของคุณ+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/020';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][เคาน์เตอร์บลาสต์ (1)] ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000 ถ้าคุณเป็น "อิคคิคาเซอิ" รับโซลชาร์จ (2) เพิ่มเติม แล้วเลือกการ์ด 1 ใบจากโซล คอลลง (R) ที่ไม่มียูนิต', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/021';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าโลกของคุณเป็นราตรีมืดหรือราตรีมืดสนิท ยูนิตนี้จะได้รับความสามารถ ''บูสต์'' และสามารถอินเตอร์เซ็ปต์ได้แม้จากแนวหลัง
[CONT](G): ถ้าโลกของคุณเป็นราตรีมืดสนิท ชิลด์ของยูนิตนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/022';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST][โซลบลาสต์ (2)] เลือกการ์ดสะเก็ดดาวจากดรอปของคุณได้สูงสุด 5 ใบ นำกลับเข้าเด็คแล้วสับเด็ค ถ้านำกลับ 1 ใบขึ้นไป ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้+5000 ถ้านำกลับ 3 ใบขึ้นไป พาวเวอร์+5000 เพิ่มเติม และถ้านำกลับครบ 5 ใบ พาวเวอร์+5000 เพิ่มเติมอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/023';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าแวนการ์ดของคุณมีคำว่า "เซราส" พาวเวอร์ของยูนิตนี้+5000
[AUTO]: เมื่อยูนิตนี้ปรากฏตัวจากมือลง (R) ถ้ามีการ์ดฝ่ายตรงข้ามถูกขังอยู่ในคุกของคุณ 3 ใบขึ้นไป ค้นหาการ์ดชื่อเดียวกับยูนิตนี้จากเด็คได้สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/024';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตของคุณแอทแทค [COST][เคาน์เตอร์บลาสต์ (1)] ทำสิ่งต่อไปนี้ทั้งหมดตามยูนิตทริกเกอร์ที่ออกจากไดรฟ์เช็คในการต่อสู้นั้น
- [คริติคอลทริกเกอร์] - เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ นำไปไว้ใต้เด็ค
- [ฟรอนต์ทริกเกอร์] - เลือกเรียร์การ์ดเกรด 2 หรือต่ำกว่าของคุณ 1 ใบ ทำให้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/025';
UPDATE cards SET skill_text_th = '[AUTO][(R) แนวหน้า]: เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของแวนการ์ดของคุณ [COST][โซลบลาสต์ (2)] จั่ว 1 ใบ
[CONT][(R) แนวหลัง]: ในเทิร์นของคุณ พาวเวอร์ของเรียร์การ์ดอื่นทั้งหมดของคุณที่อยู่แนวตั้งเดียวกับยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/026';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวจากมือลง (R) ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" [COST][ทิ้ง 1 ใบจากมือ] เปิดดูเด็คของคุณ 2 ใบจากบนสุด เลือกการ์ดยูนิตได้สูงสุด 2 ใบ คอลลง (R) แบบเรสต์ แล้วทิ้งส่วนที่เหลือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/027';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][โซลบลาสต์ (1)] เลือก "จุคาคุจู แพนเทโร่" จากดรอปของคุณ 1 ใบ คอลลง (R) ที่ไม่มียูนิต
[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีคำว่า "แมกโนเลีย" ในระหว่างการต่อสู้นั้น พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/028';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบเทิร์นของคุณ ถ้าเทิร์นนี้คุณเล่นออเดอร์แบบผสานเวท หรือแอทแทครวมแล้ว 5 ครั้งขึ้นไป [COST][นำยูนิตนี้ไปไว้ในโซล] รับเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/029';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][ทิ้งการ์ดออเดอร์ 1 ใบจากมือ]!
เลือกเกรด 3 ที่มีคำว่า "โซลก้า" จากไรด์เด็คของคุณ 1 ใบ เปิดเผยได้ ถ้าเปิดเผยแล้ว หรือแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไปที่มีคำว่า "โซลก้า" เลือกแวนการ์ดของคุณ 1 ใบ ในเทิร์นนั้น ไดรฟ์+1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/030';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเกรด 0 จากดรอปของคุณ 1 ใบ คอลลง (R) ในแนวตั้งเดียวกับยูนิตนี้ และในเทิร์นนั้น ยูนิตนี้จะได้รับความสามารถ ''บูสต์''', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/031';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดที่มีความสามารถโอเวอร์เดรสจากดรอปของคุณได้สูงสุด 1 ใบ เอาเข้ามือ ถ้าแวนการ์ดของคุณเป็นเกรด 4 รับเคาน์เตอร์ชาร์จ (1) เพิ่มเติม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/032';
UPDATE cards SET skill_text_th = '[AUTO][(R) แนวหลัง] เทิร์นละ 1 ครั้ง: ในเทิร์นของคุณ เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอย ทำให้ยูนิตนี้สแตนด์ และในเทิร์นนั้น พาวเวอร์+2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/033';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/034';
UPDATE cards SET skill_text_th = 'การ์ดสวมใส่เทพ (ซ้าย) - "ฟูเอ็นโนะ มิโกะ บาวซาการะ" (หลังเล่นแล้ว แวนการ์ดที่ถูกกำหนดจะสวมใส่การ์ดนี้ ถ้าสวมใส่การ์ดสวมใส่เทพ (ซ้าย) ใบใหม่ ให้นำการ์ดนี้ไปไว้ในดรอป)
เล่นได้ด้วย [COST][โซลบลาสต์ (1)]!
[AUTO](V): เมื่อยูนิตที่สวมใส่การ์ดนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (2)] ในระหว่างการต่อสู้นั้น ไดรฟ์ของยูนิตที่สวมใส่+1 เมื่อจบการต่อสู้นั้น นำการ์ดนี้ไปไว้ในดรอป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/035';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][โซลบลาสต์ (1)]!
เลือกยูนิตของคุณที่อยู่ในสถานะโอเวอร์เดรส 1 ใบ มอบความสามารถ ''[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด รับเคาน์เตอร์ชาร์จ (1)'' ให้ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/036';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "จูริกุ โนะ ชิไฮชะ บาร์โรว์แมกเนส" [COST][นำการ์ด 1 ใบจากมือลงโซล] ในเทิร์นนั้น พาวเวอร์ของยูนิตแนวหน้าทั้งหมดของคุณ+5000 ถ้าโซลของคุณมี 10 ใบขึ้นไป ให้เป็น +10000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/037';
UPDATE cards SET skill_text_th = '[AUTO][โซล]: เมื่อ "เคียวโยกุมะริว กรีดอน" ปรากฏตัวลง (V) ของคุณ [COST][เคาน์เตอร์บลาสต์ (1)] คอลการ์ดนี้ลง (R) (ไม่ทำงานเมื่อไรด์ในขณะที่การ์ดนี้อยู่ที่ (V))', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/038';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์โจมตีสำเร็จ [COST][ถอยยูนิตนี้] เลือกเกรด 1 จากโซลของคุณ 1 ใบ คอลลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/039';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้าคุณเป็น "อิคคิคาเซอิ" ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000 ต่อโซลของคุณทุก 3 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/040';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/041';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][ทิ้ง 1 ใบจากมือ]!
รับเคาน์เตอร์ชาร์จ (1) ถ้าคุณเป็น "อิคคิคาเซอิ" จั่ว 2 ใบ เลือก 2 ใบจากมือ คอลลง (R) และในเทิร์นนั้น พาวเวอร์ของการ์ดเหล่านั้น+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/042';
UPDATE cards SET skill_text_th = '[AUTO][(R) แนวหน้า] เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดของฝ่ายตรงข้ามปรากฏตัวจากที่อื่นที่ไม่ใช่มือ ทำให้ยูนิตนั้นเรสต์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/043';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้บูสต์โทเคนทหารเงาราตรี คอลโทเคนทหารเงาราตรี 1 ใบลง (R) ที่ยูนิตนี้อยู่แบบเรสต์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/044';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์โจมตีสำเร็จ รับเคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/045';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/046';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][เคาน์เตอร์บลาสต์ (1)]!
เลือกยูนิตของคุณ 1 ใบ ในระหว่างการต่อสู้นั้น พาวเวอร์+10000 ต่อโทเคนทหารเงาราตรีของคุณทุก 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/047';
UPDATE cards SET skill_text_th = '(เซ็ตออเดอร์หลังเล่นแล้วให้นำไปไว้ในออเดอร์โซน)
[CONT]: เมื่อความสามารถของแวนการ์ดของคุณนับการ์ดสะเก็ดดาวที่ถูกนำจากออเดอร์โซนไปไว้ในดรอปเป็นต้นทุน ให้นับการ์ดนี้เป็น 2 ใบ
[AUTO]: เมื่อการ์ดนี้ถูกนำจากออเดอร์โซนไปไว้ในดรอป ไบนด์การ์ดนี้ เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอยการ์ดนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/048';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าไม่มีเรียร์การ์ดอื่นอยู่เลย ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000 และเมื่อจบการต่อสู้นั้น ทำให้ยูนิตนี้สแตนด์ (รวมเรียร์การ์ดของฝ่ายตรงข้ามด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/049';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าแวนการ์ดของคุณคือ "อิทาดากิ โวะ โคเอรุ เคน บาสเตียน ไพรม์" พาวเวอร์ของยูนิตนี้+5000
[AUTO](R): เมื่อยูนิตนี้สแตนด์ด้วยเอฟเฟกต์การ์ดของคุณ ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/050';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้าดาเมจโซนของคุณมีการ์ดที่เปิดหน้าอยู่ [COST][นำยูนิตทริกเกอร์ 1 ใบจากมือไปไว้ในดาเมจโซนแบบคว่ำหน้า] เลือกการ์ดจากดาเมจโซนที่เปิดหน้าของคุณ 1 ใบ เอาเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/051';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าไม่มียูนิตอื่นอยู่ในแนวตั้งเดียวกับยูนิตนี้ พาวเวอร์ของยูนิตนี้+10000 (รวมเรียร์การ์ดของฝ่ายตรงข้ามด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/052';
UPDATE cards SET skill_text_th = '[AUTO]: ในเทิร์นของคุณ เมื่อการ์ดนี้ถูกทิ้งจากมือ [COST][โซลบลาสต์ (1)] คอลการ์ดนี้ลง (R) แนวหลังแบบเรสต์
[CONT](R): ถ้ายูนิตนี้สแตนด์อยู่ ยูนิตนี้จะได้รับความสามารถ ''อินเตอร์เซ็ปต์'' และสามารถอินเตอร์เซ็ปต์ได้แม้จากแนวหลัง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/053';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/054';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) แนวหลัง ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000 ได้ ถ้าทำแบบนั้น ในเทิร์นนั้น ยูนิตนี้ไม่สามารถย้ายไปยัง (R) อื่นได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/055';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "คิกังริว แฟล็กเบิร์ก ดราก้อน" ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/056';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์โจมตีแวนการ์ดสำเร็จ [COST][ไบนด์การ์ดออเดอร์ 1 ใบจากดรอป] เลือกการ์ดออเดอร์จากดรอปของคุณ 1 ใบ เอาเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/057';
UPDATE cards SET skill_text_th = '[CONT][(R) แนวหลัง]: ในระหว่างการต่อสู้ที่ยูนิตนี้แอทแทค เมื่อฝ่ายตรงข้ามจะคอลจากมือลง (G) จะคอลได้ก็ต่อเมื่อคอลพร้อมกันตั้งแต่ 2 ใบขึ้นไปเท่านั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/058';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/059';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][โซลบลาสต์ (1)]!
จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ ในระหว่างการต่อสู้นั้น พาวเวอร์+5000 ต่อชื่อการ์ดออเดอร์ที่แตกต่างกันในดรอปและไบนด์โซนของคุณรวมกันทุก 1 ชื่อ (นับจำนวนชื่อการ์ดที่ต่างกัน)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/060';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของแวนการ์ดของคุณโจมตีสำเร็จ นำยูนิตนี้กลับเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/061';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) [COST][ทิ้งการ์ดสวมใส่ 1 ใบจากมือ] จั่ว 1 ใบ และในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/062';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้าแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไป [COST][โซลบลาสต์ (1)] ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/063';
UPDATE cards SET skill_text_th = '[CONT](R): ในระหว่างการต่อสู้ที่ยูนิตนี้แอทแทคเกรด 3 ขึ้นไป พาวเวอร์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/064';
UPDATE cards SET skill_text_th = '[CONT][(R) แนวหน้า]: เมื่อยูนิตของคุณแอทแทค ยูนิตทั้งหมดของคุณสามารถแอทแทคยูนิตแนวหลังของฝ่ายตรงข้ามที่อยู่ในแนวตั้งเดียวกับยูนิตที่แอทแทคนั้นได้ด้วย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/065';
UPDATE cards SET skill_text_th = '[AUTO](R): ในเมนเฟสของคุณ เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอย เลือก "ซาจิน โนะ เทคิโฮ ดอลลี่" ที่ (R) ของคุณ 1 ใบ นำกลับเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/066';
UPDATE cards SET skill_text_th = '[AUTO](R): ในเมนเฟสของคุณ เมื่อเรียร์การ์ดของฝ่ายตรงข้ามถอย เลือก "ซาจิน โนะ เทคิดัน ออลลี่" ที่ (R) ของคุณ 1 ใบ นำกลับเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/067';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้บูสต์ "โฮโนะ โนะ มิโกะ โซนญ่า" [COST][เคาน์เตอร์บลาสต์ (1)] ถอยเรียร์การ์ดทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้ ค้นหาการ์ดยูนิตที่เกรดสูงกว่าแวนการ์ดของคุณ 1 เกรดขึ้นไปจากเด็คได้สูงสุด 1 ใบ เปิดเผยแล้วเอาเข้ามือ แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/068';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ พาวเวอร์ของยูนิตนี้+2000 ต่อการ์ดที่อยู่ใน (V) ของคุณทุก 1 ใบ (รวมการ์ดสวมใส่ด้วย ไม่รวมโซล)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/069';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกนำไปไว้ที่ (G) [COST][เปิดเผยเกรด 4 จากมือ 1 ใบ] ในระหว่างการต่อสู้นั้น ชิลด์ของยูนิตนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/070';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][เคาน์เตอร์บลาสต์ (2)]!
เลือกการ์ดสวมใส่จากดรอปของคุณ 2 ใบ เอาเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/071';
UPDATE cards SET skill_text_th = 'ถ้าแวนการ์ดของคุณคือ "ดราโกนิก โอเวอร์ลอร์ด" เลือกยูนิตของคุณ 1 ใบ ในระหว่างการต่อสู้นั้น พาวเวอร์+20000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/072';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อเรียร์การ์ดของคุณสแตนด์ ถ้าคุณเป็น "อิคคิคาเซอิ" ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+5000 (รวมยูนิตนี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/073';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "เคียวโยกุมะริว กรีดอน" [COST][เคาน์เตอร์บลาสต์ (1), ทิ้ง 1 ใบจากมือ] เลือกเกรด 3 หรือต่ำกว่าจากโซลของคุณ 1 ใบ คอลลง (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/074';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าโซลของคุณมีเกรด 3 อยู่ 2 ใบขึ้นไป [COST][ทิ้ง 1 ใบจากมือ] ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+15000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/075';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าโซลของคุณมีเกรด 3 อยู่ 2 ใบขึ้นไป ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/076';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้โจมตีแวนการ์ดสำเร็จ รับโซลชาร์จ (2) ถ้าคุณเป็น "อิคคิคาเซอิ" เลือกยูนิตของคุณ 1 ใบ ในเทิร์นนั้น พาวเวอร์+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/077';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้ายูนิตของคุณมี 5 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] เลือกแวนการ์ดของคุณ 1 ใบ ในเทิร์นนั้น พาวเวอร์+5000 ถ้าดาเมจโซนของคุณมี 6 ใบ ให้เป็น +15000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/078';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้ายูนิตของคุณมี 5 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] รับโซลชาร์จ (3) จากนั้นถ้าโซลของคุณมี 10 ใบขึ้นไป เลือกแวนการ์ดของคุณ 1 ใบ ในเทิร์นนั้น พาวเวอร์+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/079';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าโซลของคุณมี 5 ใบขึ้นไป พาวเวอร์ของแวนการ์ดทั้งหมดของคุณ+2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/080';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าคุณเป็น "อิคคิคาเซอิ" พาวเวอร์ของยูนิตอื่นทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/081';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าแวนการ์ดของคุณมีคำว่า "บลูส์" [COST][นำยูนิตนี้ไปไว้ในโซล] เลือกแวนการ์ดของคุณ 1 ใบ ในเทิร์นนั้น พาวเวอร์+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/082';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อแวนการ์ดของคุณแอทแทค ถ้ายูนิตของคุณที่สแตนด์อยู่มี 3 ใบขึ้นไป [COST][ถอยยูนิตนี้] รับโซลชาร์จ (2) แล้วเลือกการ์ดชื่อเดียวกับแวนการ์ดของคุณจากโซลของคุณได้สูงสุด 1 ใบ นำไปไว้บนเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/083';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][โซลบลาสต์ (4)]!
เลือกแวนการ์ดของคุณ 1 ใบ ในระหว่างการต่อสู้นั้น พาวเวอร์+5000 ต่อดาเมจโซนของคุณทุก 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/084';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): ถ้าออเดอร์โซนของคุณไม่มีการ์ดอยู่ ยูนิตนี้ไม่สามารถแอทแทคได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/085';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้โจมตีสำเร็จ [COST][เคาน์เตอร์บลาสต์ (1)] ให้ฝ่ายตรงข้ามเลือก 1 ใบจากมือของตัวเอง นำไปขังไว้ในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/086';
UPDATE cards SET skill_text_th = '[CONT](R): โทเคนทหารเงาราตรีของคุณไม่สามารถถูกเลือกด้วยเอฟเฟกต์การ์ดของฝ่ายตรงข้าม และไม่ถอยด้วยเอฟเฟกต์การ์ดของฝ่ายตรงข้าม', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/087';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้ามีการ์ดฝ่ายตรงข้ามถูกขังอยู่ในคุกของคุณ 1 ใบขึ้นไป ยูนิตนี้จะได้รับความสามารถ ''บูสต์'' และสามารถอินเตอร์เซ็ปต์ได้แม้จากแนวหลัง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/088';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) รับโซลชาร์จ (1) ต่อการ์ดฝ่ายตรงข้ามที่ถูกขังอยู่ในคุกของคุณทุก 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/089';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้โจมตีสำเร็จ ค้นหาการ์ดสะเก็ดดาวจากเด็คหรือดรอปของคุณได้สูงสุด 1 ใบ นำไปไว้ในออเดอร์โซน ถ้าค้นจากเด็ค ให้สับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/090';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) จั่ว 1 ใบ แล้วเลือก 1 ใบจากมือของคุณ ทิ้งไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/091';
UPDATE cards SET skill_text_th = '[CONT][มือ]: การ์ดนี้ไม่สามารถนอร์มอลคอลได้ถ้าโลกของคุณไม่ใช่ราตรีมืดสนิท (รวมถึงลง (G) ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/092';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวลง (R) ถ้าออเดอร์โซนของคุณมีสะเก็ดดาว 3 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] จั่ว 1 ใบ เลือกการ์ดสะเก็ดดาวจากมือของคุณได้สูงสุด 1 ใบ นำไปไว้ในออเดอร์โซน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/093';
UPDATE cards SET skill_text_th = '[CONT](G): ชิลด์ของยูนิตนี้+5000 ต่อการ์ดสะเก็ดดาวในดรอปของคุณทุก 3 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/094';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคุณเป็นเกรด 4 ชิลด์ของยูนิตนี้+15000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/095';
UPDATE cards SET skill_text_th = 'เล่นได้ด้วย [COST][โซลบลาสต์ (2)]!
นำเรียร์การ์ดแนวหลังทั้งหมดของฝ่ายตรงข้ามไปขังไว้ในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/096';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของแวนการ์ดของคุณ เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ ในเทิร์นนั้น พาวเวอร์ของยูนิตนั้น+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/097';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกนำไปไว้ที่ (G) เลือกยูนิตของคุณที่เป็นเกรด 2 ขึ้นไปและกำลังถูกแอทแทค 1 ใบ ในระหว่างการต่อสู้นั้น พาวเวอร์+10000 ถ้าเลือกเกรด 4 ให้เป็น +20000 แทน +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/098';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "รคคาคุโฮจุ โนะ มาจุสึชิ" หรือ "โกคาคุเซ็นโก โนะ มาจุสึชิ" [COST][ทิ้ง 1 ใบจากมือ] เปิดดูเด็คของคุณ 2 ใบจากบนสุด เลือกได้สูงสุด 2 ใบ จัดเรียงตามต้องการวางไว้บนเด็ค ส่วนที่เหลือจัดเรียงตามต้องการวางไว้ใต้เด็ค ในเทิร์นนั้น พาวเวอร์ของยูนิตนี้+10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/099';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้ามีเกรด 3 อื่นของคุณอยู่ในแนวตั้งเดียวกับยูนิตนี้ ในเทิร์นนั้น เกรดของยูนิตนี้+1 / พาวเวอร์+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/100';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกนำไปไว้ที่ (G) ถ้าแวนการ์ดของคุณมีคำว่า "บาสเตียน" ในระหว่างการต่อสู้นั้น ชิลด์ของยูนิตนี้+5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/101';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าในเทิร์นนี้มีเรียร์การ์ดถอยไป 2 ใบขึ้นไป จากคอสต์ของการ์ดของคุณที่มีชื่อ "บลาสเตอร์" รวมอยู่ พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/102';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของแวนการ์ดของคุณ คุณสามารถโซลชาร์จ (1) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/103';
UPDATE cards SET skill_text_th = '[AUTO] เรียร์การ์ดแถวหลัง (R): เมื่อจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกทริกเกอร์ยูนิต โดยจ่าย [COST][โซลบลาสต์ (1)] ทำให้ยูนิตนี้สแตนด์ และย้ายไปยัง (R) แถวหลังที่ไม่มียูนิตอยู่', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/104';
UPDATE cards SET skill_text_th = '[CONT](R)/โซนทริกเกอร์: ถ้าแวนการ์ดของคุณคือ "ดาบข้ามจุดสูงสุด บาสเตียน ไพรม์" เกรดของการ์ดนี้ +2 / พาวเวอร์ +5000 (มีผลแม้ในเทิร์นของคู่ต่อสู้)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/105';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ออกจากไดรฟ์เช็คของคุณ ถ้าแวนการ์ดของคุณมีชื่อ "บาสเตียน" รวมอยู่ โดยจ่าย [COST][นำการ์ดนี้ไปวางที่ดรอป] คู่ต่อสู้ต้องนำเรียร์การ์ดแถวหน้าทั้งหมดของตนไปไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/106';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
เปิดดูการ์ดบนสุดของเด็คของคุณ 1 ใบ แล้วนำไปวางไว้บนหรือใต้เด็ค จากนั้นจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/107';
UPDATE cards SET skill_text_th = 'เลือกแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" รวมอยู่และกำลังถูกแอทแทค 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +15000 เลือกเรียร์การ์ดของคุณ 1 ใบ แล้วสามารถถอยได้ ถ้าถอย พาวเวอร์ +15000 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/108';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากดรอป คุณสามารถเลือกบลิทซ์ออร์เดอร์จากดรอปของคุณ 1 ใบ แล้วเพิ่มเข้ามือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/109';
UPDATE cards SET skill_text_th = '[AUTO][ดรอป]: เมื่อแวนการ์ดเกรด 3 ขึ้นไปของคุณออกมา คุณสามารถคอลการ์ดนี้ไปที่ (R) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/110';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/111';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): มอบความสามารถ "บูสต์" ให้กับยูนิตอื่นทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/112';
UPDATE cards SET skill_text_th = '[ACT](R): โดยจ่าย [COST][ถอยยูนิตนี้] เลือกเรียร์การ์ดของคุณ 1 ใบ ในเทิร์นนั้นพาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/113';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) หรือ (R) หรือถูกวางที่ (G) โดยจ่าย [COST][โซลบลาสต์ (1), ทิ้งการ์ดออร์เดอร์จากมือ 1 ใบ] จั่ว 1 ใบ และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000/ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/114';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าการ์ดออร์เดอร์ในดรอปและไบนด์โซนของคุณรวมกันมี 5 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/115';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าแวนการ์ดของคู่ต่อสู้เกรด 2 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/116';
UPDATE cards SET skill_text_th = '[AUTO] เรียร์การ์ดแถวหน้า(R): เมื่อเรียร์การ์ดอื่นของคุณแอทแทค ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 และโดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] พาวเวอร์ +5000 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/117';
UPDATE cards SET skill_text_th = 'คู่ต่อสู้เลือกเรียร์การ์ดของตนเอง 1 ใบ แล้วถอย จากนั้นคุณเลือกยูนิตที่มีเกรดเท่ากับยูนิตที่คู่ต่อสู้ถอยไปจากดรอปของคุณได้สูงสุด 1 ใบ แล้วคอลไปที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/118';
UPDATE cards SET skill_text_th = 'เลือกยูนิตธรรมดาเกรด 2 ขึ้นไปจากดรอปของคุณได้สูงสุด 2 ใบ แล้ววางไว้บนเด็คตามลำดับที่ต้องการ จากนั้นนำการ์ดนี้ไปวางที่โซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/119';
UPDATE cards SET skill_text_th = 'เลือก "มังกรเรือธง แฟล็กเบิร์ก ดราก้อน" ที่ (V) หรือ (R) ของคุณ 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +20000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/120';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา"
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าทำโอเวอร์เดรสแล้ว ให้นำการ์ดทั้งหมดที่มีชื่อ "ทริกสตา" และมีความสามารถ [โอเวอร์เดรส] จากดรอปของคุณไปวางเป็นต้นกำเนิดเดรสของยูนิตนี้
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อแวนการ์ดของคุณแอทแทค โดยจ่าย [COST][โซลบลาสต์ (1)] ทำให้ยูนิตนี้สแตนด์ และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 ต่อต้นกำเนิดเดรส 1 ใบของยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/DSR01';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ ถ้ามียูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000
[ACT](V) เทิร์นละ 1 ครั้ง: โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), นำการ์ดที่มีชื่อ "เนอร์วานา" รวมอยู่จากมือหรือโซล 1 ใบไปวางที่ดรอป] เลือกยูนิตเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลไปที่ (R) จากนั้นเลือกแวนการ์ดของคู่ต่อสู้ 1 ใบ ถ้าดาเมจโซนของคู่ต่อสู้มี 4 ใบหรือน้อยกว่า ให้ดาเมจ 1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/DSR02';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ ถ้ามียูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000
[ACT](V) เทิร์นละ 1 ครั้ง: โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), นำการ์ดที่มีชื่อ "เนอร์วานา" รวมอยู่จากมือหรือโซล 1 ใบไปวางที่ดรอป] เลือกยูนิตเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลไปที่ (R) จากนั้นเลือกแวนการ์ดของคู่ต่อสู้ 1 ใบ ถ้าดาเมจโซนของคู่ต่อสู้มี 4 ใบหรือน้อยกว่า ให้ดาเมจ 1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/DSR03';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกยูนิตเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลไปที่ (R) ในแนวตั้งเดียวกับยูนิตนี้ และในเทิร์นนั้นยูนิตนี้จะได้รับความสามารถ "บูสต์"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H01';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดที่มีความสามารถ [โอเวอร์เดรส] จากดรอปของคุณได้สูงสุด 1 ใบ แล้วเพิ่มเข้ามือ ถ้าแวนการ์ดของคุณเกรด 4 ให้เคาน์เตอร์ชาร์จ (1) เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H02';
UPDATE cards SET skill_text_th = '[AUTO] เรียร์การ์ดแถวหลัง(R) เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดของคู่ต่อสู้ถอยในเทิร์นของคุณ ทำให้ยูนิตนี้สแตนด์ และในเทิร์นนั้นพาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H03';
UPDATE cards SET skill_text_th = 'อุปกรณ์เทพฝั่งซ้าย - "นางพรหมจารีผู้สยบเปลวเพลิง บาวซาการะ"
สามารถเล่นได้โดยจ่าย [COST][โซลบลาสต์ (1)]!
[AUTO](V): เมื่อยูนิตที่ติดตั้งการ์ดนี้แอทแทค โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (2)] ระหว่างการต่อสู้นั้น ไดรฟ์ของยูนิตที่ติดตั้งอยู่ +1 เมื่อจบการต่อสู้นั้น ให้นำการ์ดนี้ไปวางที่ดรอป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H04';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][โซลบลาสต์ (1)]!
เลือกยูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] 1 ใบ แล้วในเทิร์นนั้นมอบความสามารถ "[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ด เคาน์เตอร์ชาร์จ (1)" ให้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H05';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][ทิ้งการ์ดอุปกรณ์จากมือ 1 ใบ] จั่ว 1 ใบ และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป โดยจ่าย [COST][โซลบลาสต์ (1)] ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H07';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้บูสต์ "นางพรหมจารีแห่งเปลวเพลิง โซนญ่า" โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ถอยเรียร์การ์ดทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้ จากนั้นค้นหาการ์ดยูนิตที่เกรดสูงกว่าแวนการ์ดของคุณ 1 ขั้นขึ้นไปจากเด็คได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H08';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ พาวเวอร์ของยูนิตนี้ +2000 ต่อการ์ดที่อยู่ที่ (V) ของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H09';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (2)]!
เลือกการ์ดอุปกรณ์จากดรอปของคุณ 2 ใบ แล้วเพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H10';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "ผู้ปกครองแรงโน้มถ่วง บาโรว์แม็กเนส" โดยจ่าย [COST][นำการ์ดจากมือ 1 ใบไปวางที่โซล] ในเทิร์นนั้นพาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +5000 ถ้าโซลของคุณมี 10 ใบขึ้นไป ให้เป็น +10000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H11';
UPDATE cards SET skill_text_th = '[AUTO][โซล]: เมื่อ "มาร์มังกรโลภะ กรีดอน" ออกมาที่ (V) ของคุณ โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] นำการ์ดนี้ไปคอลที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H12';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิต โดยจ่าย [COST][ถอยยูนิตนี้] เลือกยูนิตเกรด 1 จากโซลของคุณ 1 ใบ แล้วคอลไปที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H13';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" พาวเวอร์ของยูนิตนี้ +5000 ต่อโซลของคุณ 3 ใบ ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H14';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][ทิ้งการ์ดจากมือ 1 ใบ]!
เคาน์เตอร์ชาร์จ (1) ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" ให้จั่ว 2 ใบ แล้วเลือกจากมือ 2 ใบ คอลไปที่ (R) และในเทิร์นนั้นพาวเวอร์ของยูนิตเหล่านั้น +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H15';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้าแวนการ์ดของคุณคือ "มาร์มังกรโลภะ กรีดอน" โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] เลือกยูนิตเกรด 3 หรือต่ำกว่าจากโซลของคุณ 1 ใบ แล้วคอลไปที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H16';
UPDATE cards SET skill_text_th = '[CONT](G): ถ้าโซลของคุณมียูนิตเกรด 3 อยู่ 2 ใบขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H17';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิตแวนการ์ด โซลชาร์จ (2) ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" เลือกยูนิตของคุณ 1 ใบ แล้วในเทิร์นนั้นพาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H18';
UPDATE cards SET skill_text_th = '[ACT](R): ถ้าแวนการ์ดของคุณมีชื่อ "บรูซ" รวมอยู่ โดยจ่าย [COST][นำยูนิตนี้ไปวางที่โซล] เลือกแวนการ์ดของคุณ 1 ใบ แล้วในเทิร์นนั้นพาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H19';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][โซลบลาสต์ (4)]!
เลือกแวนการ์ดของคุณ 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +5000 ต่อการ์ดในดาเมจโซนของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H20';
UPDATE cards SET skill_text_th = '[AUTO] เรียร์การ์ดแถวหน้า(R) เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดของคู่ต่อสู้ออกมาจากที่ไม่ใช่มือ ทำให้ยูนิตนั้นเรสต์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H21';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้บูสต์โทเคนทหารเงาราตรี นำโทเคนทหารเงาราตรี 1 ใบมาคอลที่ (R) ที่ยูนิตนี้อยู่แบบเรสต์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H22';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิต เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H23';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
เลือกยูนิตของคุณ 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +10000 ต่อโทเคนทหารเงาราตรีของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H24';
UPDATE cards SET skill_text_th = '[CONT]: เมื่อความสามารถของแวนการ์ดของคุณนับจำนวนการ์ดอุกกาบาตที่ถูกนำจากออร์เดอร์โซนไปวางที่ดรอปเป็นคอสต์ ให้นับการ์ดนี้เป็น 2 ใบ
[AUTO]: เมื่อการ์ดนี้ถูกนำจากออร์เดอร์โซนไปวางที่ดรอป ให้ไบนด์การ์ดนี้ แล้วเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H25';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] คู่ต่อสู้เลือกการ์ดจากมือของตนเอง 1 ใบ แล้วนำไปคุมขังในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H26';
UPDATE cards SET skill_text_th = '[CONT](R): โทเคนทหารเงาราตรีของคุณไม่สามารถถูกเลือกได้ด้วยเอฟเฟกต์ของการ์ดคู่ต่อสู้ และไม่ถอยด้วยเอฟเฟกต์ของการ์ดคู่ต่อสู้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H27';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้ามีการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณ 1 ใบขึ้นไป ยูนิตนี้จะได้รับ "บูสต์" และสามารถอินเตอร์เซ็ปต์ได้แม้อยู่แถวหลัง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H28';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคของยูนิตนี้ฮิต ค้นหาการ์ดอุกกาบาตจากเด็คหรือดรอปของคุณได้สูงสุด 1 ใบ แล้ววางที่ออร์เดอร์โซน ถ้าค้นจากเด็ค ให้สับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H29';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าออร์เดอร์โซนของคุณมีการ์ดอุกกาบาต 3 ใบขึ้นไป โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] จั่ว 1 ใบ แล้วเลือกการ์ดอุกกาบาตจากมือของคุณได้สูงสุด 1 ใบ แล้ววางที่ออร์เดอร์โซน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H30';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าไม่มีเรียร์การ์ดอื่น ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 และเมื่อจบการต่อสู้นั้น ทำให้ยูนิตนี้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H31';
UPDATE cards SET skill_text_th = '[CONT](R): ในเทิร์นของคุณ ถ้าแวนการ์ดของคุณคือ "ดาบข้ามจุดสูงสุด บาสเตียน ไพรม์" พาวเวอร์ของยูนิตนี้ +5000
[AUTO](R): เมื่อยูนิตนี้สแตนด์ด้วยเอฟเฟกต์ของการ์ดของคุณ ถ้าแวนการ์ดของคู่ต่อสู้เกรด 3 ขึ้นไป ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H32';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้ามีการ์ดหงายอยู่ในดาเมจโซนของคุณ โดยจ่าย [COST][นำการ์ดทริกเกอร์ยูนิตจากมือ 1 ใบไปวางคว่ำในดาเมจโซน] เลือกการ์ดจากดาเมจโซนที่หงายอยู่ของคุณ 1 ใบ แล้วเพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H33';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าไม่มียูนิตอื่นอยู่ในแนวตั้งเดียวกับยูนิตนี้ พาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H34';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ โดยจ่าย [COST][โซลบลาสต์ (1)] นำการ์ดนี้ไปคอลที่ (R) แถวหลังแบบเรสต์
[CONT](R): ถ้ายูนิตนี้สแตนด์อยู่ ยูนิตนี้จะได้รับ "อินเตอร์เซ็ปต์" และสามารถอินเตอร์เซ็ปต์ได้แม้อยู่แถวหลัง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H35';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของแวนการ์ดของคุณ เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ แล้วในเทิร์นนั้นพาวเวอร์ของยูนิตนั้น +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H36';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกวางที่ (G) เลือกยูนิตของคุณที่เกรด 2 ขึ้นไปและกำลังถูกแอทแทค 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +10000 ถ้าเลือกยูนิตเกรด 4 ให้เป็น +20000 แทน +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H37';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งลูกแก้วหกเหลี่ยม" หรือ "นักเวทย์หญิงแห่งแสงประกายห้าเหลี่ยม" โดยจ่าย [COST][ทิ้งการ์ดจากมือ 1 ใบ] เปิดดูการ์ดบนสุดของเด็คของคุณ 2 ใบ เลือกได้สูงสุด 2 ใบวางไว้บนเด็คตามลำดับที่ต้องการ ส่วนที่เหลือวางไว้ใต้เด็คตามลำดับที่ต้องการ ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H38';
UPDATE cards SET skill_text_th = '[CONT](R)/โซนทริกเกอร์: ถ้าแวนการ์ดของคุณคือ "ดาบข้ามจุดสูงสุด บาสเตียน ไพรม์" เกรดของการ์ดนี้ +2 / พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H39';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
เปิดดูการ์ดบนสุดของเด็คของคุณ 1 ใบ แล้วนำไปวางไว้บนหรือใต้เด็ค จากนั้นจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H40';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) แถวหลัง คุณสามารถให้พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้นได้ ถ้าทำ ในเทิร์นนั้นยูนิตนี้จะไม่สามารถย้ายไปยัง (R) อื่นได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H41';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณคือ "มังกรเรือธง แฟล็กเบิร์ก ดราก้อน" ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H42';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อการแอทแทคที่ยูนิตนี้บูสต์ฮิตแวนการ์ด โดยจ่าย [COST][ไบนด์การ์ดออร์เดอร์จากดรอป 1 ใบ] เลือกการ์ดออร์เดอร์จากดรอปของคุณ 1 ใบ แล้วเพิ่มเข้ามือ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H43';
UPDATE cards SET skill_text_th = '[CONT] เรียร์การ์ดแถวหลัง(R): ระหว่างการต่อสู้ที่ยูนิตนี้แอทแทค คู่ต่อสู้ไม่สามารถคอลจากมือไปที่ (G) ได้ เว้นแต่จะคอลพร้อมกัน 2 ใบขึ้นไป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H44';
UPDATE cards SET skill_text_th = 'สามารถเล่นได้โดยจ่าย [COST][โซลบลาสต์ (1)]!
จั่ว 1 ใบ เลือกยูนิตของคุณ 1 ใบ ระหว่างการต่อสู้นั้นพาวเวอร์ +5000 ต่อชื่อการ์ดออร์เดอร์ที่แตกต่างกัน 1 ชื่อ จากดรอปและไบนด์โซนของคุณรวมกัน', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H45';
UPDATE cards SET skill_text_th = '[AUTO][ดรอป]: เมื่อแวนการ์ดเกรด 3 ขึ้นไปของคุณออกมา คุณสามารถคอลการ์ดนี้ไปที่ (R) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H46';
UPDATE cards SET skill_text_th = '[CONT](V)/(R): มอบความสามารถ "บูสต์" ให้กับยูนิตอื่นทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H47';
UPDATE cards SET skill_text_th = '[ACT](R): โดยจ่าย [COST][ถอยยูนิตนี้] เลือกเรียร์การ์ดของคุณ 1 ใบ ในเทิร์นนั้นพาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H48';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) หรือ (R) หรือถูกวางที่ (G) โดยจ่าย [COST][โซลบลาสต์ (1), ทิ้งการ์ดออร์เดอร์จากมือ 1 ใบ] จั่ว 1 ใบ และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000/ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H49';
UPDATE cards SET skill_text_th = 'คู่ต่อสู้เลือกเรียร์การ์ดของตนเอง 1 ใบ แล้วถอย จากนั้นคุณเลือกยูนิตที่มีเกรดเท่ากับยูนิตที่คู่ต่อสู้ถอยไปจากดรอปของคุณได้สูงสุด 1 ใบ แล้วคอลไปที่ (R)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/H50';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา"
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้าทำโอเวอร์เดรสแล้ว ให้นำการ์ดทั้งหมดที่มีชื่อ "ทริกสตา" และมีความสามารถ [โอเวอร์เดรส] จากดรอปของคุณไปวางเป็นต้นกำเนิดเดรสของยูนิตนี้
[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อแวนการ์ดของคุณแอทแทค โดยจ่าย [COST][โซลบลาสต์ (1)] ทำให้ยูนิตนี้สแตนด์ และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 ต่อต้นกำเนิดเดรส 1 ใบของยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP01';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ ถ้ามียูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +10000
[ACT](V) เทิร์นละ 1 ครั้ง: โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), นำการ์ดที่มีชื่อ "เนอร์วานา" รวมอยู่จากมือหรือโซล 1 ใบไปวางที่ดรอป] เลือกยูนิตเกรด 0 จากดรอปของคุณ 1 ใบ แล้วคอลไปที่ (R) จากนั้นเลือกแวนการ์ดของคู่ต่อสู้ 1 ใบ ถ้าดาเมจโซนของคู่ต่อสู้มี 4 ใบหรือน้อยกว่า ให้ดาเมจ 1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP02';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) กลางแถวหลังจากดรอป เคาน์เตอร์ชาร์จ (1)
[เดรสบูสต์] - [AUTO](R): เมื่อยูนิตนี้บูสต์ ระหว่างการต่อสู้นั้นพาวเวอร์ของยูนิตที่ถูกบูสต์ +10000 ต่อการ์ดที่ "นางพรหมจารีผู้สยบเปลวเพลิง บาวซาการะ" ของคุณติดตั้งอยู่ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP03';
UPDATE cards SET skill_text_th = '[AUTO](V): เมื่อเริ่มไรด์เฟสของคุณ ในเทิร์นนั้นคุณจะเข้าสู่สถานะ "อิคคิคาเซ"
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (5)] ทำให้ยูนิตแถวหน้าทั้งหมดของคุณสแตนด์ และในเทิร์นนั้นไดรฟ์ของยูนิตนี้ -2', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP04';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อเรียร์การ์ดอื่นของคุณถูกนำไปวางที่โซลด้วยความสามารถของแวนการ์ดของคุณในเทิร์นของคุณ โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดจากมือของคุณ 1 ใบ แล้วคอลไปที่ (R) ที่ไม่มียูนิตอยู่ ถ้าโซลของคุณมี 10 ใบขึ้นไป ให้จั่วเพิ่มอีก 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP05';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โซลชาร์จ (1)
[AUTO](R): เมื่อการ์ดของคุณถูกนำไปวางที่โซลด้วยโซลชาร์จ ถ้าแวนการ์ดของคุณเกรด 3 ขึ้นไป ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์การ์ดที่มีชื่อ "เซรัส" รวมอยู่ (1)] คู่ต่อสู้เลือกจากมือ เรียร์การ์ด และโซลของตนเองอย่างละ 2 ใบ แล้วนำไปคุมขังในคุกของคุณ
[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +5000 ต่อการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณทุก 2 ใบ ถ้ามี 10 ใบขึ้นไป คริติคอลของยูนิตแถวหน้าทั้งหมดของคุณ +1 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP07';
UPDATE cards SET skill_text_th = '[ACT](R): โดยจ่าย [COST][ถอยโทเคนทหารเงาราตรี 1 ใบ] ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +10000 ถ้านี่เป็นการใช้ความสามารถนี้ครั้งที่ 3 ในเทิร์นนี้ ในเทิร์นนั้นคริติคอลของยูนิตนี้ +1 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP08';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][โซลบลาสต์ (1)] เลือกการ์ดอุกกาบาตจากดรอปของคุณ 1 ใบ แล้ววางที่ออร์เดอร์โซน
[CONT](R): ในเทิร์นของคุณ ถ้ามีเรียร์การ์ดของคู่ต่อสู้ถอยไปในเทิร์นนี้ พาวเวอร์ของยูนิตนี้ +5000 และถ้าถอยไป 3 ใบขึ้นไป คริติคอล +1 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP09';
UPDATE cards SET skill_text_th = '[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +2000
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกการ์ดเกรด 3 ขึ้นไป โดยจ่าย [COST][นำการ์ดที่มีชื่อ "บาสเตียน" รวมอยู่จากมือหรือโซล 1 ใบไปวางที่ดรอป] ทำให้เรียร์การ์ดเกรด 3 ทั้งหมดของคุณสแตนด์ และในเทิร์นนั้นพาวเวอร์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP10';
UPDATE cards SET skill_text_th = '[ACT](R): โดยจ่าย [COST][โซลบลาสต์ (1), ทำให้ยูนิตนี้เรสต์] เปิดดูการ์ดบนสุดของเด็คของคุณ 3 ใบ เลือกการ์ดยูนิตเกรด 3 ขึ้นไปที่มีชื่อต่างจากยูนิตนี้ได้สูงสุด 1 ใบ แล้วคอลไปที่ (R) ส่วนที่เหลือวางไว้ใต้เด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP11';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกทริกเกอร์ยูนิต ถ้าแวนการ์ดของคุณคือ "นักเวทย์หญิงแห่งลูกแก้วหกเหลี่ยม" โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] เลือกเรียร์การ์ดอื่นของคุณ 1 ใบ แล้วทำให้สแตนด์ จากนั้นถอยยูนิตนี้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP12';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (V) คุณสามารถเลือกการ์ดจากโซลของคุณ 1 ใบ แล้วคอลไปที่ (R) ได้
[CONT](V): ถ้ามีการ์ดที่มีชื่อ "แมกโนเลีย" รวมอยู่ในโซลหรือ (R) ของคุณ 1 ใบขึ้นไป เรียร์การ์ดทั้งหมดของคุณสามารถแอทแทคและอินเตอร์เซ็ปต์ได้แม้อยู่แถวหลัง และพาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP13';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทคแวนการ์ดเกรด 3 ขึ้นไป ถ้าเป็นการต่อสู้ครั้งที่ 1 ในเทิร์นนี้ และแวนการ์ดของคุณคือ "มังกรเรือธง แฟล็กเบิร์ก ดราก้อน" โดยจ่าย [COST][โซลบลาสต์ (1)] ทำให้ยูนิตนี้สแตนด์
[AUTO](R): เมื่อจบเทิร์นของคุณ ถ้ามีการแอทแทครวมกัน 4 ครั้งขึ้นไปในเทิร์นนี้ โดยจ่าย [COST][นำยูนิตนี้ไปวางที่โซล] จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP14';
UPDATE cards SET skill_text_th = '[AUTO][ดรอป]: เมื่อคุณเล่นการ์ดออร์เดอร์ธรรมดา คุณสามารถคอลการ์ดนี้ไปที่ (R) ได้ ถ้าทำ ให้เลือกทำ 1 อย่างจากด้านล่างนี้ ถ้าคุณสังเคราะห์เวทย์แล้ว ให้ทำทั้งหมดแทนที่จะเลือกทำเพียง 1 อย่าง
- ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +10000
- ในเทิร์นนั้นคริติคอลของยูนิตนี้ +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP15';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ถ้ามีการ์ดอุปกรณ์อยู่ที่ (V) ของคุณ 1 ใบ โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เลือกการ์ดอุปกรณ์จากมือหรือดรอปของคุณ 1 ใบ แล้วติดตั้งให้กับแวนการ์ดของคุณ 1 ใบ
[CONT](R): ในเทิร์นของคุณ ถ้ามีการ์ดอุปกรณ์อยู่ที่ (V) ของคุณ 2 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP16';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: ถ้ามีเรียร์การ์ดของคู่ต่อสู้ถอยไปในเทิร์นนี้ โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] โซลชาร์จ (1) แล้วเลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้วถอย และในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP17';
UPDATE cards SET skill_text_th = 'อุปกรณ์เทพฝั่งขวา - "นางพรหมจารีผู้สยบเปลวเพลิง บาวซาการะ"
สามารถเล่นได้โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)]!
[AUTO](V): เมื่อการ์ดนี้ถูกติดตั้ง จั่ว 1 ใบ และในเทิร์นนี้คุณสามารถเล่นการ์ดอุปกรณ์เพิ่มได้อีก 1 ใบ
[CONT](V): ในเทิร์นของคุณ พาวเวอร์ของยูนิตที่ติดตั้งการ์ดนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP18';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ในเมนเฟสของคุณ โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] เปิดดูการ์ดบนสุดของเด็คของคุณ 1 ใบ แล้วคอลไปที่ (R) เมื่อจบเทิร์นนั้น ให้ถอยยูนิตที่ถูกคอลนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP19';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) ให้ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนโซลของคุณ
- 7 ใบขึ้นไป - โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] เลือกการ์ดจากโซลของคุณ 1 ใบ แล้วเพิ่มเข้ามือ จากนั้นโซลชาร์จ (1)
- 13 ใบขึ้นไป - ในเทิร์นนั้นพาวเวอร์ของยูนิตแถวหน้าทั้งหมดของคุณ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP20';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 ถ้าคุณอยู่ในสถานะ "อิคคิคาเซ" ให้โซลชาร์จ (2) เพิ่มอีก แล้วเลือกการ์ดจากโซล 1 ใบ แล้วคอลไปที่ (R) ที่ไม่มียูนิตอยู่', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP21';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าโลกของคุณคือราตรีดำหรือราตรีดำขั้นเหวลึก ยูนิตนี้จะได้รับ "บูสต์" และสามารถอินเตอร์เซ็ปต์ได้แม้อยู่แถวหลัง
[CONT](G): ถ้าโลกของคุณคือราตรีดำขั้นเหวลึก ชิลด์ของยูนิตนี้ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP22';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: โดยจ่าย [COST][โซลบลาสต์ (2)] เลือกการ์ดอุกกาบาตจากดรอปของคุณได้สูงสุด 5 ใบ แล้วนำกลับเข้าเด็คและสับเด็ค ถ้านำกลับ 1 ใบขึ้นไป ในเทิร์นนั้นพาวเวอร์ของยูนิตนี้ +5000 ถ้านำกลับ 3 ใบขึ้นไป พาวเวอร์ +5000 เพิ่มอีก และถ้านำกลับครบ 5 ใบ พาวเวอร์ +5000 เพิ่มอีก', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP23';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าแวนการ์ดของคุณมีชื่อ "เซรัส" รวมอยู่ พาวเวอร์ของยูนิตนี้ +5000
[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากมือ ถ้ามีการ์ดของคู่ต่อสู้ที่ถูกคุมขังอยู่ในคุกของคุณ 3 ใบขึ้นไป ค้นหาการ์ดชื่อเดียวกับยูนิตนี้จากเด็คได้สูงสุด 1 ใบ แล้วคอลไปที่ (R) จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP24';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตของคุณแอทแทค โดยจ่าย [COST][เคาน์เตอร์บลาสต์ (1)] ให้ทำสิ่งต่อไปนี้ทั้งหมดตามทริกเกอร์ยูนิตที่ออกจากไดรฟ์เช็คในการต่อสู้นั้น
- [คริติคอลทริกเกอร์] - เลือกเรียร์การ์ดของคู่ต่อสู้ 1 ใบ แล้ววางไว้ใต้เด็ค
- [ฟรอนต์ทริกเกอร์] - เลือกเรียร์การ์ดเกรด 2 หรือต่ำกว่าของคุณ 1 ใบ แล้วทำให้สแตนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP25';
UPDATE cards SET skill_text_th = '[AUTO] เรียร์การ์ดแถวหน้า(R): เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของแวนการ์ดของคุณ โดยจ่าย [COST][โซลบลาสต์ (2)] จั่ว 1 ใบ
[CONT] เรียร์การ์ดแถวหลัง(R): ในเทิร์นของคุณ พาวเวอร์ของเรียร์การ์ดอื่นทั้งหมดของคุณที่อยู่ในแนวตั้งเดียวกับยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP26';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) จากมือ ถ้าแวนการ์ดของคุณมีชื่อ "บลาสเตอร์" รวมอยู่ โดยจ่าย [COST][ทิ้งการ์ดจากมือ 1 ใบ] เปิดดูการ์ดบนสุดของเด็คของคุณ 2 ใบ เลือกการ์ดยูนิตได้สูงสุด 2 ใบ แล้วคอลไปที่ (R) แบบเรสต์ ส่วนที่เหลือทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP27';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ออกมาที่ (R) โดยจ่าย [COST][โซลบลาสต์ (1)] เลือก "สัตว์เขาไม้ แพนเทโร" จากดรอปของคุณ 1 ใบ แล้วคอลไปที่ (R) ที่ไม่มียูนิตอยู่
[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีชื่อ "แมกโนเลีย" รวมอยู่ ระหว่างการต่อสู้นั้นพาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP28';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบเทิร์นของคุณ ถ้าเทิร์นนี้คุณเล่นออเดอร์ด้วยแมจิกฟิวชัน หรือแอทแทครวมกันตั้งแต่ 5 ครั้งขึ้นไป [COST][วางยูนิตนี้ลงโซล] แล้วใช้เคาน์เตอร์ชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP29';
UPDATE cards SET skill_text_th = '[COST][ทิ้งการ์ดออเดอร์จากมือ 1 ใบ] แล้วเล่นได้!
เลือกเกรด 3 ที่มีชื่อ "โซรุกะ" จากไรด์เด็คของคุณ 1 ใบ แล้วเปิดเผยได้ ถ้าเปิดเผยแล้ว หรือแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไปที่มีชื่อ "โซรุกะ" ให้เลือกแวนการ์ดของคุณ 1 ใบ ไดรฟ์+1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP30';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP31';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP32';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP33';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP34';
UPDATE cards SET skill_text_th = '[CONT][(G)]: ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP35';
UPDATE cards SET skill_text_th = '[AUTO][(V)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้ถูกอีควิป ให้โซลชาร์จ (1) แล้วเลือกเกรด 1 หรือน้อยกว่าจากดรอปของคุณ 1 ใบ คอลลง (R)
[ACT][(V)] เทิร์นละ 1 ครั้ง: ถ้ายูนิตนี้มีการ์ดอีควิป 2 ใบขึ้นไป [COST][โซลบลาสต์ (2)] แล้วถอยเรียร์การ์ดแถวหน้าของฝ่ายตรงข้ามทั้งหมด คริติคอลของยูนิตนี้ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP36';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "มังกรเพลิงผนึก นาโมคารุ" แล้วปรากฏตัวที่ (V) เลือกการ์ดอีควิปจากดรอปของคุณ 1 ใบ เพิ่มเข้ามือ
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณติดอีควิปอยู่ พาวเวอร์ของยูนิตนี้ +5000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP37';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "มังกรเพลิงผนึก อาฮินสา" แล้วปรากฏตัวที่ (V) [COST][โซลบลาสต์ (1)] แล้วค้นหาการ์ดชื่อ "ดาบเพลิงผนึก ปริถวี" หรือ "โล่เพลิงผนึก สวยัมภู" จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค พาวเวอร์ของยูนิตนี้ +2000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP38';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP39';
UPDATE cards SET skill_text_th = 'อุปกรณ์เทพขวา - "นักบวชหญิงแห่งเพลิงผนึก บาวซาการะ"
[COST][โซลบลาสต์ (1)] แล้วเล่นได้!
[AUTO][(V)]: เมื่อยูนิตที่ติดการ์ดนี้แอทแทค พาวเวอร์ของยูนิตที่ติดอยู่นั้น +10000 ในระหว่างการต่อสู้นั้น ตอนจบการต่อสู้นั้น ถ้าดาเมจโซนของฝ่ายตรงข้ามมี 4 ใบหรือน้อยกว่า [COST][เคาน์เตอร์บลาสต์ (2), วางการ์ดนี้ลงดรอป] แล้วเลือกแวนการ์ดของฝ่ายตรงข้าม 1 ใบ สร้าง 1 ดาเมจ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP40';
UPDATE cards SET skill_text_th = 'อุปกรณ์เทพซ้าย - "นักบวชหญิงแห่งเพลิงผนึก บาวซาการะ"
[COST][เคาน์เตอร์บลาสต์ (1)] แล้วเล่นได้!
[AUTO][(V)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตที่ติดการ์ดนี้ถูกแอทแทค พาวเวอร์ของยูนิตที่ติดอยู่นั้น +10000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP41';
UPDATE cards SET skill_text_th = 'อุปกรณ์เทพซ้าย - "นักบวชหญิงแห่งเพลิงผนึก บาวซาการะ"
[COST][โซลบลาสต์ (1)] แล้วเล่นได้!
[AUTO][(V)]: เมื่อยูนิตที่ติดการ์ดนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (2)] แล้วไดรฟ์ของยูนิตที่ติดอยู่ +1 ในระหว่างการต่อสู้นั้น ตอนจบการต่อสู้นั้น วางการ์ดนี้ลงดรอป', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP42';
UPDATE cards SET skill_text_th = '[CONT]: เมื่อความสามารถของแวนการ์ดของคุณนับจำนวนการ์ดอุกกาบาตที่ถูกวางลงดรอปจากออเดอร์โซนด้วยคอสต์นั้น ให้นับการ์ดนี้เป็น 2 ใบ
[AUTO]: เมื่อการ์ดนี้ถูกวางลงดรอปจากออเดอร์โซน ไบนด์การ์ดนี้ แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP43';
UPDATE cards SET skill_text_th = '[โอเวอร์เดรส] - "ทริกสตา"
[AUTO][(R)]: เมื่อยูนิตนี้ในสถานะ [โอเวอร์เดรส] แอทแทคแวนการ์ด พาวเวอร์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น และ [COST][โซลบลาสต์ (2)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP44';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1)] แล้วเล่นได้!
จั่ว 1 ใบ เลือกการ์ดจากมือของคุณ 1 ใบ คอลลง (R) จากนั้นถ้าคุณคือ "อิคคิคาเซ" พาวเวอร์ของยูนิตแถวหน้าของคุณทั้งหมด +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP45';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าการ์ดของฝ่ายตรงข้ามที่ถูกคุมขังอยู่ในคุกของคุณมี 1 ใบหรือน้อยกว่า [COST][เรสต์ยูนิตนี้] แล้วเลือกการ์ดยูนิตจากดรอปของฝ่ายตรงข้าม 1 ใบ คุมขังไว้ในคุกของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP46';
UPDATE cards SET skill_text_th = '[COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเล่นได้!
ทำสิ่งต่อไปนี้ทั้งหมดตามจำนวนยูนิตเกรด 3 ของคุณ
- 2 ใบขึ้นไป - เลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น
- 3 ใบขึ้นไป - จั่ว 1 ใบ
- 4 ใบขึ้นไป - เลือกแวนการ์ดของคุณ 1 ใบ ไดรฟ์ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP48';
UPDATE cards SET skill_text_th = '[CONT]: การ์ดนี้ไม่สามารถไรด์ได้ และไม่สามารถคอลได้นอกจากแถวหลังตรงกลาง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP49';
UPDATE cards SET skill_text_th = '[COST][โซลบลาสต์ (1)] แล้วเล่นได้!
เลือกเกรดเท่ากับหรือต่ำกว่าแวนการ์ดของคุณจากดรอปของคุณ 1 ใบ คอลลง (R) พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP50';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ในเทิร์นของคุณ ถ้ามียูนิตของคุณที่อยู่ในสถานะ [โอเวอร์เดรส] พาวเวอร์ของยูนิตแถวหน้าของคุณทั้งหมด +10000
[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1), วางการ์ดที่มีชื่อ "นิรวานะ" จากมือหรือโซลลงดรอป 1 ใบ] แล้วเลือกเกรด 0 จากดรอปของคุณ 1 ใบ คอลลง (R) เลือกแวนการ์ดของฝ่ายตรงข้าม 1 ใบ ถ้าดาเมจโซนของฝ่ายตรงข้ามมี 4 ใบหรือน้อยกว่า สร้าง 1 ดาเมจ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SSR01';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: ตอนเริ่มไรด์เฟสของคุณ ในเทิร์นนั้นคุณจะกลายเป็น "อิคคิคาเซ"
[AUTO][(V)] เทิร์นละ 1 ครั้ง: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าคุณคือ "อิคคิคาเซ" [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (5)] แล้วสแตนด์ยูนิตแถวหน้าของคุณทั้งหมด ไดรฟ์ของยูนิตนี้ -2 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SSR02';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (V) [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์การ์ดที่มีชื่อ "เซราส" (1)] แล้วให้ฝ่ายตรงข้ามเลือกจากมือ เรียร์การ์ด และโซลของตัวเองอย่างละ 2 ใบ นำไปคุมขังไว้ในคุกของคุณ
[CONT][(V)]: ในเทิร์นของคุณ ทุกๆ 2 ใบของการ์ดฝ่ายตรงข้ามที่ถูกคุมขังอยู่ในคุกของคุณ พาวเวอร์ของยูนิตแถวหน้าของคุณทั้งหมด +5000 ถ้ามี 10 ใบขึ้นไป คริติคอลของยูนิตแถวหน้าของคุณทั้งหมด +1', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SSR03';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ในเทิร์นของคุณ พาวเวอร์ของยูนิตแถวหน้าของคุณทั้งหมด +2000
[AUTO][(V)] เทิร์นละ 1 ครั้ง: ตอนจบการต่อสู้ที่ไดรฟ์เช็คของคุณออกเกรด 3 ขึ้นไป [COST][วางการ์ดที่มีชื่อ "บาสเตียน" จากมือหรือโซลลงดรอป 1 ใบ] แล้วสแตนด์เรียร์การ์ดเกรด 3 ของคุณทั้งหมด พาวเวอร์ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SSR04';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (V) เลือกจากโซลของคุณ 1 ใบ คอลลง (R) ได้
[CONT][(V)]: ถ้ามีการ์ดที่มีชื่อ "แมกโนเลีย" ในโซลหรือ (R) ของคุณ 1 ใบขึ้นไป เรียร์การ์ดของคุณทั้งหมดสามารถแอทแทคและอินเตอร์เซ็ปต์ได้แม้จากแถวหลัง และพาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SSR05';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ในเทิร์นของคุณ ถ้ามี "ดราโกนิค โอเวอร์ลอร์ด" อยู่ในโซลของคุณ ไดรฟ์ของยูนิตนี้จะไม่ลดลงจากเอฟเฟกต์การ์ด และพาวเวอร์ +5000
[AUTO][(V)] เทิร์นละ 1 ครั้ง: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 2 ใบ] แล้วสแตนด์ยูนิตนี้ ไดรฟ์ -1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/001';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][เคาน์เตอร์บลาสต์ (1)] แล้วดูเด็คของคุณ 7 ใบจากบนสุด เลือกการ์ดที่มีชื่อ "โอเวอร์ลอร์ด" ได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค ถ้าไม่ได้เปิดเผย ใช้เคาน์เตอร์ชาร์จ (1)
[AUTO][(R)]: เมื่อแวนการ์ดของคุณที่มีชื่อ "โอเวอร์ลอร์ด" แอทแทค พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/002';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ถ้ามี "แฟนทอม บลาสเตอร์ ดราก้อน" อยู่ในโซลของคุณ คริติคอลของยูนิตนี้ +1
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค [COST][ถอยเรียร์การ์ด 2 ใบ] แล้วเลือกการ์ดที่มีชื่อ "บลาสเตอร์ ดาร์ก" จากโซลหรือดรอปของคุณ 1 ใบ คอลลง (R) ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป พาวเวอร์ของยูนิตที่ถูกคอลและยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/003';
UPDATE cards SET skill_text_th = '[CONT][(V)]: ถ้ามี "บลาสเตอร์ เบลด" และ "บลาสเตอร์ ดาร์ก" อยู่ในโซลของคุณ พาวเวอร์ของยูนิตนี้ +2000 / คริติคอล +1 (มีผลแม้ในเทิร์นของฝ่ายตรงข้าม)
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด ทำสิ่งต่อไปนี้ทั้งหมด (จะใช้แค่อย่างเดียวก็ได้)
- [COST][วาง "บลาสเตอร์ เบลด" จาก (R) ลงโซล 1 ใบ] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย
- [COST][วาง "บลาสเตอร์ ดาร์ก" จาก (R) ลงโซล 1 ใบ] แล้วไดรฟ์ของยูนิตนี้ +1 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/004';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (V) [COST][เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย ถ้าไม่ได้ถอย จั่ว 1 ใบ
[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้ามที่เป็นเกรด 2 ขึ้นไป 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/005';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในเทิร์นของคุณ ถ้ามีแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" พาวเวอร์ของยูนิตนี้ +5000
[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ถ้าแคลนของแวนการ์ดของคุณเป็น "เชโดว์พาลาดิน" เท่านั้น [COST][เคาน์เตอร์บลาสต์ (1), วางการ์ดจากมือลงโซล 1 ใบ] แล้วจั่ว 2 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/006';
UPDATE cards SET skill_text_th = '[AUTO][(V)]: ตอนเริ่มไรด์เฟสของคุณ ในเทิร์นนั้นคุณจะได้รับ "พาวเวอร์ของยูนิตแถวหน้าของคุณทั้งหมด +5000"
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1)] แล้วทำอย่างใดอย่างหนึ่งต่อไปนี้
- เลือกจากโซลของคุณ 1 ใบ คอลลง (R)
- เลือกการ์ดที่มีชื่อ "ริริมิ" และการ์ดที่มีชื่อ "รารามิ" จากโซลของคุณอย่างละ 1 ใบ คอลลง (R)

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/007';
UPDATE cards SET skill_text_th = '[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] แล้วดูเด็คของคุณ 3 ใบจากบนสุด เลือก 1 ใบเพิ่มเข้ามือ เลือกการ์ดยูนิตได้สูงสุด 1 ใบ คอลลง (R) ส่วนที่เหลือวางลงโซล
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด ถ้าโซลของคุณมี 8 ชนิดขึ้นไป เลือกเรียร์การ์ดของคุณ 1 ใบ พาวเวอร์ +10000 ในเทิร์นนั้น ถ้ามี 13 ชนิดขึ้นไป เลือกเรียร์การ์ดของคุณทั้งหมดแทนที่จะเป็น 1 ใบ

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/008';
UPDATE cards SET skill_text_th = '[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1)] แล้วดูเด็คของคุณจากบนสุดเท่ากับจำนวนการ์ดวิจัยในออเดอร์โซนของคุณ เลือกได้สูงสุด 1 ใบเพิ่มเข้ามือ ส่วนที่เหลือวางกลับไว้ล่างเด็คตามลำดับที่ต้องการ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น
[AUTO][(V)]: เมื่อยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วค้นหาการ์ดที่มีชื่อ "ออบสคูเดท" จากเด็คหรือมือของคุณได้สูงสุด 1 ใบ คอลลง (R) ถ้าค้นจากเด็ค ให้สับเด็ค

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/009';
UPDATE cards SET skill_text_th = '[CONT]: ยูนิตนี้จะกลายเป็นเพอร์โซนาไรด์แม้ถูกนอร์มอลไรด์จากมือโดยยูนิตที่มีชื่อ "เทกุเรีย" ในชื่ออื่น
[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1)] แล้วดูเด็คของคุณ 5 ใบจากบนสุด เลือกการ์ดยูนิตเกรด 2 หรือน้อยกว่าได้สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค ถ้ามี "ผู้เบ่งบานในความมืดมิด เทกุเรีย" อยู่ในโซลของคุณ เลือกได้สูงสุด 2 ใบแทนที่จะเป็น 1 ใบ
[AUTO][(V)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าเทิร์นนี้ยูนิตนี้ปรากฏตัวโดยไรด์จาก "ผู้เบ่งบานในความมืดมิด เทกุเรีย" [COST][ทิ้งการ์ดจากมือ 1 ใบ] แล้วเลือกเรียร์การ์ดของคุณ 1 ใบ สแตนด์

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/010';
UPDATE cards SET skill_text_th = '[CONT]: ยูนิตนี้จะกลายเป็นเพอร์โซนาไรด์แม้ถูกนอร์มอลไรด์จากมือโดยยูนิตที่มีชื่อ "เทกุเรีย" ในชื่ออื่น
[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][ถอยเรียร์การ์ดเกรด 2 หรือน้อยกว่า 2 ใบ] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย ถ้ามี "ผู้ก้าวเดินบนทางแสงสว่าง เทกุเรีย" อยู่ในโซลของคุณ ถอยเรียร์การ์ดของฝ่ายตรงข้ามทั้งหมดในแถวเดียวกับยูนิตที่เลือกไว้
[AUTO][(V)] เทิร์นละ 1 ครั้ง: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค ถ้าเทิร์นนี้ยูนิตนี้ปรากฏตัวโดยไรด์จาก "ผู้ก้าวเดินบนทางแสงสว่าง เทกุเรีย" [COST][เคาน์เตอร์บลาสต์ (1), ทิ้งการ์ดจากมือ 1 ใบ] แล้วสแตนด์ยูนิตนี้ ไดรฟ์ -1 ในเทิร์นนั้น

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/011';
UPDATE cards SET skill_text_th = '[ACT][(V)] เทิร์นละ 1 ครั้ง: [COST][โซลบลาสต์ (1)] แล้วคอลโทเคนแพลนต์ได้สูงสุด 3 ใบลง (R) (แพลนต์คือเกรด 0 / พาวเวอร์ 5000 / คริติคอล 1 และมีความสามารถบูสต์)
[AUTO][(V)]: เมื่อยูนิตนี้ถูกแอทแทค [COST][ถอยยูนิตโทเคนตามจำนวนที่ต้องการตั้งแต่ 1 ใบขึ้นไป] แล้วทุกๆ 1 ใบที่ถอยด้วยคอสต์นี้ พาวเวอร์ของยูนิตนี้ +5000 ในระหว่างการต่อสู้นั้น

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/012';
UPDATE cards SET skill_text_th = '[ACT][(R)]: ถ้าคุณไม่มีโทเคนโมม็อกเกะ [COST][เคาน์เตอร์บลาสต์ (1)] แล้วคอลโทเคนโมม็อกเกะได้สูงสุด 1 ใบลง (R)

[นักแสวงหาประกาย] - โรโรวะ (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "โรโรวะ")
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค [COST][โซลบลาสต์ (1)] แล้วเลือกยูนิตโทเคนของคุณในแถวเดียวกับยูนิตนี้ 1 ใบ ยูนิตนี้จะได้รับพาวเวอร์ของยูนิตนั้นในระหว่างการต่อสู้นั้น (รวมถึงค่าที่เพิ่มขึ้นด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/013';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ถ้ามีเรียร์การ์ดของคุณที่มีชื่อ "รารามิ" [COST][โซลบลาสต์ (2)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ให้ฝ่ายตรงข้ามวางยูนิตนั้นลงโซลของตัวเอง

[นักแสวงหาประกาย] - ทามายุระ (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "ทามายุระ")
[AUTO]: เมื่อยูนิตนี้ถอยจาก (G) วางการ์ดนี้ลงโซลได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/014';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ถ้ามีเรียร์การ์ดของคุณที่มีชื่อ "ริริมิ" [COST][โซลบลาสต์ (2)] แล้วจั่ว 1 ใบ

[นักแสวงหาประกาย] - ทามายุระ (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "ทามายุระ")
[AUTO]: เมื่อยูนิตนี้ถอยจาก (G) วางการ์ดนี้ลงโซลได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/015';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้ามที่มีเกรดเท่ากับการ์ดที่ถูกโซลบลาสต์ด้วยคอสต์นี้ 1 ใบ ถอย

[นักแสวงหาประกาย] - เคออส (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "เคออส")
[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อแวนการ์ดของคุณแอทแทค ถ้าโซลของคุณมี 8 ชนิดขึ้นไป สแตนด์ยูนิตนี้ ถ้าทำแล้ว ตอนจบเทิร์นนั้น วางยูนิตนี้ลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/016';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้ามีเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ พาวเวอร์ของยูนิตนี้ +5000 ในระหว่างการต่อสู้นั้น และถ้ามีเซ็ตออเดอร์ 3 ใบขึ้นไป ให้เปลี่ยนเป็น +10000 แทน +5000

[นักแสวงหาประกาย] - เอวา (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "เอวา")
[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ด้วยความสามารถของการ์ด ถ้ามีการ์ดวิจัย 3 ใบขึ้นไปในออเดอร์โซนของคุณ คริติคอลของยูนิตนี้ +1 ในเทิร์นนั้น
[CONT][(R)/(G)]: ยูนิตนี้จะได้รับ "อินเตอร์เซ็ปต์" และชิลด์ +10000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/017';
UPDATE cards SET skill_text_th = '[AUTO][ดรอป]: เมื่อแวนการ์ดของคุณที่เป็นเกรด 3 ขึ้นไปปรากฏตัวในไรด์เฟส ถ้าไม่มียูนิตของคุณที่มีชื่อ "เมเปิล" คอลการ์ดนี้ลง (R) ได้ (ถ้าการ์ดนี้อยู่ในดรอป 2 ใบ จะคอลได้เพียง 1 ใบเท่านั้น)

[นักแสวงหาประกาย] - เทกุเรีย (มีผลถ้าแวนการ์ดของคุณเป็น [นักแสวงหาประกาย] ที่มีชื่อ "เทกุเรีย")
[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][โซลบลาสต์ตามจำนวนที่ต้องการตั้งแต่ 1 ใบขึ้นไป] แล้วเลือกการ์ดจากโซลของคุณที่มีเกรดเท่ากับผลรวมเกรดของการ์ดที่ถูกโซลบลาสต์ด้วยคอสต์นี้ 1 ใบ เพิ่มเข้ามือ แล้ววางยูนิตนี้ลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/018';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในระหว่างแบทเทิลเฟสของคุณ วางการ์ดนี้ลงโซล แล้วเลือกยูนิตของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/019';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ดูเด็คของคุณ 7 ใบจากบนสุดได้ ถ้าทำแล้ว เลือกยูนิตธรรมดา (นอร์มอลยูนิต) ที่เป็น [นักแสวงหาประกาย] หรือมีชื่อ "นินจา" จากที่ดูได้สูงสุด 1 ใบ วางลงโซล แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/020';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคหรือบูสต์ [COST][โซลบลาสต์ (1)] แล้วทุกๆ เรียร์การ์ดอื่นของคุณที่เป็นเกรด 1 หรือน้อยกว่า 1 ใบ พาวเวอร์ของยูนิตนี้ +5000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/021';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคได้แอทแทคมาแล้ว 2 ครั้งขึ้นไปในเทิร์นนี้ ชิลด์ของยูนิตนี้ +15000 ในระหว่างการต่อสู้นั้น (มีผลถ้าแอทแทคมาแล้ว 2 ครั้งขึ้นไปรวมการต่อสู้นี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/022';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][โซลบลาสต์ (1)] แล้วจั่ว 1 ใบ เลือกการ์ดจากมือของคุณ 1 ใบ วางลงโซล จากนั้นถ้าโซลของคุณมี 8 ชนิดขึ้นไป พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น ถ้ามี 10 ชนิดขึ้นไป ให้เปลี่ยนเป็น +10000 แทน +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/023';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) จากมือ ถ้าโซลของคุณมี 8 ชนิดขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] แล้วเลือกเกรด 1 หรือน้อยกว่าจากโซลของคุณ 1 ใบ คอลลง (R) ถ้ามี 10 ชนิดขึ้นไป ให้เลือกเกรด 4 หรือน้อยกว่าแทนเกรด 1 หรือน้อยกว่า', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/024';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคได้แอทแทคมาแล้ว 2 ครั้งขึ้นไปในเทิร์นนี้ ชิลด์ของยูนิตนี้ +15000 ในระหว่างการต่อสู้นั้น (มีผลถ้าแอทแทคมาแล้ว 2 ครั้งขึ้นไปรวมการต่อสู้นี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/025';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST][โซลบลาสต์ (1)] แล้วจั่ว 1 ใบ เลือกการ์ดจากมือของคุณ 1 ใบ ทิ้ง ถ้ามีเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/026';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคได้แอทแทคมาแล้ว 2 ครั้งขึ้นไปในเทิร์นนี้ ชิลด์ของยูนิตนี้ +15000 ในระหว่างการต่อสู้นั้น (มีผลถ้าแอทแทคมาแล้ว 2 ครั้งขึ้นไปรวมการต่อสู้นี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/027';
UPDATE cards SET skill_text_th = '(เซ็ตออเดอร์: หลังเล่นแล้วให้นำไปวางไว้ในออเดอร์โซน)
[AUTO]: เมื่อการ์ดนี้ถูกวางลงออเดอร์โซน จั่ว 1 ใบ เลือกการ์ดจากมือของคุณ 1 ใบ ทิ้ง ถ้ามีการ์ดวิจัย 3 ใบขึ้นไปในออเดอร์โซนของคุณ ให้ [COST][โซลบลาสต์ (1)] เพิ่มอีก แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ไบนด์', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/028';
UPDATE cards SET skill_text_th = '[CONT][(R) แถวหน้า]: เรียร์การ์ดของคุณทั้งหมดที่มีชื่ออื่นเหมือนยูนิตนี้จะไม่ถูกเลือกโดยเอฟเฟกต์การ์ดของฝ่ายตรงข้าม
[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/029';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) จากมือ ถ้าแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1), โซลบลาสต์ (1)] แล้วค้นหา "อัศวินแห่งมิตรภาพ เค" จากเด็คของคุณได้สูงสุด 1 ใบ คอลลง (R) ในแถวเดียวกับยูนิตนี้ แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/030';
UPDATE cards SET skill_text_th = '[AUTO][(R) แถวหลัง]: เมื่อยูนิตอื่นของคุณในแถวเดียวกับยูนิตนี้สแตนด์ด้วยเอฟเฟกต์การ์ด นำยูนิตนี้กลับมือได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/031';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถอยจาก (R) ด้วยความสามารถของแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" ในเทิร์นของคุณ [COST][โซลบลาสต์ (2)] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/032';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในระหว่างการต่อสู้ที่ยูนิตนี้บูสต์ "อัศวินผู้ซื่อสัตย์ เบดิเวียร์" พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/033';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคได้แอทแทคมาแล้ว 2 ครั้งขึ้นไปในเทิร์นนี้ ชิลด์ของยูนิตนี้ +15000 ในระหว่างการต่อสู้นั้น (มีผลถ้าแอทแทคมาแล้ว 2 ครั้งขึ้นไปรวมการต่อสู้นี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/034';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][เคาน์เตอร์บลาสต์ (1)] แล้วคอลโทเคนแพลนต์ได้สูงสุด 2 ใบลง (R) (แพลนต์คือเกรด 0 / พาวเวอร์ 5000 / คริติคอล 1 และมีความสามารถบูสต์)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/035';
UPDATE cards SET skill_text_th = '[ACT][(R)] เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ดอื่น 2 ใบ] แล้วจั่ว 1 ใบ พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/036';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกวางที่ (G) ถ้ายูนิตของฝ่ายตรงข้ามที่กำลังแอทแทคได้แอทแทคมาแล้ว 2 ครั้งขึ้นไปในเทิร์นนี้ ชิลด์ของยูนิตนี้ +15000 ในระหว่างการต่อสู้นั้น (มีผลถ้าแอทแทคมาแล้ว 2 ครั้งขึ้นไปรวมการต่อสู้นี้ด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/037';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][โซลบลาสต์ (1)] แล้วเลือกยูนิตธรรมดา (นอร์มอลยูนิต) ที่เป็น [นักแสวงหาประกาย] หรือมีชื่อ "นินจา" จากดรอปของคุณ 1 ใบ วางลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/038';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "ในแสงแดดอันแสนสงบ ทามายุระ" แล้วปรากฏตัว เลือกการ์ดที่มีชื่อ "ริริมิ" หรือ "รารามิ" จากดรอปของคุณได้สูงสุด 1 ใบ เพิ่มเข้ามือ

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/039';
UPDATE cards SET skill_text_th = 'ถ้ามีแวนการ์ดของคุณที่มีชื่อ "ทามายุระ" [COST][โซลบลาสต์ (2)] แล้วเล่นได้!
เลือกแวนการ์ดของคุณ 1 ใบ มอบความสามารถ "[CONT][(V)]: พาวเวอร์ของยูนิตแถวหน้าของฝ่ายตรงข้ามทั้งหมด -10000" ให้ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/040';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "เขี้ยวที่ใกล้เข้ามา เคออส" ใช้โซลชาร์จ (1) ถ้าการ์ดที่ถูกโซลชาร์จเป็นยูนิตทริกเกอร์ จั่ว 1 ใบ ถ้าเป็นยูนิตธรรมดา (นอร์มอลยูนิต) เลือกจากโซลของคุณได้สูงสุด 1 ใบ คอลลง (R)

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/041';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] แล้วพาวเวอร์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/042';
UPDATE cards SET skill_text_th = '[ACT][โซล]: [COST][ไบนด์การ์ดนี้] แล้วใช้โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/043';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "ที่ไหนก็งีบได้ เอวา" แล้วปรากฏตัว ค้นหาการ์ดวิจัยจากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/044';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือในเทิร์นของคุณ ดูเด็คของคุณ 5 ใบจากบนสุด เลือกเซ็ตออเดอร์ได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/045';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) เลือกการ์ดที่ไม่ใช่ยูนิตทริกเกอร์จากดรอปของคุณได้สูงสุด 1 ใบ วางไว้ใต้เด็ค ถ้าวางการ์ดที่เป็นเกรด 3 ขึ้นไป ให้ [COST][โซลบลาสต์ (3)] เพิ่มอีก แล้วจั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/046';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยเกรด 3 ที่มีชื่อ "เทกุเรีย" ดูเด็คของคุณ 5 ใบจากบนสุด เลือกการ์ดที่มีชื่อ "เทกุเรีย" หรือ "เมเปิล" ได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/047';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ในเมนเฟสของคุณ ถ้ามีแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" [COST][โซลบลาสต์ (1)] แล้วดูเด็คของคุณ 5 ใบจากบนสุด เลือกการ์ดยูนิตเกรด 2 หรือน้อยกว่าที่มีชื่อ "บลาสเตอร์" ได้สูงสุด 1 ใบ คอลลง (R) แล้วสับเด็ค ถ้าคอลแล้ว เลือกการ์ดจากมือของคุณ 1 ใบ ทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/048';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (V) หรือ (R) [COST][เคาน์เตอร์บลาสต์ (1), ถอยเรียร์การ์ดอื่น 1 ใบ] แล้วเลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ ถอย ไดรฟ์ของยูนิตนี้ +1 ในเทิร์นนั้น
[CONT][(R)]: ในเทิร์นของคุณ ถ้าเทิร์นนี้เรียร์การ์ดของคุณถอยไปแล้ว พาวเวอร์ของยูนิตนี้ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/049';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) [COST][โซลบลาสต์ (1)] แล้วทุกๆ ยูนิตอื่นของคุณ 1 ใบ พาวเวอร์ของยูนิตนี้ +2000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/050';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยเกรด 2 ที่มีชื่อ "บลาสเตอร์" ดูเด็คของคุณ 7 ใบจากบนสุด เลือกเกรด 2 ที่มีชื่อ "บลาสเตอร์" ได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค ถ้าไม่ได้เปิดเผย เลือก "วินการ์ล เบรฟ" จากโซลของคุณ 1 ใบ คอลลง (R) ได้
[CONT][(R)]: ในเทิร์นของคุณ ถ้ายูนิตของคุณมี 3 ใบขึ้นไป พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/051';
UPDATE cards SET skill_text_th = 'ถ้ามีแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" [COST][เคาน์เตอร์บลาสต์ (1)] แล้วเล่นได้!
ค้นหาการ์ดยูนิตเกรด 2 ที่มีชื่อ "บลาสเตอร์" จากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/052';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (V) [COST][ถอยเรียร์การ์ด 1 ใบ] แล้วคอลโทเคนแพลนต์ได้สูงสุด 2 ใบลง (R) (แพลนต์คือเกรด 0 / พาวเวอร์ 5000 / คริติคอล 1 และมีความสามารถบูสต์)

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/053';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทคแวนการ์ด [COST][โซลบลาสต์ (1)] แล้วทุกๆ ยูนิตอื่นของคุณที่อยู่ในสถานะเรสต์ 1 ใบ พาวเวอร์ของยูนิตนี้ +2000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/054';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ถ้าแวนการ์ดของคุณเป็นเกรด 3 ขึ้นไป คอลโทเคนแพลนต์ 1 ใบลง (R) ได้ (แพลนต์คือเกรด 0 / พาวเวอร์ 5000 / คริติคอล 1 และมีความสามารถบูสต์)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/055';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: ตอนจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][วางยูนิตนี้ลงโซล] แล้วเลือกเรียร์การ์ดของคุณ 1 ใบ พาวเวอร์ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/056';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) ด้วยความสามารถของแวนการ์ดของคุณ พาวเวอร์ของยูนิตนี้ +10000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/057';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 ขึ้นไป ชิลด์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/058';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "จิ้งจอกเก้าหาง ทามายุระ" แล้วปรากฏตัว ดูเด็คของคุณ 7 ใบจากบนสุด เลือกการ์ดที่มีชื่อ "ริริมิ" หรือ "รารามิ" หรือการ์ดมนตร์จิ้งจอกได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/059';
UPDATE cards SET skill_text_th = '[CONT][(R)/(G)]: ถ้ามีเกรด 3 อยู่ในโซลของคุณ พาวเวอร์ของยูนิตนี้ +2000 / ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/060';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/061';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ใช้โซลชาร์จ (1) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/062';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ปรากฏตัวที่ (R) เปิดเผยการ์ด 1 ใบจากบนสุดของเด็คของคุณ ถ้าไม่มีการ์ดชื่อเดียวกับการ์ดที่เปิดเผยอยู่ในโซลของคุณ ใช้โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/063';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป ชิลด์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/064';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "ปลักแห่งความรอด เคออส" เปิดเผยการ์ด 2 ใบจากบนสุดของเด็คของคุณ เลือกยูนิตธรรมดา (นอร์มอลยูนิต) ทั้งหมดจากในนั้นวางลงโซล ส่วนที่เหลือวางกลับไว้ใต้เด็คตามลำดับที่ต้องการ

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/065';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/066';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ถ้ามีเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ ยูนิตนี้จะได้รับ "บูสต์"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/067';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้ามีการ์ดในออเดอร์โซนของคุณ 2 ใบขึ้นไป ชิลด์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น (รวมการ์ดของฝ่ายตรงข้ามด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/068';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้บูสต์ ถ้ามีการ์ดในออเดอร์โซนของคุณ 2 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] แล้วพาวเวอร์ของยูนิตนี้ +10000 ในระหว่างการต่อสู้นั้น (รวมการ์ดของฝ่ายตรงข้ามด้วย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/069';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์จาก "ผู้กระหายความรู้ เอวา" แล้วปรากฏตัว ค้นหาการ์ดวิจัยจากเด็คของคุณได้สูงสุด 1 ใบ เปิดเผยแล้วเพิ่มเข้ามือ จากนั้นสับเด็ค

[นักแสวงหาประกาย] (การ์ดนี้คือ [นักแสวงหาประกาย] ที่เสาะหาอัญมณีประกาย)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/070';
UPDATE cards SET skill_text_th = '[CONT][(R)]: ในเทิร์นของคุณ ทุกๆ เซ็ตออเดอร์ของคุณในออเดอร์โซนของคุณ 1 ใบ พาวเวอร์ของยูนิตนี้ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/071';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่ว 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/072';
UPDATE cards SET skill_text_th = '[AUTO][(R)] เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของการ์ด พาวเวอร์ของยูนิตนี้ +5000 ในเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/073';
UPDATE cards SET skill_text_th = '[AUTO][(R)]: เมื่อยูนิตนี้แอทแทค ถ้ามีแวนการ์ดของคุณที่มีชื่อ "บลาสเตอร์" พาวเวอร์ของยูนิตนี้ +5000 ในระหว่างการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/074';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (2)] เปิดการ์ด 2 ใบบนสุดของเด็คของคุณ เลือกยูนิตการ์ดได้สูงสุด 1 ใบ คอลลงเรียร์การ์ด แล้ววางที่เหลือกลับบนเด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/075';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค [COST][โซลบลาสต์ (1) และเปิดการ์ดนอร์มอลยูนิตจากมือ 1 ใบ แล้ววางไว้ใต้เด็ค] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/076';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าเทิร์นนี้คุณไรด์ขึ้นเกรด 3 หรือสูงกว่า ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/077';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าดาเมจโซนของคุณมี 3 ใบขึ้นไป ยูนิตนี้ได้ชิลด์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/078';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าเทิร์นนี้เรียร์การ์ดของคุณถูกถอยด้วยความสามารถของแวนการ์ดของคุณ [COST][โซลบลาสต์ (1)] ยูนิตนี้ได้พาวเวอร์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/079';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ดด้วยวิธีอื่นที่ไม่ใช่เอฟเฟกต์ของ "ออกูลัส ไลออน" ถ้าเทิร์นนี้คุณเพอร์โซนาไรด์อยู่ [COST][เคาน์เตอร์บลาสต์ (1)] ค้นหาการ์ดชื่อเดียวกับการ์ดนี้จากเด็คของคุณได้สูงสุด 1 ใบ คอลลงเรียร์การ์ดในสถานะเรสต์ แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/080';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "เทกุเรีย ผู้ฝึกฝนอันเข้มงวด" เปิดการ์ด 1 ใบบนสุดของเด็คของคุณ ถ้าเป็นยูนิตการ์ดเกรด 2 หรือต่ำกว่า คุณสามารถคอลลงเรียร์การ์ดในสถานะเรสต์ได้ (ถ้าไม่คอล ให้นำกลับที่เดิม)

[นักแสวงหาแสงเรือง] (การ์ดนี้คือ [นักแสวงหาแสงเรือง] ที่แสวงหาคริสตัลเรืองแสง)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/081';
UPDATE cards SET skill_text_th = '[CONT](R)/(G): ถ้าในโซลของคุณมีเกรด 2 ที่มีคำว่า "บลาสเตอร์" อยู่ 2 ชนิดขึ้นไป ยูนิตนี้ได้พาวเวอร์ +2000 / ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/082';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/083';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/084';
UPDATE cards SET skill_text_th = '[CONT](R): ระหว่างเทิร์นของคุณ ยูนิตนี้ได้พาวเวอร์ +5000 ต่อออเดอร์การ์ด 1 ใบในไบนด์โซนของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/085';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคแวนการ์ดเกรด 3 หรือสูงกว่า ยูนิตนี้ได้พาวเวอร์ +5000 ต่อโทเคนยูนิตของคุณ 1 ใบ ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/086';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทคเกรด 3 หรือสูงกว่า ถ้าเป็นการต่อสู้ครั้งที่ 4 หรือหลังจากนั้นในเทิร์นนี้ ยูนิตนี้ได้พาวเวอร์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/087';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์ขึ้นจาก "เด็กไบโอรอยด์ โรโรวา" คอลโทเคนแพลนต์ได้สูงสุด 1 ใบลงเรียร์การ์ดตรงกลางแถวหลัง (แพลนต์คือเกรด 0 / พาวเวอร์ 5000 / คริติคอล 1 มีความสามารถบูสต์)

[นักแสวงหาแสงเรือง] (การ์ดนี้คือ [นักแสวงหาแสงเรือง] ที่แสวงหาคริสตัลเรืองแสง)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/088';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด เลือกยูนิตของคุณที่เกรด 1 หรือต่ำกว่า 1 ใบ ได้พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/089';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/090';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่แวนการ์ด [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ แล้วถอย ถ้าไม่ได้ถอย จั่วการ์ด 1 ใบ
[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด [COST][เคาน์เตอร์บลาสต์ (1)] เลือกเรียร์การ์ดของฝ่ายตรงข้ามที่เกรด 2 หรือสูงกว่า 1 ใบ แล้วถอย', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/10thSEC01';
UPDATE cards SET skill_text_th = '[CONT](V): ระหว่างเทิร์นของคุณ ถ้าในโซลของคุณมี "ดราโกนิค โอเวอร์ลอร์ด" ยูนิตนี้จะไม่ถูกลดไดรฟ์ด้วยเอฟเฟกต์การ์ด และได้พาวเวอร์ +5000
[AUTO](V) เทิร์นละ 1 ครั้ง: เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][เคาน์เตอร์บลาสต์ (1) และทิ้งการ์ดจากมือ 2 ใบ] ทำให้ยูนิตนี้สแตนด์ แล้วไดรฟ์ -1 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/10thSP01';
UPDATE cards SET skill_text_th = '[CONT](V): ถ้าในโซลของคุณมี "แฟนธอม บลาสเตอร์ ดราก้อน" ยูนิตนี้ได้คริติคอล +1
[AUTO](V): เมื่อยูนิตนี้แอทแทค [COST][ถอยเรียร์การ์ด 2 ใบ] เลือก "บลาสเตอร์ ดาร์ก" จากโซลหรือดรอปของคุณ 1 ใบ คอลลงเรียร์การ์ด ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 หรือสูงกว่า ยูนิตที่ถูกคอลและยูนิตนี้ได้พาวเวอร์ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/10thSP02';
UPDATE cards SET skill_text_th = '[CONT](V): ถ้าในโซลของคุณมีทั้ง "บลาสเตอร์ เบลด" และ "บลาสเตอร์ ดาร์ก" ยูนิตนี้ได้พาวเวอร์ +2000 / คริติคอล +1
[AUTO](V): เมื่อยูนิตนี้แอทแทคแวนการ์ด ทำทั้งหมดต่อไปนี้
- [COST][นำ "บลาสเตอร์ เบลด" จากเรียร์การ์ด 1 ใบไปวางที่โซล] เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ แล้วถอย
- [COST][นำ "บลาสเตอร์ ดาร์ก" จากเรียร์การ์ด 1 ใบไปวางที่โซล] ยูนิตนี้ได้ไดรฟ์ +1 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/10thSP03';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด [COST][โซลบลาสต์ (1)] เลือกนอร์มอลยูนิตที่เป็น [นักแสวงหาแสงเรือง] หรือมีคำว่า "นินจา" จากดรอปของคุณ 1 ใบ แล้ววางลงโซล', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H01';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์ขึ้นจาก "ทามายุระ กลางแสงแดดอันอ่อนโยน" เลือกการ์ดที่มีคำว่า "ริริมิ" หรือ "รารามิ" จากดรอปของคุณได้สูงสุด 1 ใบ แล้วนำเข้ามือ

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H02';
UPDATE cards SET skill_text_th = 'ถ้าแวนการ์ดของคุณมีคำว่า "ทามายุระ" คุณสามารถเล่นการ์ดนี้ได้ด้วย [COST][โซลบลาสต์ (2)]!
เลือกแวนการ์ดของคุณ 1 ใบ แล้วมอบความสามารถ "[CONT](V): ยูนิตแถวหน้าทั้งหมดของฝ่ายตรงข้ามได้พาวเวอร์ -10000" ให้ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H03';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อจบการต่อสู้ที่ยูนิตนี้แอทแทค [COST][นำยูนิตนี้ไปวางที่โซล] เลือกเรียร์การ์ดของคุณ 1 ใบ ได้พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H04';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ดด้วยความสามารถของแวนการ์ดของคุณ ยูนิตนี้ได้พาวเวอร์ +10000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H05';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าแวนการ์ดของฝ่ายตรงข้ามเป็นเกรด 3 หรือสูงกว่า ยูนิตนี้ได้ชิลด์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H06';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์ขึ้นจาก "ทามายุระ จิ้งจอกเก้าหางปีศาจ" เปิดการ์ด 7 ใบบนสุดของเด็คของคุณ เลือกการ์ดที่มีคำว่า "ริริมิ" หรือ "รารามิ" หรือการ์ดวิชาจิ้งจอกได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H07';
UPDATE cards SET skill_text_th = '[CONT](R)/(G): ถ้าในโซลของคุณมีเกรด 3 ยูนิตนี้ได้พาวเวอร์ +2000 / ชิลด์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H08';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H09';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST][ถอยเรียร์การ์ดอื่นจำนวนเท่าที่ต้องการ ตั้งแต่ 1 ใบขึ้นไป] ยูนิตนี้ได้พาวเวอร์ +5000 ตลอดเทิร์นนั้น ต่อยูนิตที่ถอยด้วยคอสต์นี้ 1 ใบ

[นักแสวงหาแสงเรือง]-โรโรวา
[CONT](R): ถ้ามียูนิตของคุณที่มีคำว่า "ราดิลินา" อยู่ในแถวตั้งเดียวกับยูนิตนี้ ยูนิตนี้สามารถแอทแทคจากแถวหลังได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H10';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "เคออส เขี้ยวที่ใกล้เข้ามา" โซลชาร์จ (1) ถ้าการ์ดที่ได้จากโซลชาร์จเป็นทริกเกอร์ยูนิต จั่วการ์ด 1 ใบ ถ้าเป็นนอร์มอลยูนิต เลือกการ์ด 1 ใบจากโซลของคุณ แล้วคอลลงเรียร์การ์ด

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H11';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] ยูนิตนี้ได้พาวเวอร์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H12';
UPDATE cards SET skill_text_th = '[ACT](โซล): [COST][ไบนด์การ์ดนี้] โซลชาร์จ (2)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H13';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค คุณสามารถโซลชาร์จ (1) ได้', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H14';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด เปิดการ์ด 1 ใบบนสุดของเด็คของคุณ ถ้าไม่มีการ์ดชื่อเดียวกับการ์ดที่เปิดอยู่ในโซลของคุณ โซลชาร์จ (1)', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H15';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าโซลของคุณมี 5 ใบขึ้นไป ยูนิตนี้ได้ชิลด์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H16';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดย "เคออส หล่มเลนแห่งความรอด" เปิดการ์ด 2 ใบบนสุดของเด็คของคุณ นำนอร์มอลยูนิตทั้งหมดในนั้นไปวางที่โซล แล้ววางที่เหลือไว้ใต้เด็คตามลำดับที่ต้องการ

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H17';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H18';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์ขึ้นจาก "เอวา งีบหลับได้ทุกที่" ค้นหาการ์ดวิจัยจากเด็คของคุณได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H19';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อการ์ดนี้ถูกทิ้งจากมือระหว่างเทิร์นของคุณ เปิดการ์ด 5 ใบบนสุดของเด็คของคุณ เลือกเซ็ตออเดอร์ได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H20';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด เลือกการ์ดที่ไม่ใช่ทริกเกอร์ยูนิตจากดรอปของคุณได้สูงสุด 1 ใบ แล้ววางไว้ใต้เด็ค ถ้าวางการ์ดเกรด 3 หรือสูงกว่า [COST][โซลบลาสต์ (3)] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H21';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้ามีเซ็ตออเดอร์อยู่ในออเดอร์โซนของคุณ ยูนิตนี้จะได้รับความสามารถ "บูสต์"', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H22';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าออเดอร์โซนของคุณมีการ์ด 2 ใบขึ้นไป ยูนิตนี้ได้ชิลด์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H23';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้บูสต์ ถ้าออเดอร์โซนของคุณมีการ์ด 2 ใบขึ้นไป [COST][เคาน์เตอร์บลาสต์ (1)] ยูนิตนี้ได้พาวเวอร์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H24';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ไรด์ขึ้นจาก "เอวา ผู้กระหายความรู้" ค้นหาการ์ดวิจัยจากเด็คของคุณได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H25';
UPDATE cards SET skill_text_th = '[CONT](R): ระหว่างเทิร์นของคุณ ยูนิตนี้ได้พาวเวอร์ +2000 ต่อเซ็ตออเดอร์ของคุณ 1 ใบในออเดอร์โซนของคุณ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H26';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์ ถ้าคุณเป็นฝ่ายเล่นที่สอง จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H27';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยเกรด 3 ที่มีคำว่า "เทกุเรีย" เปิดการ์ด 5 ใบบนสุดของเด็คของคุณ เลือกการ์ดที่มีคำว่า "เทกุเรีย" หรือ "เมเปิล" ได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค

[นักแสวงหาแสงเรือง]', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H28';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ดระหว่างเมนเฟสของคุณ ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" [COST][โซลบลาสต์ (1)] เปิดการ์ด 5 ใบบนสุดของเด็คของคุณ เลือกยูนิตการ์ดเกรด 2 หรือต่ำกว่าที่มีคำว่า "บลาสเตอร์" ได้สูงสุด 1 ใบ คอลลงเรียร์การ์ด แล้วสับเด็ค ถ้าคอลแล้ว เลือกการ์ด 1 ใบจากมือของคุณ แล้วทิ้ง', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H29';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่แวนการ์ดหรือเรียร์การ์ด [COST][เคาน์เตอร์บลาสต์ (1) และถอยเรียร์การ์ดอื่น 1 ใบ] เลือกเรียร์การ์ดของฝ่ายตรงข้าม 1 ใบ แล้วถอย ยูนิตนี้ได้ไดรฟ์ +1 ตลอดเทิร์นนั้น
[CONT](R): ระหว่างเทิร์นของคุณ ถ้าเทิร์นนี้เรียร์การ์ดของคุณถูกถอยไปแล้ว ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H30';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ลงสนามที่เรียร์การ์ด [COST][โซลบลาสต์ (1)] ยูนิตนี้ได้พาวเวอร์ +2000 ตลอดเทิร์นนั้น ต่อยูนิตอื่นของคุณ 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H31';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้ถูกไรด์โดยเกรด 2 ที่มีคำว่า "บลาสเตอร์" เปิดการ์ด 7 ใบบนสุดของเด็คของคุณ เลือกเกรด 2 ที่มีคำว่า "บลาสเตอร์" ได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค ถ้าไม่ได้เปิด คุณสามารถเลือก "วิงกัล เบรฟ" จากโซลของคุณ 1 ใบ แล้วคอลลงเรียร์การ์ดได้
[CONT](R): ระหว่างเทิร์นของคุณ ถ้ายูนิตของคุณมี 3 ใบขึ้นไป ยูนิตนี้ได้พาวเวอร์ +2000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H32';
UPDATE cards SET skill_text_th = 'ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" คุณสามารถเล่นการ์ดนี้ได้ด้วย [COST][เคาน์เตอร์บลาสต์ (1)]!
ค้นหายูนิตการ์ดเกรด 2 ที่มีคำว่า "บลาสเตอร์" จากเด็คของคุณได้สูงสุด 1 ใบ เปิดแล้วนำเข้ามือ แล้วสับเด็ค', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H33';
UPDATE cards SET skill_text_th = '[AUTO](R) เทิร์นละ 1 ครั้ง: เมื่อยูนิตนี้สแตนด์ด้วยความสามารถของการ์ด ยูนิตนี้ได้พาวเวอร์ +5000 ตลอดเทิร์นนั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H34';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค ถ้าแวนการ์ดของคุณมีคำว่า "บลาสเตอร์" ยูนิตนี้ได้พาวเวอร์ +5000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H35';
UPDATE cards SET skill_text_th = '[ACT](R) เทิร์นละ 1 ครั้ง: [COST][เคาน์เตอร์บลาสต์ (2)] เปิดการ์ด 2 ใบบนสุดของเด็คของคุณ เลือกยูนิตการ์ดได้สูงสุด 1 ใบ คอลลงเรียร์การ์ด แล้ววางที่เหลือกลับบนเด็คตามลำดับที่ต้องการ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H36';
UPDATE cards SET skill_text_th = '[AUTO](R): เมื่อยูนิตนี้แอทแทค [COST][โซลบลาสต์ (1) และเปิดการ์ดนอร์มอลยูนิตจากมือ 1 ใบ แล้ววางไว้ใต้เด็ค] จั่วการ์ด 1 ใบ', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H37';
UPDATE cards SET skill_text_th = '[CONT](R): ถ้าเทิร์นนี้คุณไรด์ขึ้นเกรด 3 หรือสูงกว่า ยูนิตนี้ได้พาวเวอร์ +5000', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H38';
UPDATE cards SET skill_text_th = '[AUTO]: เมื่อยูนิตนี้อินเตอร์เซ็ปต์ ถ้าดาเมจโซนของคุณมี 3 ใบขึ้นไป ยูนิตนี้ได้ชิลด์ +10000 ตลอดการต่อสู้นั้น', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT05/H39';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/063';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/064';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/065';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/077';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/078';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/079';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/088';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/089';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/090';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/102';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/103';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/104';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/114';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/115';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/116';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H07';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H08';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H09';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H10';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H17';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H18';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H19';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H20';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H26';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H27';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H28';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H29';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H37';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H38';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H39';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H40';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H47';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H48';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H49';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/H50';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP34';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP35';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP39';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT01/SP40';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/SP47';
UPDATE cards SET skill_text_th = '-', updated_at = now() WHERE game = 'vanguard' AND card_number = 'D-BT04/WO01';

COMMIT;
