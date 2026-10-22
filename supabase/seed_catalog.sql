-- สร้างอัตโนมัติโดย scripts/gen-catalog-sql.js — อย่าแก้มือ (แก้ skins.json / skills.json แล้วรันสคริปต์ใหม่)

insert into public.shop_items(kind, item_id, name, price_coins, price_mcash, active) values
('characters', 'boy', 'หนุ่มน้อยซากุระ', 0, 0, true),
('characters', 'girl', 'สาวน้อยหางม้า', 0, 0, true),
('characters', 'rina-01', 'รินะ', 1500, 0, true),
('characters', 'arya-01', 'อายะ', 1500, 0, true),
('characters', 'rena-01', 'เรนะ', 1500, 0, true),
('backs', 'sakura-navy', 'ซากุระกรมท่า', 0, 0, true),
('backs', 'classic-red', 'คลาสสิกแดง', 100, 0, true),
('backs', 'midnight', 'มิดไนท์', 200, 0, true),
('backs', 'paw-pink', 'รอยเท้าแมว', 300, 0, true),
('backs', 'gold', 'ทองคำ', 700, 0, true),
('backs', 'sakura-01', 'Sakura', 700, 0, true),
('tables', 'green-felt', 'โต๊ะผ้าสักหลาด', 0, 0, true),
('tables', 'sakura-felt', 'โต๊ะชมพูซากุระ', 250, 0, true),
('tables', 'navy-felt', 'โต๊ะกรมท่า', 250, 0, true),
('tables', 'wood', 'โต๊ะไม้', 400, 0, true),
('tables', 'table-sakura02', 'Sakura Table', 100, 0, true),
('tables', 'table-sakura01', 'Sakura Table', 100, 0, true),
('backgrounds', 'sakura-house', 'ห้องญี่ปุ่นซากุระ', 0, 0, true),
('backgrounds', 'room-night', 'ห้องไม้ยามค่ำ (ซากุระ)', 250, 0, true),
('backgrounds', 'room-day', 'ห้องไม้ยามเช้า', 250, 0, true),
('backgrounds', 'room-sakura', 'ห้องไม้โทนชมพู', 250, 0, true),
('backgrounds', 'sunset', 'พระอาทิตย์ตก', 150, 0, true),
('backgrounds', 'sakura', 'ซากุระ', 150, 0, true),
('backgrounds', 'night', 'ราตรีประดับดาว', 150, 0, true),
('backgrounds', 'forest', 'ป่าเขียว', 150, 0, true),
('backgrounds', 'gold', 'ทองคำ', 300, 0, true)
on conflict (kind, item_id) do update set name = excluded.name, price_coins = excluded.price_coins, price_mcash = excluded.price_mcash, active = true;

update public.shop_items set active = false where not ((kind, item_id) in (('characters', 'boy'), ('characters', 'girl'), ('characters', 'rina-01'), ('characters', 'arya-01'), ('characters', 'rena-01'), ('backs', 'sakura-navy'), ('backs', 'classic-red'), ('backs', 'midnight'), ('backs', 'paw-pink'), ('backs', 'gold'), ('backs', 'sakura-01'), ('tables', 'green-felt'), ('tables', 'sakura-felt'), ('tables', 'navy-felt'), ('tables', 'wood'), ('tables', 'table-sakura02'), ('tables', 'table-sakura01'), ('backgrounds', 'sakura-house'), ('backgrounds', 'room-night'), ('backgrounds', 'room-day'), ('backgrounds', 'room-sakura'), ('backgrounds', 'sunset'), ('backgrounds', 'sakura'), ('backgrounds', 'night'), ('backgrounds', 'forest'), ('backgrounds', 'gold')));

insert into public.character_defs(id, max_stars, star_costs, bonus_pct) values
('boy', 5, null, null),
('girl', 5, null, '{7,9,12,14,16}'),
('rina-01', 5, '{800,1600,3200,6400}', null),
('arya-01', 5, '{800,1600,3200,6400}', '{9,11,13,15,18}'),
('rena-01', 5, '{800,1600,3200,6400}', '{7,9,10,12,13}')
on conflict (id) do update set max_stars = excluded.max_stars, star_costs = excluded.star_costs, bonus_pct = excluded.bonus_pct;
