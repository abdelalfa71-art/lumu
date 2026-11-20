// Construit les repères de temps par verset (mp3quran) pour nos récitateurs, et la géométrie des versets sur les pages.
// Sortie : coran/temps/<lecteur>.json et coran/temps/geometrie.json
import fs from "node:fs";
const j = async (u, n = 4) => { for (let i = 1; ; i++) { try { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return await r.json(); } catch (e) { if (i >= n) throw new Error(e.message + " " + u); await new Promise(r => setTimeout(r, 1500 * i)); } } };
const CIBLES = {
  "abdurrahman-as-sudais": "abdulrahman-sudais/r1/", "mishary-al-afasy": "mishary-alafasy/r1/", "maher-al-muaiqly": "maher-muaiqly/r1/",
  "saad-al-ghamidi": "saad-ghamdi/r1/", "abdul-basit-abdus-samad": "abdulbasit-abdulsamad/r3/", "mahmoud-khalil-al-husary": "mahmoud-husary/r1/",
  "muhammad-siddiq-al-minshawi": "muhammad-minshawi/r1/", "saud-ash-shuraim": "saud-shuraim/r1/", "yasser-al-dosari": "yasser-dosari/r1/",
  "ahmed-al-ajmi": "ahmad-ajmi/r1/", "abu-bakr-ash-shatri": "abubakr-shatri/r1/", "yusuf-al-aidarous": "yousef-aidarous/r1/", "ibrahim-ad-dosari": "ibrahim-dosari"
};
const reads = await j("https://mp3quran.net/api/v3/ayat_timing/reads");
fs.mkdirSync("coran/temps", { recursive: true });
const rapport = [];
let geo = null;
for (const [cle, dossier] of Object.entries(CIBLES)) {
  const r = reads.find(x => String(x.folder_url || "").includes(dossier));
  if (!r) { rapport.push(`${cle} : aucun repère (dossier ${dossier} absent)`); continue; }
  const out = { lecteur: cle, read: r.id, dossier: r.folder_url, s: {} };
  const g = geo ? null : {};
  let ok = 0;
  for (let n = 1; n <= 114; n++) {
    try {
      const t = await j(`https://mp3quran.net/api/v3/ayat_timing?surah=${n}&read=${r.id}`);
      const versets = t.filter(a => a.ayah > 0).sort((a, b) => a.ayah - b.ayah);
      out.s[n] = { d: versets.map(a => a.start_time), f: Math.max(...t.map(a => a.end_time)) };
      if (g) g[n] = versets.map(a => [a.page ? +String(a.page).replace(/^.*\/(\d+)\.svg$/, "$1") : 0, a.polygon || ""]);
      ok++;
    } catch (e) { rapport.push(`${cle} sourate ${n} : ${e.message}`); }
  }
  if (g && ok === 114) geo = g;
  fs.writeFileSync(`coran/temps/${cle}.json`, JSON.stringify(out));
  rapport.push(`${cle} : read ${r.id} ${r.folder_url} · ${ok}/114 sourates`);
}
if (geo) fs.writeFileSync("coran/temps/geometrie.json", JSON.stringify(geo));
try { const svg = await (await fetch("https://www.mp3quran.net/api/quran_pages_svg/003.svg")).text(); rapport.push("SVG page 3 : " + svg.slice(0, 400).replace(/\s+/g, " ")); } catch (e) {}
fs.writeFileSync("coran/temps/rapport.txt", rapport.join("\n") + "\n");
console.log(rapport.join("\n"));
