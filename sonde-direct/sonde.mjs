// Identifie les chaînes YouTube officielles (La Mecque / Médine) et leur direct en cours.
import fs from "node:fs";
const urls = ["https://www.youtube.com/user/SaudiQuranTv/live", "https://www.youtube.com/@SaudiQuranTv", "https://www.youtube.com/user/SaudiSunnahTv/live", "https://www.youtube.com/@SaudiSunnahTv",
  "https://www.youtube.com/channel/UCROKYPep-UuODNwyipe6JMw/live", "https://www.youtube.com/channel/UCos52azQNBgW63_9uDJoPDA/live"];
const out = [];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { "accept-language": "fr", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", cookie: "CONSENT=YES+1" } });
    const t = await r.text();
    const g = re => (t.match(re) || [])[1] || "";
    out.push([u, r.status, "chaîne=" + g(/"externalId":"(UC[^"]+)"/) || g(/"channelId":"(UC[^"]+)"/), "nom=" + g(/<meta property="og:title" content="([^"]+)"/), "abonnés=" + g(/"subscriberCountText":\{[^}]*?"simpleText":"([^"]+)"/), "vidéo=" + g(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)"/), "direct=" + /"isLiveNow":true/.test(t), "embed=" + g(/"playableInEmbed":(true|false)/), "vérifié=" + /BADGE_STYLE_TYPE_VERIFIED/.test(t)].join(" | "));
  } catch (e) { out.push(u + " : " + e.message); }
}
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
console.log(out.join("\n"));
