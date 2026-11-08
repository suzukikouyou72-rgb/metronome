// DOM まわりの小さなヘルパー
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 真偽値のスイッチ表示 */
export function setSwitch(b, on, label) {
  b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(!!on));
  b.innerHTML = (label ? `<span>${esc(label)}</span>` : '') + '<i class="tgl"></i>';
}
