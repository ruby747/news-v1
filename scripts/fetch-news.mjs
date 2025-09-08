import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

const FEEDS = (process.env.FEEDS ? process.env.FEEDS.split(',') : [
  'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
  'https://feeds.reuters.com/reuters/topNews'
]).map(s => s.trim()).filter(Boolean);

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'NewsCardsVanilla/1.0 (+contact: you@example.com)' }
});

function normalizeText(s = '') {
  return String(s || '').replace(/\s+/g, ' ').trim();
}
const stopwordsKo = new Set(['그리고','그것','그러나','하지만','또한','대한','관련','지난','오늘','내일','지난해','이번','지난달','지난주','사진','영상','기자','속보','뉴스','단독','종합','한국','정부','서울','중','등','때문','무엇','어떤','있다','됐다','한다','했다','부터','까지','으로','에서','에게','및','더','가장','또','등등','및','등에','등을','등이','등으로']);
const stopwordsEn = new Set(['the','and','for','with','that','this','from','will','have','has','are','were','was','been','its','over','after','amid','into','about','says','say','said','new','more','than','as','on','in','of','to','by','at','it','is','a','an','up','out']);
function tokenize(text) {
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[^0-9a-z\uac00-\ud7a3\s]/g, ' ');
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  return rawTokens.filter(t => {
    if (t.length < 2) return false;
    if (stopwordsEn.has(t) || stopwordsKo.has(t)) return false;
    if (/^\d+$/.test(t)) return false;
    return true;
  });
}

function pickTopKeywords(articles, maxKeywords = 40) {
  const freq = new Map();
  for (const a of articles) {
    const text = `${a.title} ${a.description || ''}`;
    const tokens = new Set(tokenize(text));
    for (const tok of tokens) {
      if (!freq.has(tok)) freq.set(tok, { count: 0, articles: new Set() });
      const rec = freq.get(tok);
      rec.count += 1;
      rec.articles.add(a.id);
    }
  }
  return [...freq.entries()]
    .sort((a,b)=> b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, maxKeywords)
    .map(([token, info]) => ({ token, score: info.count, articleIds: [...info.articles] }));
}

async function fetchAllFeeds() {
  const settled = await Promise.allSettled(FEEDS.map(u => parser.parseURL(u)));
  const articles = [];
  for (const res of settled) {
    if (res.status !== 'fulfilled') continue;
    const feed = res.value;
    for (const item of (feed.items || [])) {
      const title = normalizeText(item.title);
      const link = item.link || item.guid || item.id || '';
      const description = normalizeText(item.contentSnippet || item.content || item.summary || '');
      const pub = item.isoDate || item.pubDate || null;
      const enclosureUrl = item.enclosure?.url || item['media:content']?.url || null;
      if (!title || !link) continue;
      articles.push({
        id: link,
        title,
        link,
        description,
        source: normalizeText(feed.title || 'RSS'),
        publishedAt: pub ? new Date(pub).toISOString() : null,
        image: enclosureUrl || null
      });
    }
  }
  // dedupe
  const seen = new Set();
  const deduped = [];
  for (const a of articles) {
    const key = a.id || a.title;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(a);
  }
  deduped.sort((a,b) => (Date.parse(b.publishedAt||0) - Date.parse(a.publishedAt||0)));
  return deduped;
}

// Try to enrich missing images with OG/Twitter images (limited)
async function enrichOgImages(articles) {
  const limit = parseInt(process.env.MAX_OG_FETCH || '40', 10);
  const timeoutMs = parseInt(process.env.OG_TIMEOUT_MS || '7000', 10);
  const concurrent = parseInt(process.env.OG_CONCURRENCY || '5', 10);

  async function findOg(url) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'NewsCardsVanilla/1.0' } });
      clearTimeout(t);
      if (!res.ok) return null;
      const html = await res.text();
      const rx = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/i;
      const m = html.match(rx);
      return m ? m[1] : null;
    } catch { return null; }
  }

  let i = 0;
  async function worker() {
    while (i < Math.min(limit, articles.length)) {
      const idx = i++;
      const a = articles[idx];
      if (a.image) continue;
      const img = await findOg(a.link);
      if (img) a.image = img;
    }
  }
  await Promise.all(Array.from({length: concurrent}, worker));
}

const outPath = path.join('docs', 'data', 'latest.json');
const articles = await fetchAllFeeds();
await enrichOgImages(articles);
const topics = pickTopKeywords(articles, 40);
const result = {
  generatedAt: new Date().toISOString(),
  topics,
  articlesById: Object.fromEntries(articles.map(a => [a.id, a]))
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Wrote', outPath, `(${topics.length} topics, ${articles.length} articles)`);
