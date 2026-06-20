const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Cache para reutilizar el browser entre requests y evitar cold-starts repetidos
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
  }
  return browserInstance;
}

async function getChampionStats(championName) {
  const name = championName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://lolalytics.com/lol/${name}/build/`;

  // ── Puppeteer: renderizado completo con JS ───────────────────────────────────
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Bloquear assets pesados para acelerar la carga
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // Esperar a que aparezca el win rate en el DOM
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

    const stats = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : null;
      };

      // LoLalytics DOM selectors (revisados a junio 2025)
      // Si cambian, inspeccionar el elemento con DevTools y actualizar aquí.
      const findByLabel = (label) => {
        const allEls = [...document.querySelectorAll('*')];
        for (const el of allEls) {
          if (el.children.length === 0 && el.textContent.toLowerCase().includes(label.toLowerCase())) {
            const parent = el.closest('[class]');
            if (parent) {
              const next = parent.nextElementSibling || el.nextElementSibling;
              if (next) return next.textContent.trim();
            }
          }
        }
        return null;
      };

      // Intentar extraer valores de los atributos data-* o textContent
      const winrateEl = document.querySelector('[class*="win"]');
      const tierEl    = document.querySelector('[class*="tier"]');

      // Buscar porcentajes flotando cerca de las etiquetas
      const allText = document.body.innerText;
      const wrMatch = allText.match(/Win Rate[\s\S]{0,30}?([\d]{2,3}\.\d{1,2})%/i);
      const prMatch = allText.match(/Pick Rate[\s\S]{0,30}?([\d.]+)%/i);
      const brMatch = allText.match(/Ban Rate[\s\S]{0,30}?([\d.]+)%/i);
      const tierMatch = allText.match(/\bTier\b[\s\S]{0,20}?(S\+?|A\+?|B\+?|C|D)\b/i);

      // Counters: buscar sección "Counters" y extraer nombres
      const counterSection = [...document.querySelectorAll('h2, h3, [class*="title"]')]
        .find((el) => /counter/i.test(el.textContent));
      const counterNames = [];
      if (counterSection) {
        const container = counterSection.closest('section, div[class]');
        if (container) {
          const links = [...container.querySelectorAll('a[href*="/lol/"]')].slice(0, 3);
          links.forEach((a) => {
            const m = a.href.match(/\/lol\/([^/]+)\//);
            if (m) counterNames.push(m[1]);
          });
        }
      }

      const changeEl = document.querySelector('[class*="buff"], [class*="nerf"], [class*="change"]');

      return {
        winrate:  wrMatch   ? `${wrMatch[1]}%`   : null,
        pickrate: prMatch   ? `${prMatch[1]}%`   : null,
        banrate:  brMatch   ? `${brMatch[1]}%`   : null,
        tier:     tierMatch ? tierMatch[1].toUpperCase() : null,
        counters: counterNames,
        recentChange: changeEl ? changeEl.textContent.trim().slice(0, 40) : null,
      };
    });

    await page.close();

    return {
      champion: championName,
      winrate:      stats.winrate      ?? 'N/A',
      tier:         stats.tier         ?? 'N/A',
      pickrate:     stats.pickrate     ?? 'N/A',
      banrate:      stats.banrate      ?? 'N/A',
      counters:     stats.counters     ?? [],
      strongAgainst: [],
      recentChange: stats.recentChange ?? null,
      source: url,
    };
  } catch (puppErr) {
    console.warn(`[lolalytics] Puppeteer failed: ${puppErr.message} — falling back to static scrape`);
    return await fetchFromHtmlStatic(name, championName, url);
  }
}

// ── Fallback estático (sin JS) ───────────────────────────────────────────────
async function fetchFromHtmlStatic(name, originalName, url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    timeout: 12000,
  });

  const html = res.data;
  const $ = cheerio.load(html);

  let winrate = null, pickrate = null, banrate = null, tier = null;

  $('script:not([src])').each((_, el) => {
    const text = $(el).html() || '';
    if (!text.includes('winRate') && !text.includes('win_rate')) return;
    const wrM = text.match(/"winRate"\s*:\s*([\d.]+)/);
    const prM = text.match(/"pickRate"\s*:\s*([\d.]+)/);
    const brM = text.match(/"banRate"\s*:\s*([\d.]+)/);
    const trM = text.match(/"tier"\s*:\s*"([^"]{1,5})"/);
    if (wrM) winrate  = `${parseFloat(wrM[1]).toFixed(2)}%`;
    if (prM) pickrate = `${parseFloat(prM[1]).toFixed(2)}%`;
    if (brM) banrate  = `${parseFloat(brM[1]).toFixed(2)}%`;
    if (trM) tier = trM[1];
    return false;
  });

  // Regex fallback sobre HTML crudo
  if (!winrate) {
    const m = html.match(/([\d]{2,3}\.\d{1,2})\s*%[^<]{0,30}[Ww]in/);
    if (m) winrate = `${m[1]}%`;
  }

  const changeM = html.match(/(buff(?:ed)?|nerf(?:ed)?|rework(?:ed)?)/i);

  return {
    champion: originalName,
    winrate:  winrate   ?? 'N/A',
    tier:     tier      ?? 'N/A',
    pickrate: pickrate  ?? 'N/A',
    banrate:  banrate   ?? 'N/A',
    counters: [],
    strongAgainst: [],
    recentChange: changeM ? changeM[1].toLowerCase() : null,
    source: url,
  };
}

// Cierra el browser al apagar el servidor
process.on('SIGINT',  async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });
process.on('SIGTERM', async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });

module.exports = { getChampionStats };
