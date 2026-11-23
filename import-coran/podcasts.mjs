// Podcasts publics (lus depuis le serveur de leur éditeur, avec auteur et source affichés).
import fs from "node:fs";
const PODCASTS = [{ slug: "jaafar", langue: "ha", auteur: "Ja'afar Mahmud Adam", source: "Quran Central", rss: "https://rss.qurancentral.com/jaafar-mahmud-adam.rss" }];
const dec = s => String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&#8217;/g, "’").replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&#x?[0-9a-f]+;/gi, "").trim();
const sec = d => { if (!d) return 0; if (/^\d+$/.test(d)) return +d; return d.split(":").reverse().reduce((t, x, i) => t + (+x || 0) * 60 ** i, 0); };
fs.mkdirSync("maj/podcasts", { recursive: true });
const parLangue = {};
for (const p of PODCASTS) {
  const x = await (await fetch(p.rss, { headers: { "user-agent": "Mozilla/5.0" } })).text();
  const items = x.split("<item>").slice(1).map(b => ({ t: dec((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1]), url: (b.match(/<enclosure[^>]*url="([^"]+)"/) || [])[1] || "", dur: sec((b.match(/<itunes:duration>([^<]*)/) || [])[1]), date: Date.parse((b.match(/<pubDate>([^<]*)/) || [])[1] || "") || 0 }))
    .filter(e => /^https:\/\//.test(e.url)).sort((a, b) => a.date - b.date);
  items.forEach((e, i) => { e.id = `qc-${p.slug}-${i + 1}`; });
  (parLangue[p.langue] = parLangue[p.langue] || []).push({ ...p, items });
  console.log(p.slug, items.length, "épisodes");
}
for (const [lg, l] of Object.entries(parLangue)) fs.writeFileSync(`maj/podcasts/${lg}.json`, JSON.stringify({ maj: new Date().toISOString().slice(0, 10), podcasts: l }));
