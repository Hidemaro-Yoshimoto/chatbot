/* ===== 必要箇所だけ置き換えてください ===== */
const LIFF_ID  = '2007818793-rO8zbvoD';   // あなたの LIFF ID
const API_ROOT = 'https://calendar-api-454724905787.asia-northeast1.run.app'; // Cloud Run URL
/* ========================================== */

let selectedSlot = null;   // クリックされた枠の ISO 文字列
let lineUserId   = null;   // LIFF から取得するユーザー ID

document.addEventListener('DOMContentLoaded', main);

/* ───────── 初期化 ───────── */
async function main () {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {          // 未ログインなら LINE 認可へ
      liff.login({ redirectUri: location.href });
      return;
    }
    lineUserId = (await liff.getProfile()).userId;
    await loadSlots();                 // 空き枠取得
  } catch (err) {
    console.error(err);
    document.getElementById('loading').textContent = '初期化に失敗しました';
  }
}

/* ───────── 空き枠取得 ───────── */
async function loadSlots () {
  const r = await fetch(`${API_ROOT}/slots`);
  if (!r.ok) throw new Error(await r.text());
  const slots = await r.json();        // ISO 文字列配列
  renderSlots(slots);
}

/* ───────── 描画 ───────── */
function renderSlots (slots) {
  const loading = document.getElementById('loading');
  const cont    = document.getElementById('slots-container');
  loading.style.display = 'none';

  if (!slots || !slots.length) {
    cont.innerHTML = '<p>現在予約可能な時間がありません。</p>';
    return;
  }

  /* 日付キーごとにグループ化 */
  const grouped = slots.reduce((obj, iso) => {
    const key = new Date(iso)
      .toLocaleDateString('ja-JP',{ year:'numeric', month:'short',
                                    day:'numeric', weekday:'short' });
    (obj[key] = obj[key] || []).push(iso);
    return obj;
  }, {});

  /* HTML 組み立て */
  let html = '';
  for (const [date, arr] of Object.entries(grouped)) {
    html += `<div class="slot-group"><div class="slot-date">${date}</div>`;
    arr.forEach(iso => {
      const time = new Date(iso)
        .toLocaleTimeString('ja-JP',{ hour:'2-digit', minute:'2-digit' });
      html += `<button class="slot-button"
                       onclick="selectSlot('${iso}',this)">${time}</button>`;
    });
    html += '</div>';
  }
  cont.innerHTML = html;
}

/* ───────── スロット選択 ───────── */
window.selectSlot = function (iso, btn) {
  document.querySelectorAll('.slot-button')
    .forEach(b => b.style.backgroundColor = '#00B900');   // リセット
  btn.style.backgroundColor = '#007500';                  // 選択色

  selectedSlot = iso;
  document.getElementById('selected-slot-text').textContent =
    new Date(iso).toLocaleString('ja-JP');
  document.getElementById('form-area').style.display = 'block';
};

/* ───────── 予約確定 ───────── */
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
      body   : JSON.stringify({ slot: selectedSlot, name, tel, lineUserId })
    });
    const json = await res.json();
    alert(json.message);
    if (json.success) liff.closeWindow();
    else { btn.disabled = false; btn.textContent = 'この内容で予約する'; }
  } catch (err) {
    alert('通信エラー: ' + err);
    btn.disabled = false; btn.textContent = 'この内容で予約する';
  }
});
