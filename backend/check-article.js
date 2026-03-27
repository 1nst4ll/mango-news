require('dotenv').config({ path: './.env' });
const { getPage, closePage } = require('./src/browserPool');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

let _currentBaseUrl = '';
let _imgIndex = [];
const _resolveUrl = (url) => { if (!url || !_currentBaseUrl) return url; try { return new URL(url, _currentBaseUrl).href; } catch { return url; } };

const SKIP_TAGS = new Set(['script','style','noscript','iframe','nav','form','figure','figcaption','button']);
const CONTAINER_TAGS = new Set(['div','section','article','aside','main','header','footer']);

function serializeChildren(node){let r='';for(const c of node.childNodes){const s=serializeNode(c);if(!s)continue;if(typeof s==='object'){if(r&&!r.endsWith(' '))r+=' ';r+=s.html;}else{if(r&&!r.endsWith(' ')&&!s.startsWith(' '))r+=' ';r+=s;}}return r;}
function serializeNode(node){
  if(node.nodeType===3)return node.nodeValue;if(node.nodeType!==1)return'';
  const tag=node.tagName.toLowerCase();if(SKIP_TAGS.has(tag))return'';
  if(tag==='img'){
    const idxAttr=node.getAttribute('data-imgidx');
    const entry=(idxAttr!==null&&_imgIndex[parseInt(idxAttr,10)])||null;
    console.log(`  img node: data-imgidx=${idxAttr}, entry.src=${entry?.src?.substring(0,80)}`);
    if(!entry)return'';
    const resolved = _resolveUrl(entry.src);
    console.log(`  resolved: ${resolved.substring(0,80)}`);
    return{block:true,html:`<img src="${resolved}" alt="${entry.alt||''}">`};
  }
  if(CONTAINER_TAGS.has(tag)){const res=[];for(const c of node.childNodes){const s=serializeNode(c);if(!s)continue;if(Array.isArray(s))res.push(...s);else if(typeof s==='object')res.push(s);}return res.length?res:'';}
  if(tag==='p'){const i=serializeChildren(node);return i.trim()?{block:true,html:`<p>${i}</p>`}:'';}
  return serializeChildren(node);
}

(async () => {
  const page = await getPage();
  const url = 'https://www.newslinetci.com/post/saphora-grace-bay-launched';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1500));
    const rawHtml = await page.evaluate(() => { const el = document.querySelector('div[data-id="content-viewer"]'); return el ? el.innerHTML : null; });

    let siteOrigin = new URL(url).origin;
    _currentBaseUrl = siteOrigin;
    const imgIndexLocal = [];

    const stripped = rawHtml
      .replace(/<figure[\s\S]*?<\/figure>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<button[\s\S]*?<\/button>/gi,'')
      .replace(/<img[^>]*data-hook="gallery-item-image-img-preload"[^>]*\/?>/gi,'')
      .replace(/<img[^>]*class="[^"]*blur[^"]*"[^>]*\/?>/gi,'')
      .replace(/(<br\s*\/?>[\s\u00a0]*){2,}/gi,'</p><p>')
      .replace(/<img(\s[^>]*?)>/gi,(match,attrs)=>{
        const src=attrs.match(/\bsrc="([^"]*)"/i)?.[1]||'';const srcset=attrs.match(/\bsrcset="([^"]*)"/i)?.[1]||'';
        const alt=attrs.match(/\balt="([^"]*)"/i)?.[1]||'';const idx=imgIndexLocal.length;
        imgIndexLocal.push({src,srcset,alt,dataSrc:'',dataSrcset:''});return `<img data-imgidx="${idx}">`;
      });

    console.log('imgIndexLocal size:', imgIndexLocal.length);
    console.log('imgIndexLocal[1].src:', imgIndexLocal[1]?.src?.substring(0,100));
    _imgIndex = imgIndexLocal;

    const dom = new JSDOM('', { url });
    const DOMPurify = createDOMPurify(dom.window);
    const clean = DOMPurify.sanitize(stripped, {
      ALLOWED_TAGS:['p','br','h1','h2','h3','ul','ol','li','blockquote','strong','b','em','i','a','div','span','section','article','img'],
      ALLOWED_ATTR:['href','data-imgidx','alt'],KEEP_CONTENT:true
    });

    // Check that data-imgidx survived DOMPurify
    const sampleImg = clean.match(/<img[^>]*>/)?.[0] || 'no img';
    console.log('\nAfter DOMPurify, first img tag:', sampleImg);

    dom.window.document.body.innerHTML = clean;
    const body = dom.window.document.body;
    const blocks = [];
    for(const c of body.childNodes){const s=serializeNode(c);if(!s)continue;if(Array.isArray(s)){for(const i of s)if(typeof i==='object')blocks.push(normalizeI(i.html));}else if(typeof s==='object')blocks.push(normalizeI(s.html));}
    function normalizeI(h){return h;}

    console.log('\nFinal blocks with img:');
    blocks.filter(b=>b.includes('<img')).slice(0,2).forEach(b=>console.log(' ',b.substring(0,150)));

    dom.window.close();
  } finally {
    await closePage(page);
    process.exit(0);
  }
})().catch(e => { console.error(e.message); process.exit(1); });
