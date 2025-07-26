/* ===== 必要箇所を書き換えてください ===== */
const LIFF_ID  = '2007818793-rO8zbvoD';   // あなたの LIFF ID
const API_ROOT = 'https://calendar-api-454724905787.asia-northeast1.run.app'; // Cloud Run URL
/* ======================================== */

let selectedSlot = null;
let lineUserId   = null;

document.addEventListener('DOMContentLoaded', main);

/* ---------- LIFF 初期化 ---------- */
async function main () {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: location.href });
      return;
    }
    lineUserId = (await liff.getProfile()).userId;
    await loadSlots();
  } catch (err) {
    console.error(err);
    document.getElementById('loading').textContent = '初期化失敗';
  }
}

/* ---------- 空き枠取得 ---------- */
async function loadSlots () {
  const r = await fetch(`${API_ROOT}/slots`);
  const slots = await r.json();
  renderSlots(slots);
}

/* ---------- 画面描画 ---------- */
function renderSlots (slots) {
  const loading = document.getElementById('loading');
  const cont    = document.getElementById('slots-container');
  loading.style.display = 'none';

  if (!slots.length) {
    cont.innerHTML = '<p>現在予約可能な時間がありません。</p>';
    return;
  }

  const grouped = slots.reduce((o, iso) => {
    const k = new Date(iso)
      .toLocaleDateString('ja-JP',{year:'numeric',month:'short',day:'numeric',weekday:'short'});
    (o[k] = o[k] || []).push(iso); return o;
  }, {});

  cont.innerHTML = Object.entries(grouped).map(([d, arr]) => `
    <div class="slot-group"><div class="slot-date">${d}</div>
      ${arr.map(iso=>{
        const t = new Date(iso)
          .toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
        return `<button class="slot-button" onclick="selectSlot('${iso}',this)">${t}</button>`;
      }).join('')}
    </div>`).join('');
}

/* ---------- スロット選択 ---------- */
window.selectSlot = function (iso, btn) {
  document.querySelectorAll('.slot-button')
    .forEach(b => b.style.backgroundColor = '#00B900');
  btn.style.backgroundColor = '#007500';

  selectedSlot = iso;
  document.getElementById('selected-slot-text')
    .textContent = new Date(iso).toLocaleString('ja-JP');
  document.getElementById('form-area').style.display = 'block';
};

/* ---------- 予約送信 ---------- */
document.getElementById('submit-button')
  .addEventListener('click', async () => {

  const name = document.getElementById('name').value.trim();
  const tel  = document.getElementById('tel').value.trim();
  if (!selectedSlot || !name || !tel) {
    alert('すべての項目を入力してください'); return;
  }

  const btn = document.getElementById('submit-button');
  btn.disabled = true; btn.textContent = '予約処理中…';

  try {
    const res = await fetch(`${API_ROOT}/reserve`, {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
      body   : JSON.stringify({ slot:selectedSlot, name, tel, lineUserId })
    });
    const json = await res.json();

    if (json.success) showThankYou(name, tel);
    else {
      alert(json.message);
      btn.disabled = false; btn.textContent = 'この内容で予約する';
    }
  } catch (err) {
    alert('通信エラー: ' + err);
    btn.disabled = false; btn.textContent = 'この内容で予約する';
  }
});

/* ---------- 予約完了画面表示 ---------- */
function showThankYou (name, tel) {
  // 既存領域を隠す
  document.getElementById('slots-container').style.display = 'none';
  document.getElementById('form-area').style.display       = 'none';

  // 確定情報を挿入
  const dt = new Date(selectedSlot)
    .toLocaleString('ja-JP',{year:'numeric',month:'short',day:'numeric',
                             hour:'2-digit',minute:'2-digit'});
  document.getElementById('confirm-text').innerHTML =
    `<p>日時：${dt}</p><p>お名前：${name}</p><p>電話番号：${tel}</p>`;

  // 完了画面を表示
  document.getElementById('thankyou').style.display = 'block';
}
