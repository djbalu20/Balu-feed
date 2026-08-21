// trim-feed.js
// A sitemap.xml-ből (nem a nagy googlemerchant.xml-ből!) állít elő egy kis,
// gyorsan betölthető terméklistát a Balu chatbot számára.
// A sitemap URL-jeiből vezeti le a terméknevet és a kategóriát
// (nincs benne kép/ár, de a keresés és a termékoldalra irányítás
// szempontjából ez nem szükséges - a termékoldalon úgyis ott van minden).
//
// Ezt a szkriptet a GitHub Actions futtatja a háttérben -
// a látogató böngészője soha nem tölti be magát a nagy sitemapot.

const SITEMAP_URL = "https://baluoffice.hu/marketplaces/sitemap.xml";
const OUTPUT_FILE = "products.json";

function slugToWords(s) {
  s = s.replace(/-\d+$/, ""); // a végén lévő azonosító szám levágása
  return s.replace(/-/g, " ");
}

function deriveFromUrl(url) {
  var afterHost = url.split(/\.hu\//)[1] || "";
  var path = afterHost.endsWith(".html") ? afterHost.slice(0, -5) : afterHost;
  var parts = path.split("/").filter(Boolean);
  if (!parts.length) return null;
  var slug = parts[parts.length - 1];
  var cats = parts.slice(0, -1);
  var title = slugToWords(slug);
  if (!title) return null;
  title = title.charAt(0).toUpperCase() + title.slice(1);
  var productType = cats.map(slugToWords).join(" ");
  return { title: title, product_type: productType, link: url };
}

async function main() {
  console.log("Sitemap letöltése:", SITEMAP_URL);
  const t0 = Date.now();
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const xml = await res.text();
  console.log("Letöltve", (xml.length / 1e6).toFixed(1), "MB", (Date.now() - t0) + "ms alatt");

  const locRe = /<loc>(.*?)<\/loc>/g;
  const products = [];
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const p = deriveFromUrl(m[1]);
    if (p) products.push(p);
  }
  console.log("Feldolgozva", products.length, "termék");

  const fs = require("fs");
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products));
  const stat = fs.statSync(OUTPUT_FILE);
  console.log("Kiírva:", OUTPUT_FILE, "(" + (stat.size / 1e6).toFixed(2) + " MB, tömörítve a szerver által jóval kisebb lesz)");
}

main().catch((err) => {
  console.error("HIBA:", err);
  process.exit(1);
});
