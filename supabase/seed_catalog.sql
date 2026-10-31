-- สร้างอัตโนมัติโดย scripts/gen-catalog-sql.js — อย่าแก้มือ (แก้ skins.json / gacha.json / skills.json แล้วรันสคริปต์ใหม่)

insert into public.rarity_config(rarity, name, sell_coins, sort) values
('common', 'Common', 20, 1),
('rare', 'Rare', 80, 2),
('epic', 'SR', 300, 3),
('legendary', 'SSR', 1000, 4)
on conflict (rarity) do update set name = excluded.name, sell_coins = excluded.sell_coins, sort = excluded.sort;

insert into public.catalog_items(kind, item_id, name, rarity, is_default, active) values
('characters', 'boy', 'หนุ่มน้อยซากุระ', 'common', true, true),
('characters', 'girl', 'สาวน้อยหางม้า', 'common', true, true),
('characters', 'rina-01', 'รินะ', 'epic', false, true),
('characters', 'arya-01', 'อายะ', 'epic', false, true),
('characters', 'rena-01', 'เรนะ', 'epic', false, true),
('characters', 'sakuya-ssr', 'ซากุยะ', 'legendary', false, true),
('characters', 'rei-r', 'เรย์', 'rare', false, true),
('characters', 'haru-r', 'ฮารุ', 'rare', false, true),
('characters', 'ken-r', 'เคน', 'rare', false, true),
('characters', 'leo-r', 'ลีโอ', 'rare', false, true),
('characters', 'yuna-r', 'ยูนะ', 'rare', false, true),
('characters', 'miyu-r', 'มิยุ', 'rare', false, true),
('backs', 'sakura-navy', 'ซากุระกรมท่า', 'common', true, true),
('backs', 'classic-red', 'คลาสสิกแดง', 'common', false, true),
('backs', 'midnight', 'มิดไนท์', 'common', false, true),
('backs', 'paw-pink', 'รอยเท้าแมว', 'rare', false, true),
('backs', 'gold', 'ทองคำ', 'epic', false, true),
('backs', 'sakura-01', 'Sakura', 'epic', false, true),
('tables', 'green-felt', 'โต๊ะผ้าสักหลาด', 'common', true, true),
('tables', 'sakura-felt', 'โต๊ะชมพูซากุระ', 'rare', false, true),
('tables', 'navy-felt', 'โต๊ะกรมท่า', 'rare', false, true),
('tables', 'wood', 'โต๊ะไม้', 'rare', false, true),
('tables', 'table-sakura02', 'Sakura Table', 'common', false, true),
('tables', 'table-sakura01', 'Sakura Table', 'common', false, true),
('backgrounds', 'sakura-house', 'ห้องญี่ปุ่นซากุระ', 'common', true, true),
('backgrounds', 'room-night', 'ห้องไม้ยามค่ำ (ซากุระ)', 'rare', false, true),
('backgrounds', 'room-day', 'ห้องไม้ยามเช้า', 'rare', false, true),
('backgrounds', 'room-sakura', 'ห้องไม้โทนชมพู', 'rare', false, true),
('backgrounds', 'sunset', 'พระอาทิตย์ตก', 'common', false, true),
('backgrounds', 'sakura', 'ซากุระ', 'common', false, true),
('backgrounds', 'night', 'ราตรีประดับดาว', 'common', false, true),
('backgrounds', 'forest', 'ป่าเขียว', 'common', false, true),
('backgrounds', 'gold', 'ทองคำ', 'rare', false, true),
('backgrounds', 'sakuya-cardroom', 'ห้องไพ่ของราชินี', 'epic', false, true),
('backgrounds', 'sakuya-pond', 'ศาลาริมสระใต้จันทร์', 'epic', false, true),
('frames', 'none', 'ไม่ใส่กรอบ', 'common', true, true),
('frames', 'sakura-gem', 'ซากุระอัญมณี', 'epic', false, true)
on conflict (kind, item_id) do update set name = excluded.name, rarity = excluded.rarity, is_default = excluded.is_default, active = true;

update public.catalog_items set active = false where (kind, item_id) not in (('characters', 'boy'), ('characters', 'girl'), ('characters', 'rina-01'), ('characters', 'arya-01'), ('characters', 'rena-01'), ('characters', 'sakuya-ssr'), ('characters', 'rei-r'), ('characters', 'haru-r'), ('characters', 'ken-r'), ('characters', 'leo-r'), ('characters', 'yuna-r'), ('characters', 'miyu-r'), ('backs', 'sakura-navy'), ('backs', 'classic-red'), ('backs', 'midnight'), ('backs', 'paw-pink'), ('backs', 'gold'), ('backs', 'sakura-01'), ('tables', 'green-felt'), ('tables', 'sakura-felt'), ('tables', 'navy-felt'), ('tables', 'wood'), ('tables', 'table-sakura02'), ('tables', 'table-sakura01'), ('backgrounds', 'sakura-house'), ('backgrounds', 'room-night'), ('backgrounds', 'room-day'), ('backgrounds', 'room-sakura'), ('backgrounds', 'sunset'), ('backgrounds', 'sakura'), ('backgrounds', 'night'), ('backgrounds', 'forest'), ('backgrounds', 'gold'), ('backgrounds', 'sakuya-cardroom'), ('backgrounds', 'sakuya-pond'), ('frames', 'none'), ('frames', 'sakura-gem'));

insert into public.gacha_banners(id, name, description, single_coins, single_mcash, ten_coins, ten_mcash, pity, sort, active, ticket, ticket_mcash, ticket_mcash10, grp) values
('sakura-ace', 'ตู้ธรรมดา', 'ตู้ตัวละครธรรมดา · SSR 0.01% · SR 1% · ใช้ตั๋วสุ่มระดับ 1 (สีฟ้า) · ได้ตัวละครซ้ำเอาไปอัพดาวได้', null, null, null, null, 0, 1, true, 'ticket-b', 30, 270, 'char'),
('sakuya-up', 'ราชินีไพ่ซากุยะ', 'ตู้เรทอัป — SSR ซากุยะ 1% · SR 3% (รวมพื้นหลังพิเศษของราชินี 2 แบบ) · การันตี SSR ใน 90 ครั้ง · ใช้ตั๋วสุ่มระดับ 2 (สีแดง)', null, null, null, null, 90, 2, true, 'ticket-r', 30, 270, 'char'),
('cosm-sakura', 'ตู้ของแต่งซากุระ', 'หลังไพ่ · ผ้าปูโต๊ะ · พื้นหลัง · กรอบการ์ด · สุ่มด้วยเหรียญ · ได้ของซ้ำแปลงเป็นเหรียญอัตโนมัติ', 500, null, 4500, null, 0, 3, true, null, null, null, 'cosm')
on conflict (id) do update set name = excluded.name, description = excluded.description, single_coins = excluded.single_coins, single_mcash = excluded.single_mcash, ten_coins = excluded.ten_coins, ten_mcash = excluded.ten_mcash, pity = excluded.pity, sort = excluded.sort, active = true, ticket = excluded.ticket, ticket_mcash = excluded.ticket_mcash, ticket_mcash10 = excluded.ticket_mcash10, grp = excluded.grp;

insert into public.game_config(key, value) values ('weekly_shop', '{"banner":"cosm-sakura","slots":6,"price":{"common":800,"rare":2000,"epic":5000,"legendary":12000},"shards":[{"slot":"sh-r","rarity":"rare","qty":5,"coins":2000},{"slot":"sh-s","rarity":"epic","qty":5,"coins":10000},{"slot":"sh-sg","rarity":"epic","qty":5,"mcash":200}]}'::jsonb) on conflict (key) do update set value = excluded.value;

update public.gacha_banners set active = false where id not in ('sakura-ace', 'sakuya-up', 'cosm-sakura');

insert into public.gacha_pool(banner_id, kind, item_id, weight) values
('sakura-ace', 'characters', 'rina-01', 3334),
('sakura-ace', 'characters', 'arya-01', 3333),
('sakura-ace', 'characters', 'rena-01', 3333),
('sakura-ace', 'characters', 'sakuya-ssr', 100),
('sakura-ace', 'characters', 'rei-r', 164984),
('sakura-ace', 'characters', 'haru-r', 164984),
('sakura-ace', 'characters', 'ken-r', 164983),
('sakura-ace', 'characters', 'leo-r', 164983),
('sakura-ace', 'characters', 'yuna-r', 164983),
('sakura-ace', 'characters', 'miyu-r', 164983),
('sakuya-up', 'characters', 'rina-01', 6000),
('sakuya-up', 'characters', 'arya-01', 6000),
('sakuya-up', 'characters', 'rena-01', 6000),
('sakuya-up', 'characters', 'sakuya-ssr', 10000),
('sakuya-up', 'characters', 'rei-r', 160000),
('sakuya-up', 'characters', 'haru-r', 160000),
('sakuya-up', 'characters', 'ken-r', 160000),
('sakuya-up', 'characters', 'leo-r', 160000),
('sakuya-up', 'characters', 'yuna-r', 160000),
('sakuya-up', 'characters', 'miyu-r', 160000),
('sakuya-up', 'backgrounds', 'sakuya-cardroom', 6000),
('sakuya-up', 'backgrounds', 'sakuya-pond', 6000),
('cosm-sakura', 'backs', 'classic-red', 81250),
('cosm-sakura', 'backs', 'midnight', 81250),
('cosm-sakura', 'backs', 'paw-pink', 40000),
('cosm-sakura', 'backs', 'gold', 70000),
('cosm-sakura', 'tables', 'navy-felt', 40000),
('cosm-sakura', 'tables', 'wood', 40000),
('cosm-sakura', 'tables', 'table-sakura02', 81250),
('cosm-sakura', 'tables', 'table-sakura01', 81250),
('cosm-sakura', 'backgrounds', 'room-night', 40000),
('cosm-sakura', 'backgrounds', 'room-day', 40000),
('cosm-sakura', 'backgrounds', 'room-sakura', 40000),
('cosm-sakura', 'backgrounds', 'sunset', 81250),
('cosm-sakura', 'backgrounds', 'sakura', 81250),
('cosm-sakura', 'backgrounds', 'night', 81250),
('cosm-sakura', 'backgrounds', 'forest', 81250),
('cosm-sakura', 'backgrounds', 'gold', 40000)
on conflict (banner_id, kind, item_id) do update set weight = excluded.weight;

update public.gacha_pool set weight = 0 where (banner_id, kind, item_id) not in (('sakura-ace', 'characters', 'rina-01'), ('sakura-ace', 'characters', 'arya-01'), ('sakura-ace', 'characters', 'rena-01'), ('sakura-ace', 'characters', 'sakuya-ssr'), ('sakura-ace', 'characters', 'rei-r'), ('sakura-ace', 'characters', 'haru-r'), ('sakura-ace', 'characters', 'ken-r'), ('sakura-ace', 'characters', 'leo-r'), ('sakura-ace', 'characters', 'yuna-r'), ('sakura-ace', 'characters', 'miyu-r'), ('sakuya-up', 'characters', 'rina-01'), ('sakuya-up', 'characters', 'arya-01'), ('sakuya-up', 'characters', 'rena-01'), ('sakuya-up', 'characters', 'sakuya-ssr'), ('sakuya-up', 'characters', 'rei-r'), ('sakuya-up', 'characters', 'haru-r'), ('sakuya-up', 'characters', 'ken-r'), ('sakuya-up', 'characters', 'leo-r'), ('sakuya-up', 'characters', 'yuna-r'), ('sakuya-up', 'characters', 'miyu-r'), ('sakuya-up', 'backgrounds', 'sakuya-cardroom'), ('sakuya-up', 'backgrounds', 'sakuya-pond'), ('cosm-sakura', 'backs', 'classic-red'), ('cosm-sakura', 'backs', 'midnight'), ('cosm-sakura', 'backs', 'paw-pink'), ('cosm-sakura', 'backs', 'gold'), ('cosm-sakura', 'tables', 'navy-felt'), ('cosm-sakura', 'tables', 'wood'), ('cosm-sakura', 'tables', 'table-sakura02'), ('cosm-sakura', 'tables', 'table-sakura01'), ('cosm-sakura', 'backgrounds', 'room-night'), ('cosm-sakura', 'backgrounds', 'room-day'), ('cosm-sakura', 'backgrounds', 'room-sakura'), ('cosm-sakura', 'backgrounds', 'sunset'), ('cosm-sakura', 'backgrounds', 'sakura'), ('cosm-sakura', 'backgrounds', 'night'), ('cosm-sakura', 'backgrounds', 'forest'), ('cosm-sakura', 'backgrounds', 'gold'));

insert into public.character_defs(id, max_stars, star_costs, bonus_pct) values
('boy', 4, '{1}', null),
('girl', 4, '{1}', null),
('rina-01', 5, '{1}', null),
('arya-01', 5, '{1}', null),
('rena-01', 5, '{1}', null),
('sakuya-ssr', 5, '{1}', null),
('rei-r', 5, '{1}', null),
('haru-r', 5, '{1}', null),
('ken-r', 5, '{1}', null),
('leo-r', 5, '{1}', null),
('yuna-r', 5, '{1}', null),
('miyu-r', 5, '{1}', null)
on conflict (id) do update set max_stars = excluded.max_stars, star_costs = excluded.star_costs, bonus_pct = excluded.bonus_pct;
