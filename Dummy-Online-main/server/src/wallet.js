'use strict';
// Server-authoritative virtual coin wallet. A settlement is append-only and idempotent.
// WALLET_FILE may point at persistent storage; on ephemeral hosts, configure a persistent disk/database.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Wallet {
  constructor({ initialBalance = 5000, file = process.env.WALLET_FILE === 'memory' ? '' : (process.env.WALLET_FILE || path.join(process.cwd(), 'data', 'wallets.json')) } = {}) {
    this.initialBalance = Math.max(0, Math.floor(Number(initialBalance) || 0));
    this.file = file ? path.resolve(file) : '';
    this.accounts = new Map();
    this.reservations = new Map();
    this.settlements = new Set();
    this.ledger = [];
    if (this.file) this.load();
  }
  load() {
    try {
      const d = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.accounts = new Map(d.accounts || []);
      this.reservations = new Map(d.reservations || []);
      this.settlements = new Set(d.settlements || []);
      this.ledger = Array.isArray(d.ledger) ? d.ledger : [];
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ accounts: [...this.accounts], reservations: [...this.reservations], settlements: [...this.settlements], ledger: this.ledger }));
    fs.renameSync(tmp, this.file);
  }
  id(value) { return /^[a-f0-9]{32,64}$/i.test(String(value || '')) ? String(value).toLowerCase() : crypto.randomBytes(16).toString('hex'); }
  ensure(walletId, name = 'ผู้เล่น') {
    const id = this.id(walletId);
    if (!this.accounts.has(id)) {
      this.accounts.set(id, { balance: this.initialBalance, createdAt: Date.now(), name: String(name).slice(0, 40), owned: [] });
      this.ledger.push({ id: crypto.randomUUID(), walletId: id, type: 'grant', amount: this.initialBalance, balanceAfter: this.initialBalance, reason: 'initial virtual coins', at: Date.now() });
      this.save();
    } else if (name) this.accounts.get(id).name = String(name).slice(0, 40);
    if (!Array.isArray(this.accounts.get(id).owned)) this.accounts.get(id).owned = [];
    return { walletId: id, balance: this.accounts.get(id).balance, reserved: this.reserved(id) };
  }
  reserved(walletId) { let n = 0; for (const r of this.reservations.values()) if (r.walletId === walletId) n += r.amount; return n; }
  balance(walletId) { const a = this.accounts.get(walletId); return a ? a.balance : 0; }
  state(walletId) { const a = this.accounts.get(walletId); return { walletId, balance: a ? a.balance : 0, reserved: this.reserved(walletId), owned: a && Array.isArray(a.owned) ? a.owned.slice() : [] }; }
  reserve(walletId, reservationId, amount, reason = 'game stake reserve') {
    amount = Math.floor(Number(amount));
    if (!this.accounts.has(walletId)) return { ok: false, error: 'ไม่พบกระเป๋าเหรียญ' };
    if (!reservationId || !Number.isSafeInteger(amount) || amount <= 0) return { ok: false, error: 'วงเงินสำรองไม่ถูกต้อง' };
    if (this.reservations.has(reservationId)) return { ok: true, duplicate: true, ...this.state(walletId) };
    if (this.balance(walletId) < amount) return { ok: false, error: `เหรียญไม่พอ ต้องมีอย่างน้อย ${amount} เหรียญสำหรับวงเงินของตานี้` };
    this.accounts.get(walletId).balance -= amount;
    this.reservations.set(reservationId, { walletId, amount, reason, createdAt: Date.now() });
    this.ledger.push({ id: crypto.randomUUID(), walletId, type: 'reserve', amount: -amount, balanceAfter: this.balance(walletId), reservationId, reason, at: Date.now() });
    this.save(); return { ok: true, ...this.state(walletId) };
  }
  release(reservationId, reason = 'reservation refund') {
    const r = this.reservations.get(reservationId); if (!r) return { ok: true, duplicate: true };
    this.reservations.delete(reservationId); const a = this.accounts.get(r.walletId); a.balance += r.amount;
    this.ledger.push({ id: crypto.randomUUID(), walletId: r.walletId, type: 'release', amount: r.amount, balanceAfter: a.balance, reservationId, reason, at: Date.now() });
    this.save(); return { ok: true, ...this.state(r.walletId) };
  }
  releaseOrphanedReservations(reason = 'unfinished game recovered after server restart') {
    if (!this.reservations.size) return 0;
    const rows = [...this.reservations.entries()];
    for (const [reservationId, r] of rows) {
      this.reservations.delete(reservationId); const a = this.accounts.get(r.walletId); if (!a) continue; a.balance += r.amount;
      this.ledger.push({ id: crypto.randomUUID(), walletId: r.walletId, type: 'release', amount: r.amount, balanceAfter: a.balance, reservationId, reason, at: Date.now() });
    }
    this.save(); return rows.length;
  }
  spend(walletId, transactionId, amount, reason = 'virtual coin purchase') {
    amount = Math.floor(Number(amount));
    const tx = 'spend:' + String(transactionId || '');
    if (!this.accounts.has(walletId)) return { ok: false, error: 'ไม่พบกระเป๋าเหรียญ' };
    if (!transactionId || String(transactionId).length > 120 || !Number.isSafeInteger(amount) || amount < 0) return { ok: false, error: 'รายการใช้เหรียญไม่ถูกต้อง' };
    if (this.settlements.has(tx)) { const old = this.ledger.findLast(x => x.type === 'spend' && x.transactionId === String(transactionId)); if (!old || old.walletId !== walletId || old.amount !== -amount || old.reason !== String(reason).slice(0, 160)) return { ok: false, error: 'รหัสรายการซื้อถูกใช้ไปแล้วกับข้อมูลอื่น' }; return { ok: true, duplicate: true, ...this.state(walletId), transactionId: String(transactionId) }; }
    const itemId = String(reason).startsWith('shop item ') ? String(reason).slice('shop item '.length) : '';
    const account = this.accounts.get(walletId);
    if (itemId && account.owned.includes(itemId)) return { ok: true, alreadyOwned: true, ...this.state(walletId), transactionId: String(transactionId) };
    if (this.balance(walletId) < amount) return { ok: false, error: 'เหรียญไม่พอ' };
    const a = this.accounts.get(walletId); a.balance -= amount; if (itemId) a.owned.push(itemId); this.settlements.add(tx);
    this.ledger.push({ id: crypto.randomUUID(), walletId, type: 'spend', amount: -amount, balanceAfter: a.balance, transactionId: String(transactionId), reason: String(reason).slice(0, 160), at: Date.now() });
    this.save(); return { ok: true, duplicate: false, ...this.state(walletId), transactionId: String(transactionId) };
  }
  settleBatch(settlementId, entries) {
    if (!settlementId || !Array.isArray(entries) || !entries.length) return { ok: false, error: 'รายการชำระบัญชีไม่ถูกต้อง' };
    if (this.settlements.has(settlementId)) return { ok: true, duplicate: true, states: entries.map(e => this.state(e.walletId)) };
    const seen = new Set();
    for (const e of entries) {
      const r = this.reservations.get(e.reservationId), delta = Number(e.delta);
      if (!r || r.walletId !== e.walletId) return { ok: false, error: 'ไม่พบวงเงินสำรองของผู้เล่น' };
      if (seen.has(e.walletId)) return { ok: false, error: 'กระเป๋าเหรียญซ้ำในรายการชำระ' };
      seen.add(e.walletId);
      if (!Number.isSafeInteger(delta) || Math.abs(delta) > r.amount) return { ok: false, error: 'ผลเหรียญเกินวงเงินที่สำรองไว้' };
      if (this.balance(e.walletId) + r.amount + delta < 0) return { ok: false, error: 'ยอดเหรียญหลังชำระต้องไม่ติดลบ' };
    }
    // Validate everything first, then mutate all wallets in one synchronous transaction.
    const states = [];
    for (const e of entries) {
      const r = this.reservations.get(e.reservationId), a = this.accounts.get(e.walletId);
      this.reservations.delete(e.reservationId); a.balance += r.amount + Number(e.delta);
      this.ledger.push({ id: crypto.randomUUID(), walletId: e.walletId, type: 'settlement', amount: Number(e.delta), balanceAfter: a.balance, settlementId, reservationId: e.reservationId, reason: String(e.reason || 'game result'), at: Date.now() });
      states.push(this.state(e.walletId));
    }
    this.settlements.add(settlementId); this.save(); return { ok: true, duplicate: false, states };
  }
  recent(walletId, limit = 30) { return this.ledger.filter(x => x.walletId === walletId).slice(-Math.max(1, Math.min(100, limit))); }
}
module.exports = Wallet;
