// Sonde : flux podcast officiel de Quran Central pour le Cheikh Ja'afar Mahmud Adam.
import fs from "node:fs";
const out = [];
const get = async (u, n = 2500) => { try { const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" }, redirect: "follow" }); const t = await r.text(); out.push(`=== ${u} [${r.status}] ${r.url}\n${t.slice(0, n)}`); return t; } catch (e) { out.push(`=== ${u} : ${e.message}`); return ""; } };
const h = await get("https://qurancentral.com/audio/jaafar-mahmud-adam/", 300);
const feeds = [...new Set((h.match(/https?:\/\/[^"' ]*(feed|rss)[^"' ]*/gi) || []))].slice(0, 10);
out.push("FEEDS " + feeds.join(" | "));
const terms = (h.match(/[^.]{0,200}(copyright|permission|droits)[^.]{0,200}/gi) || []).slice(0, 5); out.push("TERMS " + terms.join(" || "));
const it = await get("https://itunes.apple.com/lookup?id=1546357481", 1500);
try { const f = JSON.parse(it).results[0].feedUrl; out.push("ITUNES FEED " + f); const x = await get(f, 4000); const items = (x.match(/<item>/g) || []).length; out.push("ITEMS " + items); out.push("COPYRIGHT " + ((x.match(/<copyright>([^<]*)/) || [])[1] || "")); } catch (e) { out.push("lookup " + e.message); }
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n\n"));
