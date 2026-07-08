// HTMLContentView için saf HTML/CSS şablonu + köprü mesaj çözümleyici (spec §4.2).
//
// iOS WKWebView CSS teması birebir portlanır (renkler, tipografi, tablo, blockquote, başlık
// kutuları). Yükseklik JS ile `window.ReactNativeWebView.postMessage` üzerinden bildirilir
// (iOS `messageHandlers.heightChanged` karşılığı); başlık kaydırma offset'i aynı kanaldan.
// Bu modül UI'sız ve saf — jest ile test edilir (CSS üretimi, mesaj çözümleme).

export type ProseStyle = 'article' | 'legal';

export interface HtmlThemeColors {
  text: string;
  heading: string;
  muted: string;
  link: string;
  tableBg: string;
  theadBg: string;
  theadText: string;
  border: string;
  stripe: string;
  h2Box: string;
  blockquoteBg: string;
  legalBlockquoteGradientStart: string;
}

/** Dark tema HTML renkleri (spec §4.2 birebir). */
export const darkHtmlColors: HtmlThemeColors = {
  text: '#E7E5E4',
  heading: '#F5F5F4',
  muted: '#A8A29E',
  link: '#34D399',
  tableBg: '#1A1D22',
  theadBg: '#064E3B',
  theadText: '#A7F3D0',
  border: '#2F3540',
  stripe: '#22262C',
  h2Box: '#22262C',
  blockquoteBg: '#22262C',
  legalBlockquoteGradientStart: '#022C22',
};

/** Light tema HTML renkleri (spec §4.2 birebir). */
export const lightHtmlColors: HtmlThemeColors = {
  text: '#44403C',
  heading: '#1C1917',
  muted: '#57534E',
  link: '#059669',
  tableBg: '#FFFFFF',
  theadBg: '#ECFDF5',
  theadText: '#166534',
  border: '#E7E5E4',
  stripe: '#FAFAF9',
  h2Box: '#FAFAF9',
  blockquoteBg: '#FAFAF9',
  legalBlockquoteGradientStart: '#ECFDF5',
};

export function htmlColorsFor(isDark: boolean): HtmlThemeColors {
  return isDark ? darkHtmlColors : lightHtmlColors;
}

/** iOS ile aynı prose CSS. proseStyle article/legal h2/h3/blockquote farklarını değiştirir. */
export function buildProseCss(isDark: boolean, proseStyle: ProseStyle): string {
  const c = htmlColorsFor(isDark);
  const h2 =
    proseStyle === 'article'
      ? `h2{font-size:1.25rem;padding:0.65rem 1rem;background:${c.h2Box};border-left:4px solid ${c.link};border-radius:0 1rem 1rem 0;}`
      : `h2{font-size:1.05rem;border-bottom:2px solid ${c.border};padding-bottom:0.35rem;}`;
  const h3 =
    proseStyle === 'article' ? 'h3{font-size:1.05rem;}' : 'h3{font-size:0.95rem;}';
  const blockquote =
    proseStyle === 'legal'
      ? `blockquote{border-left:3px solid ${c.link};background:linear-gradient(90deg, ${c.legalBlockquoteGradientStart}, transparent);border-radius:0 .75rem .75rem 0;padding:0.5rem 1rem;margin:1rem 0;}`
      : `blockquote{background:${c.blockquoteBg};border-radius:.75rem;padding:0.75rem 1rem;margin:1rem 0;}`;

  return [
    `*{box-sizing:border-box;}`,
    `body{margin:0;padding:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.65;color:${c.text};background:transparent;-webkit-text-size-adjust:100%;}`,
    `p{margin:0 0 1rem;}`,
    `a{color:${c.link};font-weight:600;text-decoration:underline;text-underline-offset:3px;}`,
    `h1,h2,h3,h4,h5,h6{color:${c.heading};scroll-margin-top:96px;line-height:1.3;margin:1.5rem 0 0.75rem;}`,
    `h1{font-size:1.5rem;border-bottom:2px solid ${c.link};padding-bottom:0.4rem;}`,
    h2,
    h3,
    `.muted,small{color:${c.muted};}`,
    `img{max-width:100%;height:auto;border-radius:12px;display:block;margin:12px auto;}`,
    `ul,ol{padding-left:1.4rem;margin:0 0 1rem;}`,
    `li{margin:0.25rem 0;}`,
    `li::marker{color:${c.link};}`,
    blockquote,
    `.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:1rem 0;}`,
    `table{width:100%;border-collapse:collapse;background:${c.tableBg};border:1px solid ${c.border};border-radius:14px;overflow:hidden;font-size:13px;}`,
    `thead{background:${c.theadBg};}`,
    `thead th{color:${c.theadText};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:10px 12px;text-align:left;}`,
    `tbody td{padding:9px 12px;border-top:1px solid ${c.border};}`,
    `tbody tr:nth-child(even){background:${c.stripe};}`,
  ].join('');
}

/**
 * Yükseklik ve başlık offset'i bildiren injected JS. iOS `postHeight` (body/doc scrollHeight
 * maks, +12 host tarafında) + `scrollToHeading` mantığı. RN köprüsü:
 * `window.ReactNativeWebView.postMessage(JSON.stringify({type, ...}))`.
 */
export function buildInjectedJs(): string {
  return `
(function(){
  function post(msg){ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } }
  function measure(){
    var b = document.body, d = document.documentElement;
    var h = Math.max(b ? b.scrollHeight : 0, d ? d.scrollHeight : 0, b ? b.offsetHeight : 0, d ? d.offsetHeight : 0);
    post({ type: 'height', height: h });
  }
  window.__scrollToHeading = function(id){
    var el = document.getElementById(id);
    if(!el){ post({ type: 'heading', id: id, offset: 0, found: false }); return; }
    var y = 0, node = el;
    while(node){ y += node.offsetTop || 0; node = node.offsetParent; }
    post({ type: 'heading', id: id, offset: y, found: true });
  };
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);
  document.addEventListener('DOMContentLoaded', measure);
  var imgs = document.getElementsByTagName('img');
  for(var i=0;i<imgs.length;i++){ imgs[i].addEventListener('load', measure); imgs[i].addEventListener('error', measure); }
  setTimeout(measure, 400);
  setTimeout(measure, 1200);
  measure();
  true;
})();
true;
`;
}

/** table'ları yatay kaydırılabilir sarmalar (iOS overflow-x davranışı). */
function wrapTables(html: string): string {
  return html.replace(/<table(\s|>)/gi, '<div class="table-wrap"><table$1').replace(
    /<\/table>/gi,
    '</table></div>',
  );
}

export interface BuildHtmlDocumentOptions {
  html: string;
  isDark: boolean;
  proseStyle: ProseStyle;
}

/** Tam HTML dokümanı (head + CSS + gövde). WebView `source.html` olarak verilir. */
export function buildHtmlDocument({
  html,
  isDark,
  proseStyle,
}: BuildHtmlDocumentOptions): string {
  const css = buildProseCss(isDark, proseStyle);
  const body = wrapTables(html);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"><style>${css}</style></head><body>${body}</body></html>`;
}

/** Reload guard imzası — iOS `"{isDark}-{proseStyle}-{html.hashValue}"`. */
export function reloadSignature(html: string, isDark: boolean, proseStyle: ProseStyle): string {
  return `${isDark ? 1 : 0}-${proseStyle}-${html.length}-${simpleHash(html)}`;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Köprü mesajı çözümleme ──────────────────────────────────────────────────────────

export type BridgeMessage =
  | { type: 'height'; height: number }
  | { type: 'heading'; id: string; offset: number; found: boolean };

/**
 * WebView onMessage gövdesini çözer. iOS debounce/+12 host tarafında uygulanır; burada yalnızca
 * ham mesaj ayrıştırılır. Geçersiz/eksik alan → null.
 */
export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (obj.type === 'height' && typeof obj.height === 'number' && Number.isFinite(obj.height)) {
    return { type: 'height', height: obj.height };
  }
  if (
    obj.type === 'heading' &&
    typeof obj.id === 'string' &&
    typeof obj.offset === 'number' &&
    Number.isFinite(obj.offset)
  ) {
    return { type: 'heading', id: obj.id, offset: obj.offset, found: obj.found === true };
  }
  return null;
}
