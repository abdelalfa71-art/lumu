// Rend un aperçu des polices arabes sur le cadre des récitateurs (lancé par GitHub Actions)
import { chromium } from "playwright";
import fs from "node:fs";
const P = [["Aref Ruqaa", "arefruqaa/ArefRuqaa-Bold.ttf"], ["Amiri", "amiri/Amiri-Bold.ttf"], ["Amiri Quran", "amiriquran/AmiriQuran-Regular.ttf"], ["Reem Kufi", "reemkufi/ReemKufi[wght].ttf"], ["Gulzar", "gulzar/Gulzar-Regular.ttf"], ["Ruwudu", "ruwudu/Ruwudu-Bold.ttf"], ["Lalezar", "lalezar/Lalezar-Regular.ttf"], ["Noto Naskh Arabic", "notonaskharabic/NotoNaskhArabic[wght].ttf"]];
const N = [["عبد الرحمن", "السديس"], ["مشاري", "العفاسي"], ["عبد الباسط", "عبد الصمد"]];
const cadre = "data:image/webp;base64," + fs.readFileSync("apercu-polices/cadre-lecteur.webp").toString("base64");
let css = "", corps = "";
P.forEach(([nom, fichier], i) => {
  const f = "polices/" + fichier.split("/").pop();
  if (!fs.existsSync(f)) { console.log("absente", f); return; }
  css += `@font-face{font-family:"P${i}";src:url(data:font/ttf;base64,${fs.readFileSync(f).toString("base64")});font-weight:100 900}`;
  corps += `<section><h2>${i + 1}. ${nom}</h2><div class="r">${N.map(([a, b]) => `<div class="k"><span style="font-family:P${i}">${a}</span><span style="font-family:P${i}">${b}</span></div>`).join("")}</div></section>`;
});
const html = `<!doctype html><meta charset="utf-8"><style>${css}*{box-sizing:border-box;margin:0}body{background:#f3f1ea;font-family:sans-serif;padding:16px;width:420px}section{background:#fff;border-radius:14px;padding:12px;margin-bottom:12px}h2{font-size:16px;margin-bottom:8px;color:#1f2a24}.r{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.k{aspect-ratio:1;border-radius:10px;background:#0b3d2e url(${cadre}) center/cover;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 22%;direction:rtl}.k span{white-space:nowrap;font-size:19px;line-height:1.45;background:linear-gradient(180deg,#fff6cf,#f2d273 45%,#b8842a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 1px 1px rgba(0,0,0,.7))}</style><body>${corps}`;
fs.writeFileSync("apercu.html", html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 452, height: 800 }, deviceScaleFactor: 2 });
await p.goto("file://" + process.cwd() + "/apercu.html"); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelectorAll(".k").forEach(k => k.querySelectorAll("span").forEach(s => { let f = 19; while (s.scrollWidth > k.clientWidth * 0.56 && f > 9) { f--; s.style.fontSize = f + "px"; } })));
await p.screenshot({ path: "apercu-polices.png", fullPage: true }); await b.close();
