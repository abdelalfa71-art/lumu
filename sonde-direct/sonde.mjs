// Sonde : recherche des audios/vidéos du Cheikh Mouhammad Ali Dewa (YouTube, archive.org, Audiomack).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const req = ["Mougaddima loubabou taawil", "loubabou taawil Ali Dewa", "Tafsir abgara mahamed Ali dewa", "Kitabo bouhari Ali dewa", "Modibbo Mohamed Ali Dewa", "Mahamed Ali Dewa", "Mohamed Ali Dewa rahimahoullah", "Mohamed Ali Dewa tafsir", "Mohamed Ali Dewa hala", "Mohamed Ali Dewa wazou", "Cheick Mohamed Ali Dewa", "Mohamed Aly Dewa", "Ali Dewa Ngaoundéré", "Ali Dewa loubabou", "Mallam Ali Dewa", "Mohamed Ali Dewa ramadan", "Mohamed Ali Dewa fulfulde wazou", "Mohamed Ali Dewa audio"];
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
for (const q of req) {
  await new Promise(r => setTimeout(r, 2500));
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
const pert = [...vus].filter(([, v]) => /d[eé]wa|diwa|ديوا|loubabou|lubab/i.test(v.titre) && !/DEWA\)/.test(v.chaine));
out.push("\n=== VIDEOS PERTINENTES (" + pert.length + " / " + vus.size + ") ===");
for (const [id, v] of pert) out.push(`${id}\t${v.duree}\t${v.vues}\t${v.chaine} (${v.chId})\t${v.titre}`);
const chaines = {}; for (const [, v] of pert) chaines[v.chaine + " " + v.chId] = (chaines[v.chaine + " " + v.chId] || 0) + 1;
out.push("\n=== CHAINES ===\n" + Object.entries(chaines).sort((a, b) => b[1] - a[1]).map(x => x[1] + "\t" + x[0]).join("\n"));
out.push("\n=== AUTRES (titres sans Dewa) ===");
for (const [id, v] of [...vus].filter(([, v]) => !/d[eé]wa|diwa|ديوا/i.test(v.titre + " " + v.chaine) && v.chaine !== "Dubai Electricity and Water Authority (DEWA)").slice(0, 60)) out.push(`${id}\t${v.chaine}\t${v.titre}`);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
