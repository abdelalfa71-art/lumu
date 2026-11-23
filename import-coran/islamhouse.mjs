// Catalogue IslamHouse.com (API publique) : audios et vidéos en foulfouldé, français et haoussa.
// Les fichiers restent chez IslamHouse (lecture directe depuis leur serveur), avec la source et les auteurs cités.
import fs from "node:fs";
import { execFile } from "node:child_process";
/* Durée des audios (ffprobe lit seulement le début du fichier) ; gardée d'une semaine sur l'autre */
const duree = url => new Promise(ok => execFile("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", url], { timeout: 45000 }, (e, out) => ok(e ? 0 : Math.round(parseFloat(out) || 0))));
async function enParallele(l, n, f) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < l.length) { const k = i++; await f(l[k]); } })); }
const K = "paV29H2gm56kvLPy", LANGUES = ["ff", "fr", "ha"], TYPES = ["audios", "videos"];
const api = async u => { for (let i = 1; i <= 4; i++) { try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (i === 4) return null; await new Promise(o => setTimeout(o, 2000 * i)); } } };
fs.mkdirSync("maj/islamhouse", { recursive: true });
const resume = {};
for (const lg of LANGUES) {
  const cat = { langue: lg, source: "IslamHouse.com", maj: new Date().toISOString().slice(0, 10), audios: [], videos: [] };
  for (const ty of TYPES) {
    for (let page = 1; page <= 60; page++) {
      const j = await api(`https://api3.islamhouse.com/v3/${K}/main/${ty}/${lg}/${lg}/${page}/50/json`);
      const l = (j && j.data) || []; if (!l.length) break;
      l.forEach(x => {
        const att = (x.attachments || []).filter(a => /^https:\/\//.test(a.url) && /^(MP3|MP4|M4A)$/i.test(a.extension_type || "")).map(a => [a.description || x.title, a.url, a.size || ""]);
        if (!att.length) return;
        cat[ty].push({ id: x.id, t: x.title, d: (x.description || "").slice(0, 300), a: (x.prepared_by || []).filter(p => p.title && p.kind !== "publisher").map(p => p.title.replace(/\s+/g, " ").trim()).slice(0, 3), img: x.image || "", att, date: x.add_date });
      });
      if (l.length < 50) break;
    }
  }
  const ancien = fs.existsSync(`maj/islamhouse/${lg}.json`) ? JSON.parse(fs.readFileSync(`maj/islamhouse/${lg}.json`, "utf8")) : { audios: [] };
  const connu = new Map(); (ancien.audios || []).forEach(x => x.att.forEach(a => { if (a[3]) connu.set(a[1], a[3]); }));
  const aMesurer = []; cat.audios.forEach(x => x.att.forEach(a => { if (connu.has(a[1])) a[3] = connu.get(a[1]); else aMesurer.push(a); }));
  await enParallele(aMesurer, 8, async a => { a[3] = await duree(a[1]); });
  console.log(lg, "durées mesurées :", aMesurer.length);
  fs.writeFileSync(`maj/islamhouse/${lg}.json`, JSON.stringify(cat));
  resume[lg] = { audios: cat.audios.length, videos: cat.videos.length, fichiers: [...cat.audios, ...cat.videos].reduce((t, x) => t + x.att.length, 0) };
  console.log(lg, JSON.stringify(resume[lg]));
}
fs.writeFileSync("maj/islamhouse/index.json", JSON.stringify({ source: "IslamHouse.com", maj: new Date().toISOString().slice(0, 10), langues: resume }, null, 1));
