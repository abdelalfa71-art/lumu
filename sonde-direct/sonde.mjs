// Sonde : chaînes de télévision islamiques en direct sur YouTube (recherche filtrée « en direct »).
import fs from "node:fs";
const out = [], vus = new Map();
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "accept-language": "fr-FR,fr;q=0.9" };
const pause = ms => new Promise(r => setTimeout(r, ms));
function marcher(o, f) { if (Array.isArray(o)) o.forEach(x => marcher(x, f)); else if (o && typeof o === "object") { f(o); for (const k in o) marcher(o[k], f); } }
const txt = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join("") || "") : "";
const Q = ["قناة القرآن الكريم بث مباشر", "قناة السنة النبوية بث مباشر", "huda tv live", "iqraa tv live", "peace tv live", "zad tv live", "قناة المجد القرآن الكريم بث مباشر", "dubai quran tv live", "sharjah quran live", "قناة الرسالة بث مباشر", "hausa islamic tv live", "manara tv live hausa", "sunnah tv kano live", "islam channel live", "chaine islamique en direct", "coran en direct tv", "fulfulde tv live", "al quran al kareem tv live", "makkah live", "madinah live", "kuwait quran tv live", "egypt quran radio tv live", "Al Azhar tv live"];
for (const q of Q) {
  try {
    const t = await (await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&sp=EgJAAQ%253D%253D", { headers: UA })).text();
    const m = t.match(/var ytInitialData = (\{.*?\});<\/script>/s); if (!m) { out.push("Q " + q + " pas de données"); continue; }
    marcher(JSON.parse(m[1]), o => { const v = o.videoRenderer; if (!v || !v.videoId) return;
      const ch = (v.ownerText?.runs || [])[0]; const chId = ch?.navigationEndpoint?.browseEndpoint?.browseId || "";
      const badge = JSON.stringify(v.badges || "") + JSON.stringify(v.thumbnailOverlays || ""); const live = /LIVE|DIRECT|EN DIRECT/i.test(badge) || /regard|watching/i.test(txt(v.viewCountText));
      const verif = JSON.stringify(v.ownerBadges || "").includes("VERIFIED");
      if (live && !vus.has(chId)) vus.set(chId, { chaine: ch?.text || "", video: v.videoId, titre: txt(v.title), vues: txt(v.viewCountText), verif, q }); });
  } catch (e) { out.push("Q " + q + " erreur " + e.message); }
  await pause(2500);
}
out.push("=== " + vus.size + " chaînes en direct ===");
for (const [id, v] of vus) out.push(`${id}\t${v.verif ? "✔" : " "}\t${v.vues}\t${v.chaine}\t${v.video}\t${v.titre.slice(0, 80)}`);
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
