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
  /* Haoussa : collections publiques d'archive.org (lues depuis archive.org) */
  { slug: "ha-ia-0", langue: "ha", archive: "internet2sheikhalbanizaria", auteur: "Muhammad Auwal Albani Zaria", source: "archive.org « Archive »" },
  { slug: "ha-ia-1", langue: "ha", archive: "002-tafseer-by-sheikh-albani-zaria-2008", auteur: "Muhammad Auwal Albani Zaria", source: "archive.org « Tafseer 2008 »" },
  { slug: "ha-ia-2", langue: "ha", archive: "duniyarjinnudashaidanusheikhalbanizaria", auteur: "Muhammad Auwal Albani Zaria", source: "archive.org « Duniyar Jinnu da Shaidanu »" },
  { slug: "ha-ia-3", langue: "ha", archive: "talkhissifatusalatsheikhalbanizaria", auteur: "Muhammad Auwal Albani Zaria", source: "archive.org « Talkhis Sifatu Salatin Nabiy »" },
  { slug: "ha-ia-4", langue: "ha", archive: "albani_zaria_risaalah", auteur: "Muhammad Auwal Albani Zaria", source: "archive.org « Karatun Ar-Risaalah »" },
  { slug: "ha-ia-5", langue: "ha", archive: "ramadan-tafseer-by-sheikh-jaafar-2005", auteur: "Ja'afar Mahmud Adam", source: "archive.org « Ramadan Tafseer 2005 »" },
  { slug: "ha-ia-6", langue: "ha", archive: "sharhusulilimanbysheikhjaafarmahmudadam", auteur: "Ja'afar Mahmud Adam", source: "archive.org « Sharh Usulil Iman »" },
  { slug: "ha-ia-7", langue: "ha", archive: "lamiyyatuibntaimiyyahsheikhjaafar", auteur: "Ja'afar Mahmud Adam", source: "archive.org « Lamiyyatu Ibn Taimiyyah »" },
  { slug: "ha-ia-8", langue: "ha", archive: "muhadarori", auteur: "Ja'afar Mahmud Adam", source: "archive.org « Muhadarori »" },
  { slug: "ha-ia-9", langue: "ha", archive: "001RamadanTafseerByDr.IsaAliPantami2019", auteur: "Isa Ali Ibrahim Pantami", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-10", langue: "ha", archive: "ramadan-tafseer-by-sheikh-isa-ali-pantami-2020", auteur: "Isa Ali Ibrahim Pantami", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-11", langue: "ha", archive: "shamailmuhammadiyyash.isaaliyupantami", auteur: "Isa Ali Ibrahim Pantami", source: "archive.org « Shama'ilul Muhammadiyya »" },
  { slug: "ha-ia-12", langue: "ha", archive: "RamadanTafseerByDr.SaniUmar2019", auteur: "Muhammad Sani Umar Rijiyar-Lemo", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-13", langue: "ha", archive: "001-ramadan-tafseer-by-dr.-sani-umar-2020", auteur: "Muhammad Sani Umar Rijiyar-Lemo", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-14", langue: "ha", archive: "166WeeklyTafseerDr.SaniUmar", auteur: "Muhammad Sani Umar Rijiyar-Lemo", source: "archive.org « Weekly Tafseer »" },
  { slug: "ha-ia-15", langue: "ha", archive: "rayuwarauredr.saniumar", auteur: "Muhammad Sani Umar Rijiyar-Lemo", source: "archive.org « Archive »" },
  { slug: "ha-ia-16", langue: "ha", archive: "fatawoyin-rahama", auteur: "Muhammad Sani Umar Rijiyar-Lemo", source: "archive.org « Fatawowin Rahama 2012-… »" },
  { slug: "ha-ia-17", langue: "ha", archive: "RamadanTafseerBySheikhAhmadTijjaniGuruntum2019", auteur: "Ahmad Tijjani Yusuf Guruntum", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-18", langue: "ha", archive: "ramadan-tafseer-by-sheikh-ahmad-tijjani-guruntum-2020", auteur: "Ahmad Tijjani Yusuf Guruntum", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-19", langue: "ha", archive: "001wasiyoyigomasheikhahmadtijjaniguruntum", auteur: "Ahmad Tijjani Yusuf Guruntum", source: "archive.org « Archive »" },
  { slug: "ha-ia-20", langue: "ha", archive: "RamadanTafseerBySheikhAbdurrazaqYahyaHaifan2019", auteur: "Abdurrazaq Yahya Haifan", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-21", langue: "ha", archive: "001-ramadan-tafseer-by-sheikh-abdurrazaq-yahya-haifan-2020", auteur: "Abdurrazaq Yahya Haifan", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-22", langue: "ha", archive: "adabulmufradsheikhabdurrazaqyahyahaifan", auteur: "Abdurrazaq Yahya Haifan", source: "archive.org « Adabul Mufrad »" },
  { slug: "ha-ia-23", langue: "ha", archive: "004abaunahadithsbysheikhabdurrazakyahyahaifan", auteur: "Abdurrazaq Yahya Haifan", source: "archive.org « Aba'una Hadiths »" },
  { slug: "ha-ia-24", langue: "ha", archive: "001-ramadan-tafseer-by-sheikh-kabiru-gombe", auteur: "Kabiru Haruna Gombe", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-25", langue: "ha", archive: "Khudubobindrabubakarsanibirninkudu", auteur: "Abubakar Sani Birnin Kudu", source: "archive.org « Archive »" },
  { slug: "ha-ia-26", langue: "ha", archive: "sheikhmusaasadussunnah", auteur: "Musa Yusuf Asadussunnah", source: "archive.org « Archive »" },
  { slug: "ha-ia-27", langue: "ha", archive: "NightRamadanTafseerBySheikhMusaAsadussunnah2019", auteur: "Musa Yusuf Asadussunnah", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-28", langue: "ha", archive: "ramadan-tafseer-by-dr.-abdallah-usman-gadon-kaya-2020", auteur: "Abdallah Usman Gadon Kaya", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-29", langue: "ha", archive: "dr.abdallahusmangadonkayaarchive", auteur: "Abdallah Usman Gadon Kaya", source: "archive.org « Archive »" },
  { slug: "ha-ia-30", langue: "ha", archive: "hausa-ramadan-tafseer-2024-sheikh-muhammad-bin-uthman-kano", auteur: "Muhammad Bin Uthman Kano", source: "archive.org « Ramadan Tafseer 2024 »" },
  { slug: "ha-ia-31", langue: "ha", archive: "Hudubahbybinuthman", auteur: "Muhammad Bin Uthman Kano", source: "archive.org « Archive »" },
  { slug: "ha-ia-32", langue: "ha", archive: "ramadan-tafseer-by-dr.-mansur-isa-yelwa-2020", auteur: "Mansur Isa Yelwa", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-33", langue: "ha", archive: "RamadanTafseerByDr.MansurSokoto2019", auteur: "Mansur Ibrahim Sokoto", source: "archive.org « Ramadan Tafseer 2019 »" },
  { slug: "ha-ia-34", langue: "ha", archive: "hanyoyintsiradr.mansursokoto", auteur: "Mansur Ibrahim Sokoto", source: "archive.org « Archive »" },
  { slug: "ha-ia-35", langue: "ha", archive: "weeklytafseerbydr.idrisbauchi01november2019", auteur: "Idris Abdul-Azeez Bauchi", source: "archive.org « Weekly Tafseer »" },
  { slug: "ha-ia-36", langue: "ha", archive: "khudubarjumaadr.idrisabdulazeezbauchi01112019", auteur: "Idris Abdul-Azeez Bauchi", source: "archive.org « Hudubobin Juma'a »" },
  { slug: "ha-ia-37", langue: "ha", archive: "ramadan-tafseer-by-dr.-bashir-aliyu-umar-2020", auteur: "Bashir Aliyu Umar", source: "archive.org « Ramadan Tafseer 2020 »" },
  { slug: "ha-ia-38", langue: "ha", archive: "bashir-aliyu-umar", auteur: "Bashir Aliyu Umar", source: "archive.org « Hudubobin Juma'a »" },
  { slug: "ha-ia-39", langue: "ha", archive: "tafseerussaadiy", auteur: "Muhammad Kabir Lawal Garba", source: "archive.org « Tafseerin As-Sa'adi »" },
  { slug: "ha-ia-40", langue: "ha", archive: "sharhinbaikuniyyah", auteur: "Muhammad Kabir Lawal Garba", source: "archive.org « Sharhin Baiƙuniyyah »" },
  { slug: "ha-ia-41", langue: "ha", archive: "riyadus_swalihin_sunna4u", auteur: "Bature Dauda Tsagero", source: "archive.org « Riyadus Salihin »" },
  { slug: "ha-ia-42", langue: "ha", archive: "tafsirin_al_quran_sunna4u", auteur: "Abubakar Maikano", source: "archive.org « Tafsirin Al-Qur'ani »" },
  { slug: "ha-ia-43", langue: "ha", archive: "Al.adabul.mufrad_sunna4u", auteur: "Abubakar Maikano", source: "archive.org « Al-Adabul Mufrad »" },
  { slug: "ha-ia-44", langue: "ha", archive: "karatun_muwadda_malik", auteur: "Sunna4u", source: "archive.org « Karatun Muwadda Malik »" },
  { slug: "ha-ia-45", langue: "ha", archive: "Muslim1_201403", auteur: "Almadina", source: "archive.org « Sahih Muslim (Hausa) »" },
  { slug: "ha-ia-46", langue: "ha", archive: "kitabul_akhdari_shiakh_abubakar_gumi", auteur: "Abubakar Mahmud Gumi", source: "archive.org « Kitabul Akhdari »" },
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
  if (p.archive) {
    try {
      const j = await (await fetch("https://archive.org/metadata/" + encodeURIComponent(p.archive), { signal: AbortSignal.timeout(60000) })).json();
      const fichiers = (j.files || []).filter(f => /\.mp3$/i.test(f.name) && !/_64kb\.mp3$/i.test(f.name) && f.source === "original");
      const tri = new Intl.Collator("fr", { numeric: true });
      const items = fichiers.map(f => ({ t: dec(f.title || f.name.replace(/\.mp3$/i, "").replace(/[_]+/g, " ")).slice(0, 140), url: "https://archive.org/download/" + encodeURIComponent(p.archive) + "/" + f.name.split("/").map(encodeURIComponent).join("/"), dur: Math.round(+f.length || (String(f.length || "").includes(":") ? sec(f.length) : 0)), date: 0, mes: 1 }))
        .filter(e => !/umdat/i.test(e.t)).sort((a, b) => tri.compare(a.url, b.url));
      items.forEach(e => { e.id = `qc-${p.slug}-${hacher(e.url)}`; });
      (parLangue[p.langue] = parLangue[p.langue] || []).push({ ...p, items });
      console.log(p.slug, p.archive, items.length, "fichiers");
    } catch (e) { console.log(p.slug, "archive illisible", e.message); if (ANCIEN[p.slug]) (parLangue[p.langue] = parLangue[p.langue] || []).push(ANCIEN[p.slug]); }
    continue;
  }
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
