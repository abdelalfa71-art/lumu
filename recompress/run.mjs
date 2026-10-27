// Réduit les audios lourds (parole) en MP3 mono 32 kbit/s. Les anciens fichiers sont conservés jusqu'à la purge.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const URL_SB = "https://edzzikmtxeslhvowbnix.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkenppa210eGVzbGh2b3dibml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjE0MDIsImV4cCI6MjA5OTgzNzQwMn0.i5k6gzYSAaNQyp33LNo0pRCdH0cQuXkTiHx7DqFK6uQ";
const FN = `${URL_SB}/functions/v1/lumu-recompress`;
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });

async function jeton() {
  const r = await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=lumu-recompress`, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!r.ok) throw new Error("jeton " + r.status);
  return (await r.json()).value;
}
async function appel(corps) {
  const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await jeton()}`, apikey: ANON }, body: JSON.stringify(corps) });
  const t = await r.text();
  if (!r.ok) throw new Error(`fonction ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

process.on("unhandledRejection", e => { console.log("::error::" + String(e && e.message || e).replace(/\n/g, " ").slice(0, 400)); process.exit(1); });
const mode = fs.readFileSync("recompress/mode.txt", "utf8").trim();
if (mode.startsWith("purger")) {
  console.log("Purge :", await appel({ a: "purger" }));
  process.exit(0);
}

const { liste } = await appel({ a: "liste" });
console.log(`${liste.length} audios à alléger`);
let ok = 0, ignores = 0, echecs = 0, gain = 0;
for (const [i, c] of liste.entries()) {
  try {
    const src = `${URL_SB}/storage/v1/object/public/yt-media/${c.fichier_path.split("/").map(encodeURIComponent).join("/")}`;
    const r = await fetch(src);
    if (!r.ok) throw new Error("téléchargement " + r.status);
    fs.writeFileSync("in.bin", Buffer.from(await r.arrayBuffer()));
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", "in.bin", "-vn", "-map_metadata", "-1", "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "32k", "out.mp3"]);
    const duree = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "out.mp3"]).toString());
    const taille = fs.statSync("out.mp3").size;
    if (taille > c.taille_octets * 0.7) { ignores++; await appel({ a: "ignorer", id: c.id }); console.log(`[${i + 1}/${liste.length}] ignoré (gain faible) ${c.id}`); continue; }
    if (c.duration_seconds && Math.abs(duree - c.duration_seconds) > Math.max(3, c.duration_seconds * 0.02)) { ignores++; console.log(`[${i + 1}/${liste.length}] durée différente ${c.id}: ${duree} vs ${c.duration_seconds}`); continue; }
    const s = await appel({ a: "signer", id: c.id });
    const up = await sb.storage.from("yt-media").uploadToSignedUrl(s.path, s.token, fs.readFileSync("out.mp3"), { contentType: "audio/mpeg" });
    if (up.error) throw up.error;
    await appel({ a: "finaliser", id: c.id, path: s.path, taille });
    gain += c.taille_octets - taille; ok++;
    console.log(`[${i + 1}/${liste.length}] ok ${c.id} ${(c.taille_octets / 1048576).toFixed(1)} Mo -> ${(taille / 1048576).toFixed(1)} Mo`);
  } catch (e) {
    echecs++; if (echecs <= 5) console.log(`::error::ÉCHEC ${c.id}: ${String(e && e.message || e).replace(/\n/g, " ").slice(0, 300)}`);
    console.log(`[${i + 1}/${liste.length}] ÉCHEC ${c.id}: ${String(e && e.message || e)}`);
  }
}
console.log(`::notice::Terminé : ${ok} convertis, ${ignores} ignorés, ${echecs} échecs, gain ${(gain / 1048576).toFixed(0)} Mo`);
console.log(`Terminé : ${ok} convertis, ${ignores} ignorés, ${echecs} échecs, gain ${(gain / 1048576).toFixed(0)} Mo`);
