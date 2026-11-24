// Sonde : audios du Cheikh Moussa Aldjayi (et autres prêcheurs en foulfouldé) sur archive.org et Apple Podcasts.
import fs from "node:fs";
const out = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
for (const q of ["aldjayi OR aldjai OR \"al djayi\" OR aljayi OR \"al-jayi\" OR aldjaii OR djayi", "\"moussa garoua\" OR \"musa garoua\" OR \"moussa garwa\"", "(fulfulde OR foulfoulde OR fulfude OR foulfouldé OR fulbe OR peul) AND mediatype:audio", "language:(ful OR fuf OR fub OR ff) AND mediatype:audio", "(dewa OR \"mahmoud goni\" OR \"moussa souleymane\" OR wazou OR waazu) AND mediatype:audio"]) {
  try { const j = await (await fetch("https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) + "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=item_size&fl[]=downloads&fl[]=mediatype&sort[]=downloads+desc&rows=80&output=json")).json();
    out.push("\n=== " + q + " : " + j.response.numFound);
    for (const d of j.response.docs) out.push(`${d.identifier}\t${d.mediatype}\t${d.downloads || 0}\t${Math.round((d.item_size || 0) / 1e6)}Mo\t${[].concat(d.creator || "").join(",").slice(0, 40)}\t${String(d.title).slice(0, 90)}`);
  } catch (e) { out.push("erreur " + e.message); }
  await pause(1500);
}
for (const t of ["aldjayi", "moussa aldjayi", "fulfulde wazou", "foulfoulde islam", "fulfulde tafsir", "wazou fulfulde", "pulaar wazou", "fulfulde islamic", "garoua wazou"]) {
  try { const j = await (await fetch("https://itunes.apple.com/search?media=podcast&limit=25&term=" + encodeURIComponent(t))).json();
    out.push("\n=== podcasts " + t + " : " + (j.results || []).length);
    for (const r of j.results || []) out.push(`${r.collectionName} — ${r.artistName} (${r.trackCount}) ${r.feedUrl}`);
  } catch (e) { out.push("podcasts erreur " + e.message); }
  await pause(3200);
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
