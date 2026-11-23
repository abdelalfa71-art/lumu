// Sonde : chaîne Telegram publique @MOHAMMEDALIDEW (aperçu web t.me/s).
import fs from "node:fs";
const out = [];
for (const nom of ["MOHAMMEDALIDEW", "mohammedalidewa", "MohammedAliDewa"]) {
  try {
    const r = await fetch("https://t.me/s/" + nom, { headers: { "user-agent": "Mozilla/5.0" } }); const t = await r.text();
    const titre = (t.match(/<meta property="og:title" content="([^"]*)/) || [])[1] || "", desc = (t.match(/<meta property="og:description" content="([^"]*)/) || [])[1] || "";
    const abonnes = (t.match(/tgme_channel_info_counter"><span class="counter_value">([^<]*)<\/span> <span class="counter_type">([^<]*)/g) || []).join(" ; ");
    const audios = (t.match(/<audio[^>]*src="([^"]+)"/g) || []).length, docs = (t.match(/tgme_widget_message_document_title[^>]*>([^<]*)/g) || []).slice(0, 15).map(x => x.replace(/.*>/, ""));
    const posts = (t.match(/data-post="([^"]+)"/g) || []).slice(-3);
    out.push(`=== ${nom} [${r.status}] titre=${titre} | desc=${desc.slice(0, 200)} | ${abonnes.replace(/<[^>]+>/g, "")}\n audios=${audios} | documents: ${docs.join(" | ")}\n derniers posts: ${posts.join(" ")}`);
    const voix = (t.match(/tgme_widget_message_voice[^"]*"/g) || []).length; out.push(" voix=" + voix);
  } catch (e) { out.push(nom + " " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
