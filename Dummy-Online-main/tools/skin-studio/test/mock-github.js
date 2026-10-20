// GitHub จำลองในหน่วยความจำ (contents + git data API) สำหรับทดสอบ
const assert = require('assert');
function mockGitHub(initial) {
  let n = 0; const sha = () => 's' + (++n), blobs = new Map(), trees = new Map(), commits = new Map(), calls = [];
  const put = buf => { const s = sha(); blobs.set(s, Buffer.from(buf)); return s; };
  const t0 = new Map(Object.entries(initial).map(([p, c]) => [p, put(c)])), ts = sha(); trees.set(ts, t0);
  let head = sha(); commits.set(head, { tree: ts, parents: [], message: 'init' });
  const res = (status, data) => ({ ok: status < 400, status, json: async () => data });
  const m = { calls, forceConflict: false, headFiles: () => trees.get(commits.get(head).tree), read: p => { const s = m.headFiles().get(p); return s ? blobs.get(s) : null; }, head: () => head, commits,
    async fetch(url, opts) {
      const u = new URL(url), p = decodeURIComponent(u.pathname.replace('/repos/o/r', '')) || '', method = (opts && opts.method) || 'GET', body = opts && opts.body ? JSON.parse(opts.body) : null;
      calls.push(method + ' ' + p);
      if (!url.startsWith('https://api.github.com/repos/o/r')) return res(404, { message: 'Not Found' });
      if ((opts.headers || {}).Authorization !== 'Bearer tkn') return res(401, { message: 'Bad credentials' });
      if (p === '') return res(200, { full_name: 'o/r', permissions: { push: true }, private: false });
      if (p === '/branches/main') return res(200, { name: 'main' });
      if (p.startsWith('/contents/')) { const f = m.read(p.slice(10)); return f ? res(200, { encoding: 'base64', content: f.toString('base64').replace(/(.{60})/g, '$1\n'), sha: 'x' }) : res(404, { message: 'Not Found' }); }
      if (p === '/git/ref/heads/main') return res(200, { object: { sha: head } });
      if (p.startsWith('/git/commits/') && method === 'GET') return res(200, { tree: { sha: commits.get(p.slice(13)).tree } });
      if (p === '/git/blobs' && method === 'POST') { assert.strictEqual(body.encoding, 'base64'); return res(201, { sha: put(Buffer.from(body.content, 'base64')) }); }
      if (p === '/git/trees') { const t = new Map(trees.get(commits.get(head).tree)); for (const e of body.tree) { if (e.sha === null) t.delete(e.path); else t.set(e.path, e.sha); } const s = sha(); trees.set(s, t); return res(201, { sha: s }); }
      if (p === '/git/commits' && method === 'POST') { const s = sha(); commits.set(s, { tree: body.tree, parents: body.parents, message: body.message }); return res(201, { sha: s, html_url: 'https://github.com/o/r/commit/' + s }); }
      if (p === '/git/refs/heads/main' && method === 'PATCH') { if (m.forceConflict || !commits.get(body.sha).parents.includes(head)) return res(422, { message: 'Update is not a fast forward' }); head = body.sha; return res(200, {}); }
      return res(404, { message: 'no route ' + method + ' ' + p });
    } };
  return m;
}
module.exports = mockGitHub;
