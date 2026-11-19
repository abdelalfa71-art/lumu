// Cherche les sources d'un récitateur (archive.org + mp3quran) et écrit le résultat dans import-coran/resultat-recherche.txt
import fs from "node:fs";
const Q = JSON.parse(fs.readFileSync("import-coran/chercher.json", "utf8"));
const out = [];
const log = s => { out.push(s); console.log(s); };
const j = async u => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
try {
  const api = await j("https://www.mp3quran.net/api/v3/reciters?language=eng");
  const net = x => String(x || "").toLowerCase().replace(/[^a-z]/g, "");
  for (const x of api.reciters.filter(r => Q.mp3quran.some(k => net(r.name).includes(k))))
    for (const m of x.moshaf) log(`MP3QURAN ${x.name} | ${m.name} | ${m.server} | ${m.surah_total} sourates | ${m.surah_list}`);
} catch (e) { log("mp3quran erreur " + e.message); }
for (const q of Q.archive) {
  try {
    const r = await j(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&rows=40&output=json`);
    for (const d of r.response.docs) {
      try {
        const m = await j(`https://archive.org/metadata/${d.identifier}`);
        const mp3 = (m.files || []).filter(f => /\.mp3$/i.test(f.name) && f.source === "original").map(f => f.name);
        log(`ARCHIVE ${d.identifier} | ${d.title} | ${mp3.length} mp3 | ${mp3.slice(0, 150).join(" ; ")}`);
      } catch (e) { log(`ARCHIVE ${d.identifier} erreur ${e.message}`); }
    }
  } catch (e) { log("recherche erreur " + q + " " + e.message); }
}
fs.writeFileSync("import-coran/resultat-recherche.txt", out.join("\n") + "\n");
