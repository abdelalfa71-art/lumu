// Hadiths expliqués (HadeethEnc.com) : reproduits sans modification, éditeur et source cités.
// maj/hadiths/<langue>/index.json (catégories + liste) et maj/hadiths/<langue>/<id>.json (détail).
import fs from "node:fs";
const LANGUES = ["fr", "ff", "ha"];
const api = async u => { for (let i = 1; i <= 5; i++) { try { const r = await fetch("https://hadeethenc.com/api/v1/" + u); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (i === 5) return null; await new Promise(o => setTimeout(o, 1500 * i)); } } };
async function enParallele(l, n, f) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < l.length) { const k = i++; await f(l[k]); } })); }
for (const lg of LANGUES) {
  const dir = `maj/hadiths/${lg}`; fs.mkdirSync(dir, { recursive: true });
  const cats = (await api(`categories/roots/?language=${lg}`)) || [];
  const liste = new Map();
  for (const c of cats) {
    for (let p = 1; p <= 200; p++) {
      const j = await api(`hadeeths/list/?language=${lg}&category_id=${c.id}&page=${p}&per_page=100`);
      const d = (j && j.data) || []; d.forEach(h => { if (!liste.has(h.id)) liste.set(h.id, { id: h.id, t: h.title, c: [] }); liste.get(h.id).c.push(c.id); });
      if (!j || +j.meta.current_page >= +j.meta.last_page) break;
    }
  }
  const ids = [...liste.keys()]; let n = 0;
  await enParallele(ids, 6, async id => {
    const F = `${dir}/${id}.json`; if (fs.existsSync(F)) return;
    const h = await api(`hadeeths/one/?language=${lg}&id=${id}`); if (!h || !h.hadeeth) return;
    fs.writeFileSync(F, JSON.stringify({ id: h.id, titre: h.title, hadith: h.hadeeth, attribution: h.attribution || "", grade: h.grade || "", explication: h.explanation || "", benefices: h.hints || [], mots: h.words_meanings || [], reference: h.reference || "", ar: h.hadeeth_ar || "" }));
    n++;
  });
  /* Seuls les hadiths authentiques ou bons sont gardés : un hadith jugé faible est écarté */
  const FAIBLE = /ضعيف|faible|rauni|weak|da.?if/i;
  const garde = [...liste.values()].filter(x => { const F = `${dir}/${x.id}.json`; if (!fs.existsSync(F)) return false; if (FAIBLE.test(JSON.parse(fs.readFileSync(F, "utf8")).grade || "")) { fs.unlinkSync(F); return false; } return true; });
  fs.writeFileSync(`${dir}/index.json`, JSON.stringify({ source: "HadeethEnc.com", langue: lg, maj: new Date().toISOString().slice(0, 10), categories: cats.map(c => ({ id: c.id, t: c.title, n: garde.filter(x => x.c.includes(c.id)).length })), hadiths: garde }));
  console.log(lg, "catégories", cats.length, "hadiths", garde.length, "nouveaux", n);
}
