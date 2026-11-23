// Sonde : audios de Mouhammad Ali Dewa (Cameroun, foulfouldé) — podcasts publics, IslamHouse, archive.org.
import fs from "node:fs";
const out = [];
for (const q of ["Mouhammed Ali Dewa", "Muhammad Ali Dewa", "Mohamed Ali Dewa", "Ali Dewa", "Dewa fulfulde", "Mouhammad Aliyu Dewa", "tafsir fulfulde Cameroun"]) {
  try { const j = await (await fetch("https://itunes.apple.com/search?media=podcast&limit=15&term=" + encodeURIComponent(q))).json(); j.results.forEach(r => out.push(["PODCAST", q, r.collectionName, r.artistName, r.trackCount, r.feedUrl].join(" | "))); } catch (e) { out.push(q + " " + e.message); }
  try { const j = await (await fetch("https://archive.org/advancedsearch.php?rows=15&output=json&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&q=" + encodeURIComponent(q))).json(); (j.response.docs || []).forEach(d => out.push(["ARCHIVE", q, d.identifier, d.title, d.creator, d.licenseurl || ""].join(" | "))); } catch (e) {}
}
for (const lg of ["ff"]) for (const f of ["audios", "videos"]) { try { const d = JSON.parse(fs.readFileSync(`maj/islamhouse/${lg}.json`, "utf8")); d[f].filter(x => /dewa|dewwa/i.test(x.a.join(" ") + x.t)).forEach(x => out.push(["ISLAMHOUSE", f, x.t, x.a.join(", ")].join(" | "))); } catch (e) {} }
fs.writeFileSync("sonde-direct/resultat.txt", [...new Set(out)].join("\n"));
