// Importe une récitation complète du Coran (114 sourates) dans Lumu : télécharge chaque MP3,
// l'envoie dans le stockage Supabase, crée la publication, puis publie tout d'un coup (sans notifications).
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const URL_SB = "https://edzzikmtxeslhvowbnix.supabase.co";
const ANON = fs.readFileSync("recompress/run.mjs", "utf8").match(/const ANON = "([^"]+)"/)[1];
const FN = `${URL_SB}/functions/v1/lumu-import-coran`;
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });
const D = JSON.parse(fs.readFileSync("import-coran/demande.json", "utf8"));
const NOMS = fs.readFileSync("app/src/app/assets/index.html", "utf8").match(/NOMS: "([^"]+)"\.split/)[1].split(",");
if (NOMS.length !== 114) throw new Error("liste des sourates invalide");

async function jeton() {
  const r = await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=lumu-import-coran`, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!r.ok) throw new Error("jeton " + r.status);
  return (await r.json()).value;
}
async function appel(corps) {
  const r = await fetch(FN, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await jeton()}`, apikey: ANON }, body: JSON.stringify({ lecteur: D.lecteur, ...corps }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`fonction ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
}
const pause = ms => new Promise(r => setTimeout(r, ms));
async function telecharger(url) {
  for (let essai = 1; essai <= 4; essai++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error("HTTP " + r.status); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (essai === 4) throw e; await pause(3000 * essai); }
  }
}

const { deja } = await appel({ a: "deja" });
const faits = new Set(deja);
console.log(`${D.lecteur} : ${faits.size} sourates déjà importées`);
let ok = 0, echecs = 0;
for (let n = 1; n <= 114; n++) {
  if (faits.has(n)) continue;
  const nnn = String(n).padStart(3, "0"), url = D.modele_url.replace("{nnn}", nnn);
  try {
    const buf = await telecharger(url);
    if (buf.length < 20000) throw new Error("fichier trop petit (" + buf.length + " octets)");
    fs.writeFileSync("s.mp3", buf);
    const duree = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "s.mp3"]).toString());
    const s = await appel({ a: "signer", n });
    const up = await sb.storage.from("yt-media").uploadToSignedUrl(s.path, s.token, buf, { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw up.error;
    await appel({ a: "creer", n, titre: `Sourate ${NOMS[n - 1]}`, duree, taille: buf.length,
      description: `Récitation de la sourate ${NOMS[n - 1]} (n° ${n}) par ${D.lecteur}. Source : ${D.source_nom}.`,
      source_nom: D.source_nom, source_url: D.source_page });
    ok++; console.log(`[${n}/114] ok ${NOMS[n - 1]} · ${(buf.length / 1048576).toFixed(1)} Mo · ${Math.round(duree / 60)} min`);
  } catch (e) {
    echecs++; console.log(`::warning::[${n}/114] ÉCHEC ${NOMS[n - 1]} : ${String(e && e.message || e).replace(/\n/g, " ").slice(0, 300)}`);
  }
}
const total = faits.size + ok;
if (total === 114) { const p = await appel({ a: "publier" }); console.log(`::notice::${D.lecteur} : 114 sourates importées, ${p.publies} publiées maintenant.`); }
else { console.log(`::error::${D.lecteur} : ${total}/114 sourates importées (${echecs} échecs). Rien n'est publié tant que les 114 ne sont pas là : relancez le workflow.`); process.exit(1); }
