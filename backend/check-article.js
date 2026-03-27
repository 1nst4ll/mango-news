require('dotenv').config({ path: './.env' });
const { getPage, closePage } = require('./src/browserPool');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'mangoadmin',
  host: 'dpg-d0967lbe5dus738ar8f0-a.ohio-postgres.render.com',
  database: 'mangonews',
  password: 'pphAnw69sHfbcAwuGdXL2K9FWc0ydC8T',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// Use the actual sanitizeHtml from scraper by requiring it
// scraper.js doesn't export sanitizeHtml so we call processScrapedData indirectly
// Instead, reproduce exactly what opensourceScraper + scraper.js does:
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

let _currentBaseUrl = '';
const _resolveUrl = (url) => {
  if (!url || !_currentBaseUrl) return url;
  try { return new URL(url, _currentBaseUrl).href; } catch { return url; }
};

const SKIP_TAGS = new Set(['script','style','noscript','iframe','nav','form','figure','figcaption','button']);
const INLINE_KEEP = new Set(['strong','b','em','i','a','mark','code','sup','sub']);
const CONTAINER_TAGS = new Set(['div','section','article','aside','main','header','footer']);
const BLOCK_ELEMENTS = new Set(['h1','h2','h3','h4','h5','h6','ul','ol','li','dl','dt','dd','blockquote','pre','br','hr']);

function normalizeInline(t){return t.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/([.!?])([A-Z])/g,'$1 $2').trim();}
function serializeChildren(node){let r='';for(const c of node.childNodes){const s=serializeNode(c);if(!s)continue;if(typeof s==='object'){if(r&&!r.endsWith(' '))r+=' ';r+=s.html;}else{if(r&&!r.endsWith(' ')&&!s.startsWith(' '))r+=' ';r+=s;}}return r;}
function serializeNode(node){
  if(node.nodeType===3)return node.nodeValue;if(node.nodeType!==1)return'';
  const tag=node.tagName.toLowerCase();
  if(SKIP_TAGS.has(tag))return'';
  if(/^h[1-6]$/.test(tag)){const i=serializeChildren(node);return i.trim()?{block:true,html:`<${tag}>${i}</${tag}>`}:'';}
  if(tag==='blockquote'){const i=serializeChildren(node).trim();return i?{block:true,html:`<blockquote>${i}</blockquote>`}:'';}
  if(tag==='ul'||tag==='ol'){const items=[];for(const c of node.childNodes)if(c.nodeType===1&&c.tagName.toLowerCase()==='li'){const li=serializeChildren(c).trim();if(li)items.push(`<li>${li}</li>`);}return items.length?{block:true,html:`<${tag}>${items.join('')}</${tag}>`}:'';}
  if(tag==='img'){
    const pick=(s)=>{if(!s)return'';const e=s.split(',').map(x=>{const p=x.trim().split(/\s+/);return{url:p[0],width:p[1]?parseInt(p[1],10):0};}).filter(e=>e.url);return e.length?e.reduce((a,b)=>b.width>a.width?b:a).url:'';};
    const isP=(u)=>!u||u.startsWith('data:')||u.startsWith('blob:');
    const raw=node.getAttribute('src')||'';
    const best=_resolveUrl(pick(node.getAttribute('srcset')))||_resolveUrl(pick(node.getAttribute('data-srcset')))||(!isP(raw)?_resolveUrl(raw):'')||_resolveUrl(node.getAttribute('data-src'))||'';
    if(!best||isP(best))return'';
    return{block:true,html:`<img src="${best}" alt="${node.getAttribute('alt')||''}">`};
  }
  if(INLINE_KEEP.has(tag)){const i=serializeChildren(node);if(!i.trim())return'';if(tag==='a'){const h=node.getAttribute('href');return h?`<a href="${h}">${i}</a>`:i;}const o=tag==='b'?'strong':tag==='i'?'em':tag;return`<${o}>${i}</${o}>`;}
  if(tag==='p'){const sig=[...node.childNodes].filter(c=>c.nodeType===1||(c.nodeType===3&&c.nodeValue.trim().length>0));if(sig.length===1&&sig[0].nodeType===1&&/^(strong|b)$/.test(sig[0].tagName.toLowerCase())){const t=sig[0].textContent.trim();if(t)return{block:true,html:`<h3>${t}</h3>`};}const res=[];let pend='';const flush=()=>{const t=normalizeInline(pend);if(t)res.push({block:true,html:`<p>${t}</p>`});pend='';};for(const c of node.childNodes){if(c.nodeType===3){if(c.nodeValue)pend+=c.nodeValue;continue;}if(c.nodeType!==1)continue;const ct=c.tagName.toLowerCase();if(SKIP_TAGS.has(ct))continue;const s=serializeNode(c);if(!s)continue;if(typeof s==='object'){flush();res.push(s);}else pend+=s;}flush();if(!res.length)return'';if(res.length===1)return res[0];return res;}
  if(CONTAINER_TAGS.has(tag)){const res=[];let pend='';const flush=()=>{const t=normalizeInline(pend);if(t)res.push({block:true,html:`<p>${t}</p>`});pend='';};for(const c of node.childNodes){const s=serializeNode(c);if(!s)continue;if(Array.isArray(s)){flush();res.push(...s);}else if(typeof s==='object'){flush();res.push(s);}else{if(pend&&!pend.endsWith(' ')&&!s.startsWith(' '))pend+=' ';pend+=s;}}flush();if(!res.length)return'';if(res.length===1)return res[0];return res;}
  if(BLOCK_ELEMENTS.has(tag)){const i=serializeChildren(node).trim();return i?{block:true,html:i}:'';}
  return serializeChildren(node);
}

function sanitize(html, articleUrl) {
  let siteOrigin='';try{siteOrigin=new URL(articleUrl).origin;}catch{}
  _currentBaseUrl=siteOrigin;
  const dom=new JSDOM('',articleUrl?{url:articleUrl}:{});
  const DOMPurify=createDOMPurify(dom.window);
  const stripped=html
    .replace(/<figure[\s\S]*?<\/figure>/gi,'')
    .replace(/<style[\s\S]*?<\/style>/gi,'')
    .replace(/<button[\s\S]*?<\/button>/gi,'')
    .replace(/<img[^>]*data-hook="gallery-item-image-img-preload"[^>]*\/?>/gi,'')
    .replace(/<img[^>]*class="[^"]*blur[^"]*"[^>]*\/?>/gi,'')
    .replace(/(<br\s*\/?>[\s\u00a0]*){2,}/gi,'</p><p>');
  const clean=DOMPurify.sanitize(stripped,{
    ALLOWED_TAGS:['p','br','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','strong','b','em','i','a','mark','sup','sub','div','span','section','article','img'],
    ALLOWED_ATTR:['href','src','srcset','data-src','data-srcset','data-alt','rel','alt'],
    KEEP_CONTENT:true
  });
  dom.window.document.body.innerHTML=clean;
  const body=dom.window.document.body;
  const DROP=/\bdrop-?cap\b|wp-dropcap/i;
  [...body.querySelectorAll('span')].forEach(s=>{const t=s.textContent;if(DROP.test(s.getAttribute('class')||'')||(/^[A-Z]$/.test(t.trim())&&s.children.length===0))s.replaceWith(dom.window.document.createTextNode(t));});
  const blocks=[];let pend='';
  const flushI=()=>{const t=normalizeInline(pend);if(t)blocks.push(`<p>${t}</p>`);pend='';};
  const emitB=(s)=>{const h=normalizeInline(s.html);if(!h)return;if(/^<(h[1-6]|ul|ol|blockquote|pre|p|img)[\s>]/i.test(h))blocks.push(h);else blocks.push(`<p>${h}</p>`);};
  for(const c of body.childNodes){const s=serializeNode(c);if(!s)continue;if(Array.isArray(s)){flushI();for(const i of s)if(typeof i==='object')emitB(i);}else if(typeof s==='object'){flushI();emitB(s);}else{if(pend&&!pend.endsWith(' ')&&!s.startsWith(' '))pend+=' ';pend+=s;}}
  flushI();
  const grouped=[];let run=[];const flushR=()=>{if(!run.length)return;grouped.push(run.length===1?run[0]:`<div data-gallery="true">${run.join('')}</div>`);run=[];};
  for(const b of blocks){if(/^<img[\s>]/i.test(b))run.push(b);else{flushR();grouped.push(b);}}flushR();
  dom.window.close();
  return grouped.join('\n');
}

(async () => {
  const page = await getPage();
  const url = 'https://www.newslinetci.com/post/saphora-grace-bay-launched';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));

    const rawHtml = await page.evaluate(() => {
      const el = document.querySelector('div[data-id="content-viewer"]');
      return el ? el.innerHTML : null;
    });

    if (!rawHtml) { console.log('Content not found'); return; }

    // Check what src values are in the captured HTML
    const sampleSrc = rawHtml.match(/data-hook="gallery-item-image-img"[^>]*src="([^"]*)"/i)?.[1] || 'none';
    console.log('Sample gallery src in captured HTML:', sampleSrc.substring(0, 100));

    const raw_content = sanitize(rawHtml, url).replace(/Share this:.*$/i, '').trim();

    const imgs = raw_content.match(/<img[^>]*>/g) || [];
    console.log('Final: imgs=', imgs.length, 'hasGallery=', raw_content.includes('data-gallery'));
    if (imgs[0]) console.log('Sample final img:', imgs[0].substring(0, 120));

    await pool.query('UPDATE articles SET raw_content = $1, updated_at = NOW() WHERE id = 2924', [raw_content]);
    console.log('Updated article 2924 in production DB.');
  } finally {
    await closePage(page);
    await pool.end();
    process.exit(0);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
