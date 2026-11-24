// Podcasts publics (lus depuis le serveur de leur éditeur, avec auteur et source affichés).
import fs from "node:fs";
import { execFile } from "node:child_process";
const mesurer = url => new Promise(ok => execFile("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", url], { timeout: 60000 }, (e, out) => ok(e ? 0 : Math.round(parseFloat(out) || 0))));
const PODCASTS = [
  { slug: "jaafar", langue: "ha", auteur: "Ja'afar Mahmud Adam", source: "Quran Central", rss: "https://rss.qurancentral.com/jaafar-mahmud-adam.rss" },
  { slug: "jaafar-tafsir", langue: "ha", auteur: "Ja'afar Mahmud Adam", source: "Podcast « Tafsirin al-Qurani »", rss: "https://anchor.fm/s/10dcf4d84/podcast/rss" },
  /* Français : cours, tafsir et rappels de savants et d'étudiants de la Sounna (ordre : le plus récent d'abord) */
  { slug: "ha-pantami-r1446", langue: "ha", ordre: "num2", auteur: "Isa Ali Ibrahim Pantami", source: "Podcast « Ramadan Tafsir 1446/2025 »", rss: "https://anchor.fm/s/101e1b3a4/podcast/rss" },
  { slug: "ha-pantami-r1447", langue: "ha", ordre: "num2", auteur: "Isa Ali Ibrahim Pantami", source: "Podcast « Ramadan Tafsir 1447/2026 »", rss: "https://anchor.fm/s/10f214c78/podcast/rss" },
  { slug: "fr-coran", langue: "fr", ordre: "num", auteur: "Le Saint Coran traduit en français", source: "Quran Central", rss: "https://rss.qurancentral.com/le-saint-coran-traduit-en-francais.rss" },
  { slug: "fr-minhaj", langue: "fr", ordre: "date", auteur: "Le minhaj as-Salafiyah", source: "Podcast « Conférences et cours islamiques »", rss: "https://anchor.fm/s/e5afb884/podcast/rss" },
  { slug: "fr-abousirine", langue: "fr", ordre: "date", auteur: "Dourous Abou Sirine", source: "dourous-abousirine.fr", rss: "https://www.dourous-abousirine.fr/podcast.xml" },
  { slug: "fr-tawhid", langue: "fr", ordre: "date", auteur: "Manhadj An-Noubouwah", source: "Podcast « Kitâbu At-Tawhid »", rss: "https://www.spreaker.com/show/3391003/episodes/feed" },
  { slug: "fr-siyam", langue: "fr", ordre: "date", auteur: "Manhadj An-Noubouwah", source: "Podcast « Kitab As-Siyam »", rss: "https://www.spreaker.com/show/5485322/episodes/feed" },
  { slug: "fr-fiqh", langue: "fr", ordre: "date", auteur: "Tasfiyah", source: "Podcast « Al-Fiqh Al-Muyassar »", rss: "https://anchor.fm/s/1030ec4b0/podcast/rss" },
  { slug: "fr-nawawi", langue: "fr", ordre: "date", auteur: "Salmi Younes", source: "Podcast « Hadiths An-Nawawi »", rss: "https://anchor.fm/s/da8ee614/podcast/rss" },
  { slug: "fr-majalis", langue: "fr", ordre: "date", auteur: "Librairie Majalis", source: "Podcast Librairie Majalis", rss: "https://anchor.fm/s/8fa2b914/podcast/rss" },
  { slug: "fr-tafsir", langue: "fr", ordre: "date", auteur: "À lumière du Coran", source: "Podcast « Coran et Tafsir »", rss: "https://anchor.fm/s/f1613b94/podcast/rss" },
  { slug: "fr-mirail", langue: "fr", ordre: "date", auteur: "Mosquée du Mirail (Toulouse)", source: "Podcast de la mosquée", rss: "https://anchor.fm/s/98c16b80/podcast/rss" },
  /* Haoussa : tafsir, fatawa et cours de savants de la Sounna (Nigeria) */
  { slug: "ha-ilmqs-tafsir", langue: "ha", ordre: "date", auteur: "Rijiyar-Lemo, Bashir Aliyu Umar…", source: "Podcast « Hausa Tafseer » (IlmQS)", rss: "https://anchor.fm/s/10f3f513c/podcast/rss" },
  { slug: "ha-ilmqs-fatwa", langue: "ha", ordre: "date", auteur: "Fatawowin Rahama", source: "Podcast « Hausa Fatwa » (IlmQS)", rss: "https://anchor.fm/s/10f430868/podcast/rss" },
  { slug: "ha-mukhtasar", langue: "ha", ordre: "date", auteur: "Takaitaccen Tafsirin Alƙur'ani", source: "Dar Al-Mukhtasar", rss: "https://anchor.fm/s/119a439d0/podcast/rss" },
  { slug: "ha-pantami-hisn", langue: "ha", ordre: "date", auteur: "Isa Ali Ibrahim Pantami", source: "Podcast « Hisnul Muslim »", rss: "https://anchor.fm/s/f148c258/podcast/rss" },
  { slug: "ha-pantami-silat", langue: "ha", ordre: "date", auteur: "Isa Ali Ibrahim Pantami", source: "Podcast « Silatul Arham »", rss: "https://anchor.fm/s/10099a72c/podcast/rss" },
  { slug: "ha-pantami-birr", langue: "ha", ordre: "date", auteur: "Isa Ali Ibrahim Pantami", source: "Podcast « Birrul Walidain »", rss: "https://anchor.fm/s/fd31bd68/podcast/rss" },
  { slug: "fr-sira", langue: "fr", ordre: "date", auteur: "Islamkheir", source: "Podcast « Récits de la Vie du Prophète ﷺ »", rss: "https://anchor.fm/s/10d1ec6e4/podcast/rss" }];
/* Identifiant stable tiré de l'adresse du fichier (pour les podcasts sans numérotation fiable) */
const hacher = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
let mesures = 0;
const dec = s => String(s || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&#8217;/g, "’").replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&#x?[0-9a-f]+;/gi, "").trim();
const sec = d => { if (!d) return 0; if (/^\d+$/.test(d)) return +d; return d.split(":").reverse().reduce((t, x, i) => t + (+x || 0) * 60 ** i, 0); };
fs.mkdirSync("maj/podcasts", { recursive: true });
const parLangue = {};
const ANCIEN = {}; for (const lg of new Set(PODCASTS.map(p => p.langue))) { const F = `maj/podcasts/${lg}.json`; if (fs.existsSync(F)) JSON.parse(fs.readFileSync(F, "utf8")).podcasts.forEach(q => { ANCIEN[q.slug] = q; }); }
for (const p of PODCASTS) {
  let x = "";
  try { const r = await fetch(p.rss, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error("http " + r.status); x = await r.text(); }
  catch (e) { console.log(p.slug, "flux illisible", e.message); if (ANCIEN[p.slug]) (parLangue[p.langue] = parLangue[p.langue] || []).push(ANCIEN[p.slug]); continue; }
  const items = x.split("<item>").slice(1).map(b => ({ t: dec((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1]), url: (b.match(/<enclosure[^>]*url="([^"]+)"/) || [])[1] || "", dur: sec((b.match(/<itunes:duration>([^<]*)/) || [])[1]), date: Date.parse((b.match(/<pubDate>([^<]*)/) || [])[1] || "") || 0 }))
    .filter(e => /^https:\/\//.test(e.url));
  /* Numéro stable : celui du titre (ex. « 002 Al-Baqara »), sinon l'ordre de parution */
  const num = e => +((e.t.match(/^(\d{1,4})\b/) || [])[1] || 0);
  if (p.ordre === "num2") { const n2 = e => +((e.t.match(/(\d{1,4})\s*$/) || [])[1] || 0); items.sort((a, b) => n2(a) - n2(b) || a.date - b.date); items.forEach(e => { e.id = `qc-${p.slug}-${hacher(e.url)}`; }); }
  else if (p.ordre === "date") { items.sort((a, b) => b.date - a.date); items.forEach(e => { e.id = `qc-${p.slug}-${hacher(e.url)}`; }); }
  else { items.sort((a, b) => (num(a) || 1e6 + a.date) - (num(b) || 1e6 + b.date)); items.forEach((e, i) => { e.id = `qc-${p.slug}-${num(e) || 10000 + i}`; }); }
  const F = `maj/podcasts/${p.langue}.json`, connu = new Map();
  if (fs.existsSync(F)) JSON.parse(fs.readFileSync(F, "utf8")).podcasts.forEach(q => q.items.forEach(e => { if (e.mes) connu.set(e.url, e.dur); }));
  for (const e of items) { if (connu.has(e.url)) { e.dur = connu.get(e.url); e.mes = 1; continue; } if (e.dur > 60 || mesures >= 200) continue; mesures++; const d = await mesurer(e.url); if (d) { e.dur = d; e.mes = 1; } }
  (parLangue[p.langue] = parLangue[p.langue] || []).push({ ...p, items });
  console.log(p.slug, items.length, "épisodes");
}
for (const [lg, l] of Object.entries(parLangue)) fs.writeFileSync(`maj/podcasts/${lg}.json`, JSON.stringify({ maj: new Date().toISOString().slice(0, 10), podcasts: l }));
