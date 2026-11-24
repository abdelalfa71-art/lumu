// Sonde : podcasts islamiques en français (annuaire Apple Podcasts) et contenu de leurs flux RSS.
import fs from "node:fs";
const out = [], vus = new Map();
const pause = ms => new Promise(r => setTimeout(r, ms));
const termes = ["minhaj salafiyah", "tafsir coran français", "rappels islamiques", "sounnah", "conférence islamique", "cours islamique", "le monothéisme", "muslim central français", "hadith français islam", "sira prophète muhammad", "salaf conférence", "explication coran", "imam mosquée rappel", "rappel islam", "tawhid", "science islamique cours", "fiqh islam", "ilm char3i", "riyad salihin", "nawawi quarante hadiths"];
for (const t of termes) {
  try { const j = await (await fetch("https://itunes.apple.com/search?media=podcast&limit=25&country=fr&term=" + encodeURIComponent(t))).json();
    for (const r of j.results || []) if (r.feedUrl && !vus.has(r.feedUrl)) vus.set(r.feedUrl, { nom: r.collectionName, auteur: r.artistName, nb: r.trackCount, genre: (r.genres || []).join("/"), date: (r.releaseDate || "").slice(0, 10), t });
  } catch (e) { out.push("erreur " + t + " " + e.message); }
  await pause(800);
}
out.push("=== " + vus.size + " podcasts ===");
for (const [url, v] of vus) {
  if (!/relig|spiritu|islam|religion/i.test(v.genre + v.nom)) continue;
  let info = "";
  try { const x = await (await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) })).text();
    const items = x.split("<item>").slice(1); const titres = items.slice(0, 3).map(b => ((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim().slice(0, 60));
    const lic = (x.match(/<copyright>([\s\S]*?)<\/copyright>/) || [])[1] || ""; const desc = ((x.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, "").trim().slice(0, 160);
    info = `items=${items.length} | ©${lic.slice(0, 40)} | ${titres.join(" ; ")} | ${desc}`;
  } catch (e) { info = "flux illisible " + e.message; }
  out.push(`${v.nom} — ${v.auteur} [${v.genre}] (${v.nb}, ${v.date})\n  ${url}\n  ${info}`);
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
