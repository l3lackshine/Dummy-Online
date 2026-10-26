-- สร้างอัตโนมัติโดย scripts/gen-catalog-sql.js — อย่าแก้มือ (แก้ skins.json / gacha.json / skills.json แล้วรันสคริปต์ใหม่)

insert into public.rarity_config(rarity, name, sell_coins, sort) values
('common', 'ธรรมดา', 20, 1),
('rare', 'หายาก', 80, 2),
('epic', 'หายากมาก', 300, 3),
('legendary', 'ตำนาน', 1000, 4)
on conflict (rarity) do update set name = excluded.name, sell_coins = excluded.sell_coins, sort = excluded.sort;

insert into public.catalog_items(kind, item_id, name, rarity, is_default, active) values
('characters', 'boy', 'หนุ่มน้อยซากุระ', 'common', true, true),
('characters', 'girl', 'สาวน้อยหางม้า', 'common', true, true),
('characters', 'rina-01', 'รินะ', 'legendary', false, true),
('characters', 'arya-01', 'อายะ', 'legendary', false, true),
('characters', 'rena-01', 'เรนะ', 'legendary', false, true),
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
('backgrounds', 'gold', 'ทองคำ', 'rare', false, true)
on conflict (kind, item_id) do update set name = excluded.name, rarity = excluded.rarity, is_default = excluded.is_default, active = true;

update public.catalog_items set active = false where (kind, item_id) not in (('characters', 'boy'), ('characters', 'girl'), ('characters', 'rina-01'), ('characters', 'arya-01'), ('characters', 'rena-01'), ('backs', 'sakura-navy'), ('backs', 'classic-red'), ('backs', 'midnight'), ('backs', 'paw-pink'), ('backs', 'gold'), ('backs', 'sakura-01'), ('tables', 'green-felt'), ('tables', 'sakura-felt'), ('tables', 'navy-felt'), ('tables', 'wood'), ('tables', 'table-sakura02'), ('tables', 'table-sakura01'), ('backgrounds', 'sakura-house'), ('backgrounds', 'room-night'), ('backgrounds', 'room-day'), ('backgrounds', 'room-sakura'), ('backgrounds', 'sunset'), ('backgrounds', 'sakura'), ('backgrounds', 'night'), ('backgrounds', 'forest'), ('backgrounds', 'gold'));

insert into public.gacha_banners(id, name, description, single_coins, single_mcash, ten_coins, ten_mcash, pity, sort, active) values
('standard', 'ตู้มาตรฐาน', 'สุ่มได้ทั้งตัวละคร ไพ่ โต๊ะ และพื้นหลัง · ได้ตัวละครซ้ำเอาไปอัพดาวได้', 300, 30, 2700, 270, 50, 1, true),
('sakura-ace', 'SAKURA ACE', 'ตู้ลิมิเต็ด — ตัวละครระดับตำนานออกง่ายขึ้นช่วงเวลาจำกัด', 300, 30, 2700, 270, 50, 2, true)
on conflict (id) do update set name = excluded.name, description = excluded.description, single_coins = excluded.single_coins, single_mcash = excluded.single_mcash, ten_coins = excluded.ten_coins, ten_mcash = excluded.ten_mcash, pity = excluded.pity, sort = excluded.sort, active = true;

update public.gacha_banners set active = false where id not in ('standard', 'sakura-ace');

insert into public.gacha_pool(banner_id, kind, item_id, weight) values
('standard', 'characters', 'boy', 46154),
('standard', 'characters', 'girl', 46154),
('standard', 'characters', 'rina-01', 10000),
('standard', 'characters', 'arya-01', 10000),
('standard', 'characters', 'rena-01', 10000),
('standard', 'backs', 'sakura-navy', 46154),
('standard', 'backs', 'classic-red', 46154),
('standard', 'backs', 'midnight', 46154),
('standard', 'backs', 'paw-pink', 35000),
('standard', 'backs', 'gold', 45000),
('standard', 'backs', 'sakura-01', 45000),
('standard', 'tables', 'green-felt', 46154),
('standard', 'tables', 'sakura-felt', 35000),
('standard', 'tables', 'navy-felt', 35000),
('standard', 'tables', 'wood', 35000),
('standard', 'tables', 'table-sakura02', 46154),
('standard', 'tables', 'table-sakura01', 46154),
('standard', 'backgrounds', 'sakura-house', 46154),
('standard', 'backgrounds', 'room-night', 35000),
('standard', 'backgrounds', 'room-day', 35000),
('standard', 'backgrounds', 'room-sakura', 35000),
('standard', 'backgrounds', 'sunset', 46154),
('standard', 'backgrounds', 'sakura', 46154),
('standard', 'backgrounds', 'night', 46154),
('standard', 'backgrounds', 'forest', 46154),
('standard', 'backgrounds', 'gold', 35000),
('sakura-ace', 'characters', 'boy', 46154),
('sakura-ace', 'characters', 'girl', 46154),
('sakura-ace', 'characters', 'rina-01', 30000),
('sakura-ace', 'characters', 'arya-01', 30000),
('sakura-ace', 'characters', 'rena-01', 30000),
('sakura-ace', 'backs', 'sakura-navy', 46154),
('sakura-ace', 'backs', 'classic-red', 46154),
('sakura-ace', 'backs', 'midnight', 46154),
('sakura-ace', 'backs', 'paw-pink', 35000),
('sakura-ace', 'backs', 'gold', 45000),
('sakura-ace', 'backs', 'sakura-01', 45000),
('sakura-ace', 'tables', 'green-felt', 46154),
('sakura-ace', 'tables', 'sakura-felt', 35000),
('sakura-ace', 'tables', 'navy-felt', 35000),
('sakura-ace', 'tables', 'wood', 35000),
('sakura-ace', 'tables', 'table-sakura02', 46154),
('sakura-ace', 'tables', 'table-sakura01', 46154),
('sakura-ace', 'backgrounds', 'sakura-house', 46154),
('sakura-ace', 'backgrounds', 'room-night', 35000),
('sakura-ace', 'backgrounds', 'room-day', 35000),
('sakura-ace', 'backgrounds', 'room-sakura', 35000),
('sakura-ace', 'backgrounds', 'sunset', 46154),
('sakura-ace', 'backgrounds', 'sakura', 46154),
('sakura-ace', 'backgrounds', 'night', 46154),
('sakura-ace', 'backgrounds', 'forest', 46154),
('sakura-ace', 'backgrounds', 'gold', 35000)
on conflict (banner_id, kind, item_id) do update set weight = excluded.weight;

delete from public.gacha_pool where banner_id in ('standard', 'sakura-ace') and (banner_id, kind, item_id) not in (('standard', 'characters', 'boy'), ('standard', 'characters', 'girl'), ('standard', 'characters', 'rina-01'), ('standard', 'characters', 'arya-01'), ('standard', 'characters', 'rena-01'), ('standard', 'backs', 'sakura-navy'), ('standard', 'backs', 'classic-red'), ('standard', 'backs', 'midnight'), ('standard', 'backs', 'paw-pink'), ('standard', 'backs', 'gold'), ('standard', 'backs', 'sakura-01'), ('standard', 'tables', 'green-felt'), ('standard', 'tables', 'sakura-felt'), ('standard', 'tables', 'navy-felt'), ('standard', 'tables', 'wood'), ('standard', 'tables', 'table-sakura02'), ('standard', 'tables', 'table-sakura01'), ('standard', 'backgrounds', 'sakura-house'), ('standard', 'backgrounds', 'room-night'), ('standard', 'backgrounds', 'room-day'), ('standard', 'backgrounds', 'room-sakura'), ('standard', 'backgrounds', 'sunset'), ('standard', 'backgrounds', 'sakura'), ('standard', 'backgrounds', 'night'), ('standard', 'backgrounds', 'forest'), ('standard', 'backgrounds', 'gold'), ('sakura-ace', 'characters', 'boy'), ('sakura-ace', 'characters', 'girl'), ('sakura-ace', 'characters', 'rina-01'), ('sakura-ace', 'characters', 'arya-01'), ('sakura-ace', 'characters', 'rena-01'), ('sakura-ace', 'backs', 'sakura-navy'), ('sakura-ace', 'backs', 'classic-red'), ('sakura-ace', 'backs', 'midnight'), ('sakura-ace', 'backs', 'paw-pink'), ('sakura-ace', 'backs', 'gold'), ('sakura-ace', 'backs', 'sakura-01'), ('sakura-ace', 'tables', 'green-felt'), ('sakura-ace', 'tables', 'sakura-felt'), ('sakura-ace', 'tables', 'navy-felt'), ('sakura-ace', 'tables', 'wood'), ('sakura-ace', 'tables', 'table-sakura02'), ('sakura-ace', 'tables', 'table-sakura01'), ('sakura-ace', 'backgrounds', 'sakura-house'), ('sakura-ace', 'backgrounds', 'room-night'), ('sakura-ace', 'backgrounds', 'room-day'), ('sakura-ace', 'backgrounds', 'room-sakura'), ('sakura-ace', 'backgrounds', 'sunset'), ('sakura-ace', 'backgrounds', 'sakura'), ('sakura-ace', 'backgrounds', 'night'), ('sakura-ace', 'backgrounds', 'forest'), ('sakura-ace', 'backgrounds', 'gold'));

insert into public.character_defs(id, max_stars, star_costs, bonus_pct) values
('boy', 5, null, null),
('girl', 5, null, '{7,9,12,14,16}'),
('rina-01', 5, null, null),
('arya-01', 5, null, '{9,11,13,15,18}'),
('rena-01', 5, null, '{7,9,10,12,13}')
on conflict (id) do update set max_stars = excluded.max_stars, star_costs = excluded.star_costs, bonus_pct = excluded.bonus_pct;
