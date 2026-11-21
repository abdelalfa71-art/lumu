// Remplace des sourates incomplètes par la version complète (même chemin : vues et liens conservés).
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const URL_SB = "https://edzzikmtxeslhvowbnix.supabase.co";
const ANON = fs.readFileSync("recompress/run.mjs", "utf8").match(/const ANON = "([^"]+)"/)[1];
const FN = `${URL_SB}/functions/v1/lumu-import-coran`;
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });
const D = JSON.parse(fs.readFileSync("import-coran/demande-remplacer.json", "utf8"));
const jeton = async () => (await (await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=lumu-import-coran`, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } })).json()).value;
async function appel(c) { const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await jeton()}`, apikey: ANON }, body: JSON.stringify({ lecteur: D.lecteur, ...c }) }); const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); }
const pause = ms => new Promise(r => setTimeout(r, ms));
async function telecharger(u) { for (let i = 1; i <= 4; i++) { try { const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); return Buffer.from(await r.arrayBuffer()); } catch (e) { if (i === 4) throw e; await pause(3000 * i); } } }
let ok = 0, err = 0;
for (const n of D.sourates) {
  try {
    const nnn = String(n).padStart(3, "0");
    const buf = await telecharger(D.modele_url.replace("{nnn}", nnn));
    if (buf.length < 20000) throw new Error("fichier trop petit");
    fs.writeFileSync("r.mp3", buf);
    const duree = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "r.mp3"]).toString());
    const s = await appel({ a: "signer", n });
    const up = await sb.storage.from("yt-media").uploadToSignedUrl(s.path, s.token, buf, { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw up.error;
    const m = await appel({ a: "remplacer", n, duree, taille: buf.length, source_nom: D.source_nom, source_url: D.source_url });
    ok++; console.log(`${nnn} · ${Math.round(duree / 60)} min · ${(buf.length / 1048576).toFixed(1)} Mo · ligne ${m.maj}`);
  } catch (e) { err++; console.log(`::warning::sourate ${n} : ${String(e.message || e).slice(0, 200)}`); }
}
console.log(`::notice::${D.lecteur} : ${ok} sourates remplacées, ${err} erreur(s)`);
