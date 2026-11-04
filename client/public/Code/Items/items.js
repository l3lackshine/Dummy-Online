/* items.js — ข้อมูลไอเทม (ชา · คัมภีร์ · ตั๋ว · กล่อง) จาก economy.js + จำนวนที่มีจากฐานข้อมูล
   รูปไอเทม: Assets/Item/Mats/<id>.webp
   Public: Items.info(id) · Items.icon(id, cssClass) · Items.qty(id) · Items.list()
   EXTEND: ไอเทมใหม่ = เพิ่มใน ITEMS ของ economy.js (ทั้ง server และ client) + วางรูปใน Assets/Item/Mats/ */
(function () {
  'use strict';
  const Economy = window.Economy;
  const { dbOn } = window.UiKit;

  const iconPath = id => './Assets/Item/Mats/' + id + '.webp';

  window.Items = {
    info: id => Object.assign({ id, name: id, desc: '' }, Economy.ITEMS[id] || {}, { icon: iconPath(id) }),
    icon: (id, cssClass) => `<img class="${cssClass || 'it-ic'}" src="${iconPath(id)}" alt="">`,
    qty: id => (dbOn() ? DB.qty('items', id) : 0), // ไม่ล็อกอิน = ไม่มีไอเทม
    list: () => Object.keys(Economy.ITEMS),
  };
})();
