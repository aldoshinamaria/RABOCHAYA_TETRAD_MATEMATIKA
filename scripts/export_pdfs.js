const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist", "pdf");

const files = [
  ["sections/razdel-1-naturalnye-chisla.html", "01_Натуральные_числа.pdf"],
  ["sections/razdel-2-obyknovennye-drobi.html", "02_Обыкновенные_дроби.pdf"],
  ["sections/razdel-3-desyatichnye-drobi.html", "03_Десятичные_дроби.pdf"],
  ["sections/razdel-4-geometriya.html", "04_Геометрия.pdf"],
  ["demo.html", "Демо_фрагмент.pdf"],
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(outDir)) {
    if (file.toLowerCase().endsWith(".pdf")) fs.unlinkSync(path.join(outDir, file));
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1240, height: 1754 },
    deviceScaleFactor: 1,
  });

  await page.emulateMedia({ media: "print" });

  for (const [input, output] of files) {
    const source = path.join(root, input);
    const target = path.join(outDir, output);
    const url = pathToFileURL(source).href;

    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );
    });

    await page.pdf({
      path: target,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const bytes = fs.statSync(target).size;
    console.log(`${output}: ${Math.round(bytes / 1024)} KB`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
