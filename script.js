/**
 * VRChat 自己紹介カードメーカー - メインスクリプト
 * 4:3 横長・アバター画像・複数テーマ（モダン/インダストリアル/ファンタジー/Kawaii）
 */

const fields = {
  vrName: document.getElementById('vrName'),
  pronouns: document.getElementById('pronouns'),
  oneLiner: document.getElementById('oneLiner'),
  activeTime: document.getElementById('activeTime'),
  favorite: document.getElementById('favorite'),
  friendRequest: document.getElementById('friendRequest'),
  hobby: document.getElementById('hobby'),
};

const preview = {
  name: document.getElementById('previewName'),
  pronouns: document.getElementById('previewPronouns'),
  oneLiner: document.getElementById('previewOneLiner'),
  activeTime: document.getElementById('previewActiveTime'),
  favorite: document.getElementById('previewFavorite'),
  friendRequest: document.getElementById('previewFriendRequest'),
  hobby: document.getElementById('previewHobby'),
};

const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const avatarPlaceholder = document.getElementById('avatarPlaceholder');
const cardPreview = document.getElementById('cardPreview');
const statusTagList = document.getElementById('statusTagList');
const statusTagsPreview = document.getElementById('statusTagsPreview');
const themeButtons = document.querySelectorAll('.theme-btn');
const downloadBtn = document.getElementById('downloadBtn');
const copyTextBtn = document.getElementById('copyTextBtn');

const labels = {
  oneLiner: '一言',
  activeTime: '活動時間',
  favorite: '好きなワールド・アバター',
  friendRequest: 'フレンド申請',
  hobby: '趣味・興味',
};

const themeBgForExport = {
  modern: '#ffffff',
  industrial: '#1e1e1e',
  fantasy: '#3d2c2a',
  kawaii: '#fff8f5',
  chocolate: '#f0e0cc',
};

const watermarkInput = document.getElementById('watermarkInput');
const watermarkOpacity = document.getElementById('watermarkOpacity');
const watermarkOpacityValue = document.getElementById('watermarkOpacityValue');
const cardWatermark = document.getElementById('cardWatermark');
const decorationBtns = document.querySelectorAll('.decoration-btn');

// プレビュー用にラベル付きブロックを生成
function wrapLine(label, value) {
  if (!value || !value.trim()) return '';
  return `<span class="label">${label}</span>${escapeHtml(value.trim())}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getSelectedStatusTags() {
  const checkboxes = statusTagList.querySelectorAll('input[name="status"]:checked');
  return Array.from(checkboxes).map((cb) => cb.value);
}

function updateStatusTagsPreview() {
  const selected = getSelectedStatusTags();
  statusTagsPreview.innerHTML = '';
  selected.forEach((label) => {
    const chip = document.createElement('span');
    chip.className = 'status-chip';
    chip.textContent = label;
    statusTagsPreview.appendChild(chip);
  });
}

function updatePreview() {
  const name = (fields.vrName.value || '').trim() || 'VRChat名';
  preview.name.textContent = name;
  preview.pronouns.textContent = (fields.pronouns.value || '').trim();
  preview.pronouns.style.display = preview.pronouns.textContent ? 'block' : 'none';

  preview.oneLiner.innerHTML = wrapLine(labels.oneLiner, fields.oneLiner.value);
  preview.activeTime.innerHTML = wrapLine(labels.activeTime, fields.activeTime.value);
  preview.favorite.innerHTML = wrapLine(labels.favorite, fields.favorite.value);
  preview.friendRequest.innerHTML = wrapLine(labels.friendRequest, fields.friendRequest.value);
  preview.hobby.innerHTML = wrapLine(labels.hobby, fields.hobby.value);

  updateStatusTagsPreview();
}

// アバター画像: ファイル選択 → Data URL で表示（画像保存時に確実に含まれるように）
avatarInput.addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !file.type.startsWith('image/')) {
    avatarPreview.style.display = 'none';
    avatarPreview.src = '';
    if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    avatarPreview.src = reader.result;
    avatarPreview.alt = 'アバター';
    avatarPreview.style.display = 'block';
    if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// テーマ・装飾のクラスを組み立て（縦長カード用）
function getCardBaseClasses() {
  const themeBtn = document.querySelector('.theme-btn.active');
  const theme = themeBtn && themeBtn.dataset.theme ? themeBtn.dataset.theme : 'modern';
  const decoBtn = document.querySelector('.decoration-btn.active');
  const deco = decoBtn && decoBtn.dataset.decoration ? decoBtn.dataset.decoration : 'none';
  const decoClass = deco === 'none' ? 'deco-none' : 'deco-' + deco;
  let c = 'card ' + theme + ' ' + decoClass;
  if (theme === 'chocolate') c += ' bg-check';
  return c;
}

function applyCardClasses() {
  if (cardPreview) cardPreview.className = getCardBaseClasses();
}

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyCardClasses();
  });
});

if (decorationBtns && decorationBtns.length) {
  decorationBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      decorationBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyCardClasses();
    });
  });
}

// 背景透かし画像
if (watermarkInput && cardWatermark) {
  watermarkInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      cardWatermark.innerHTML = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const opacity = watermarkOpacity ? watermarkOpacity.value : 30;
      cardWatermark.innerHTML = '<img src="' + reader.result + '" alt="">';
      cardWatermark.style.opacity = (opacity / 100).toString();
    };
    reader.readAsDataURL(file);
  });
}

if (watermarkOpacity) {
  watermarkOpacity.addEventListener('input', () => {
    if (watermarkOpacityValue) watermarkOpacityValue.textContent = watermarkOpacity.value;
    if (cardWatermark) cardWatermark.style.opacity = watermarkOpacity.value / 100;
  });
}

// フォーム変更でプレビュー更新
Object.values(fields).forEach((el) => {
  if (el) {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  }
});

// ステータスタグの選択でプレビュー更新
if (statusTagList) {
  statusTagList.addEventListener('change', updatePreview);
}

updatePreview();

// 画像で保存（4:3 横長・html2canvas）
downloadBtn.addEventListener('click', async () => {
  try {
    let html2canvas = window.html2canvas;
    if (!html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('html2canvas の読み込みに失敗しました'));
      });
    }
    html2canvas = window.html2canvas;

    const theme = cardPreview.classList.contains('industrial') ? 'industrial'
      : cardPreview.classList.contains('fantasy') ? 'fantasy'
      : cardPreview.classList.contains('kawaii') ? 'kawaii'
      : cardPreview.classList.contains('chocolate') ? 'chocolate'
      : 'modern';
    const bg = themeBgForExport[theme] || '#ffffff';

    const width = 900;
    const height = 1200;
    const canvas = await html2canvas(cardPreview, {
      width,
      height,
      scale: 1,
      backgroundColor: bg,
    });

    const link = document.createElement('a');
    const name = (fields.vrName.value || 'vr-card').trim().replace(/\s+/g, '_');
    link.download = `vrchat-intro-${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    alert('画像の保存に失敗しました: ' + (e.message || e));
  }
});

// テキストをコピー
copyTextBtn.addEventListener('click', () => {
  const statusTags = getSelectedStatusTags();
  const lines = [
    '【VRChat 自己紹介】',
    `名前: ${(fields.vrName.value || '').trim()}`,
    (fields.pronouns.value || '').trim() ? `Pronouns: ${fields.pronouns.value.trim()}` : '',
    statusTags.length ? `ステータス: ${statusTags.join(' / ')}` : '',
    (fields.oneLiner.value || '').trim() ? `一言: ${fields.oneLiner.value.trim()}` : '',
    (fields.activeTime.value || '').trim() ? `活動時間: ${fields.activeTime.value.trim()}` : '',
    (fields.favorite.value || '').trim() ? `好きなワールド・アバター: ${fields.favorite.value.trim()}` : '',
    (fields.friendRequest.value || '').trim() ? `フレンド申請: ${fields.friendRequest.value.trim()}` : '',
    (fields.hobby.value || '').trim() ? `趣味: ${fields.hobby.value.trim()}` : '',
  ].filter(Boolean);

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(
    () => alert('テキストをコピーしました'),
    () => alert('コピーに失敗しました')
  );
});
