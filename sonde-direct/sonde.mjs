import fs from "node:fs";
const t = await (await fetch("https://anchor.fm/s/10dcf4d84/podcast/rss")).text();
const g = re => (t.match(re) || [])[1] || "";
const out = ["TITRE " + g(/<title>(?:<!\[CDATA\[)?([^<\]]*)/), "AUTEUR " + g(/<itunes:author>([^<]*)/), "PROPRIO " + g(/<itunes:name>([^<]*)/), "COPYRIGHT " + g(/<copyright>([^<]*)/), "DESC " + g(/<description>(?:<!\[CDATA\[)?([\s\S]{0,600}?)(?:\]\]>)?<\/description>/), "LIEN " + g(/<link>([^<]*)/)];
const items = t.split("<item>").slice(1);
out.push("ITEMS " + items.length);
items.slice(0, 15).forEach(b => out.push("- " + ((b.match(/<title>(?:<!\[CDATA\[)?([^<\]]*)/) || [])[1] || "") + " | " + ((b.match(/<itunes:duration>([^<]*)/) || [])[1] || "") + " | " + ((b.match(/<pubDate>([^<]*)/) || [])[1] || "")));
fs.writeFileSync("sonde-direct/resultat.txt", out.join("\n"));
