// Sonde : autres podcasts publics du Cheikh Ja'afar Mahmud Adam (recherche Apple Podcasts + Muslim Central).
import fs from "node:fs";
const out = [];
for (const q of ["Jaafar Mahmud Adam", "Ja'afar Mahmud Adam", "Sheikh Jafar Mahmud Adam", "Jafar Adam Hausa", "Sheikh Ja'afar tafsir"]) {
  try {
    const j = await (await fetch("https://itunes.apple.com/search?media=podcast&limit=25&term=" + encodeURIComponent(q))).json();
    j.results.forEach(r => out.push([q, r.collectionName, r.artistName, r.trackCount, r.feedUrl].join(" | ")));
  } catch (e) { out.push(q + " " + e.message); }
}
for (const u of ["https://rss.muslimcentral.com/jaafar-mahmud-adam.rss", "https://feeds.muslimcentral.com/jaafar-mahmud-adam", "https://rss.qurancentral.com/jaafar-mahmud-adam-hadith.rss"]) {
  try { const r = await fetch(u); const t = await r.text(); out.push(`${u} [${r.status}] items=${(t.match(/<item>/g) || []).length} ${((t.match(/<title>([^<]*)/) || [])[1] || "")}`); } catch (e) { out.push(u + " " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", [...new Set(out)].join("\n"));
