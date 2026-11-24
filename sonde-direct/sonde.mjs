// Sonde : podcasts islamiques en haoussa (annuaire Apple Podcasts) et contenu de leurs flux RSS.
import fs from "node:fs";
const out = [], vus = new Map();
const pause = ms => new Promise(r => setTimeout(r, ms));
const termes = ["daurawa", "pantami", "albani zaria", "sani yahaya jingir", "abdallah usman gadon kaya", "kabiru haruna gombe", "bello yabo", "muhammad bin uthman kano", "ahmad sulaiman kano", "abubakar giro argungu", "lawal abubakar triumph", "nasiru abdulmuhyi", "guruntum", "dr ibrahim jalo jalingo", "mansur sokoto", "sheikh hausa tafsir", "karatun hadisi", "riyadussalihin", "umdatul ahkam hausa", "kitabut tauhid hausa", "fiqhu hausa", "wa'azi hausa", "hausa sermon", "hausa da'awa", "littafin tauhidi", "zikirin safe hausa", "tafseer hausa ramadan", "darul hadith hausa", "IlmQS", "rijiyar lemo", "bashir aliyu umar", "fatawa hausa", "hausa islamic", "sunnah hausa", "alqur'ani hausa"];
for (const pays of ["ng", "gh", "us"]) for (const t of termes) {
  try { const j = await (await fetch("https://itunes.apple.com/search?media=podcast&limit=25&country=" + pays + "&term=" + encodeURIComponent(t))).json();
    for (const r of j.results || []) if (r.feedUrl && !vus.has(r.feedUrl)) vus.set(r.feedUrl, { nom: r.collectionName, auteur: r.artistName, nb: r.trackCount, genre: (r.genres || []).join("/"), date: (r.releaseDate || "").slice(0, 10), t });
  } catch (e) { out.push("erreur " + t + " " + e.message); }
  await pause(3200);
}
out.push("=== " + vus.size + " podcasts ===");
const CONNUS = fs.readFileSync("import-coran/podcasts.mjs", "utf8");
for (const [url, v] of vus) {
  if (CONNUS.includes(url)) continue;
  if (!/relig|spiritu|islam|religion|hausa|wa.?azi|tafsir|sheikh|shaikh/i.test(v.genre + v.nom)) continue;
  let info = "";
  try { const x = await (await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) })).text();
    const items = x.split("<item>").slice(1); const titres = items.slice(0, 3).map(b => ((b.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim().slice(0, 60));
    const lic = (x.match(/<copyright>([\s\S]*?)<\/copyright>/) || [])[1] || ""; const desc = ((x.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>|<[^>]+>/g, "").trim().slice(0, 160);
    info = `items=${items.length} | ©${lic.slice(0, 40)} | ${titres.join(" ; ")} | ${desc}`;
  } catch (e) { info = "flux illisible " + e.message; }
  out.push(`${v.nom} — ${v.auteur} [${v.genre}] (${v.nb}, ${v.date})\n  ${url}\n  ${info}`);
}
for (const g of ["aminu-ibrahim-daurawa", "isa-ali-pantami", "muhammad-auwal-albani-zaria", "abubakar-mahmud-gumi", "kabiru-gombe", "sani-rijiyar-lemo", "ahmad-gumi", "bashir-aliyu-umar"]) for (const d of ["rss.qurancentral.com", "rss.muslimcentral.com"]) {
  try { const r = await fetch(`https://${d}/${g}.rss`, { signal: AbortSignal.timeout(15000) }); const x = r.ok ? await r.text() : ""; out.push(`GUESS ${d}/${g} -> ${r.status} items=${x.split("<item>").length - 1}`); } catch (e) { out.push(`GUESS ${g} ${e.message}`); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
