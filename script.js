/* ===== 置き換え必要 ===== */
const LIFF_ID  = '2007818793-rO8zbvoD';
const API_ROOT = 'https://calendar-api-454724905787.asia-northeast1.run.app';
/* ======================= */

let selectedSlot = null;
let lineUserId   = null;

document.addEventListener('DOMContentLoaded', main);

async function main() {
  await liff.init({ liffId: LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: location.href });
    return;
  }

  const profile = await liff.getProfile();
  lineUserId    = profile.userId;

  loadSlots();
}

async function loadSlots() {
  const res   = await fetch(`${API_ROOT}?action=getSlots`);
  const slots = await res.json();
  renderSlots(slots);
}

function renderSlots(slots) {
  const loading = document.getElementById('loading');
  const cont    = document.getElementById('slots-container');
  loading.style.display = 'none';

  if (!slots.length) {
    cont.innerHTML = '<p>現在予約可能な時間がありません。</p>';
    return;
  }

  const grouped = slots.reduce((o, iso) => {
    const k = new Date(iso).toLocaleDateString('ja-JP',{year:'numeric',month:'short',day:'numeric',weekday:'short'});
    (o[k] = o[k] || []).push(iso); return o;
  }, {});

  cont.innerHTML = Object.entries(grouped).map(([d, arr]) => `
    <div class="slot-group">
      <div class="slot-date">${d}</div>
      ${arr.map(iso => {
        const t = new Date(iso).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
        return `<button class="slot-button" onclick="selectSlot('${iso}',this)">${t}</button>`;
      }).join('')}
    </div>`).join('');
}

window.selectSlot = (iso, btn) => {
  document.querySelectorAll('.slot-button')
    .forEach(b => b.style.backgroundColor = '#00B900');
  btn.style.backgroundColor = '#007500';
  selectedSlot = iso;
  document.getElementById('selected-slot-text').textContent =
    new Date(iso).toLocaleString('ja-JP');
  document.getElementById('form-area').style.display = 'block';
};

document.getElementById('submit-button').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const tel  = document.getElementById('tel').value.trim();
  if (!selectedSlot || !name || !tel) { alert('全欄入力'); return; }

  const btn = document.getElementById('submit-button');
  btn.disabled = true; btn.textContent = '予約処理中…';

  const res = await fetch(API_ROOT, {
    method : 'POST',
    headers: { 'Content-Type':'application/json' },
    body   : JSON.stringify({
      action :'book',
      slot   : selectedSlot,
      name, tel, lineUserId
    })
  });
  const json = await res.json();
  alert(json.message);
  if (json.success) liff.closeWindow();
  else { btn.disabled=false; btn.textContent='この内容で予約する'; }
});
