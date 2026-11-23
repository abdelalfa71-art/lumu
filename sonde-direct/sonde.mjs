// Sonde : recherche des audios/vidéos du Cheikh Mouhammad Ali Dewa (YouTube, archive.org, Audiomack).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const req = ["Mouhamed Ali Dewa", "Mohammed Ali Dewa", "Muhammad Ali Dewa", "Ali Dewa tafsir", "Ali Dewa fulfulde", "oustaz Ali Dewa", "cheikh Ali Dewa", "Ali Dewa wazou", "محمد علي ديوا", "Ali Dewa bouhari", "Ali Dewa loubabou", "Ali Diwa fulfulde", "Mallam Ali Dewa", "Ali Dewa Ngaoundéré", "Ali Dewa Garoua"];
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
for (const q of req) {
  try {
    const t = await (await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=EgIQAQ%253D%253D", { headers: UA })).text();
    const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) { out.push("YT " + q + " : pas de données"); continue; }
    let n = 0;
    marcher(JSON.parse(m[1]), o => { const v = o.videoRenderer; if (!v || !v.videoId) return; n++;
      const titre = (v.title?.runs || []).map(r => r.text).join(""), ch = (v.ownerText?.runs || [])[0], chId = ch?.navigationEndpoint?.browseEndpoint?.browseId || "";
      if (!vus.has(v.videoId)) vus.set(v.videoId, { titre, chaine: ch?.text || "", chId, duree: v.lengthText?.simpleText || "", vues: v.viewCountText?.simpleText || "", q }); });
    out.push("YT " + q + " : " + n);
  } catch (e) { out.push("YT " + q + " erreur " + e.message); }
}
const pert = [...vus].filter(([, v]) => /d[eé]wa|diwa|ديوا/i.test(v.titre + " " + v.chaine));
out.push("\n=== VIDEOS PERTINENTES (" + pert.length + " / " + vus.size + ") ===");
for (const [id, v] of pert) out.push(`${id}\t${v.duree}\t${v.vues}\t${v.chaine} (${v.chId})\t${v.titre}`);
const chaines = {}; for (const [, v] of pert) chaines[v.chaine + " " + v.chId] = (chaines[v.chaine + " " + v.chId] || 0) + 1;
out.push("\n=== CHAINES ===\n" + Object.entries(chaines).sort((a, b) => b[1] - a[1]).map(x => x[1] + "\t" + x[0]).join("\n"));
out.push("\n=== AUTRES (titres sans Dewa) ===");
for (const [id, v] of [...vus].filter(([, v]) => !/d[eé]wa|diwa|ديوا/i.test(v.titre + " " + v.chaine)).slice(0, 60)) out.push(`${id}\t${v.chaine}\t${v.titre}`);
for (const q of ["dewa", "\"ali dewa\"", "diwa fulfulde"]) {
  try { const j = await (await fetch("https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) + "&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=licenseurl&rows=50&output=json", { headers: UA })).json();
    out.push("\n=== archive.org " + q + " : " + j.response.numFound); for (const d of j.response.docs) out.push(d.identifier + "\t" + d.mediatype + "\t" + (d.licenseurl || "") + "\t" + d.title);
  } catch (e) { out.push("archive " + e.message); }
}
for (const q of ["ali dewa", "dewa fulfulde"]) {
  try { const t = await (await fetch("https://audiomack.com/search?q=" + encodeURIComponent(q), { headers: UA })).text();
    out.push("\n=== audiomack " + q + " : " + ((t.match(/"title":"[^"]*"/g) || []).slice(0, 20).join(" | "))); } catch (e) { out.push("audiomack " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
