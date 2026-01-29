/**
 * VRChat 自己紹介カードメーカー - メインスクリプト（プロ版エクスポート）
 * - 画面プレビューDOMは触らず、保存専用にクローンDOMを生成して固定サイズでhtml2canvas
 * - フォント/画像の読み込み待ち、DPRを考慮した高解像度出力
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
const decorationBtns = document.querySelectorAll('.decoration-btn');
const downloadBtn = document.getElementById('downloadBtn');
const copyTextBtn = document.getElementById('copyTextBtn');

const labels = {
  oneLiner: '一言',
  activeTime: '活動時間',
  favorite: '好きなワールド・アバター',
  friendRequest: 'フレンド申請',
  hobby: '趣味・興味',
};

// テーマ別：export時の背景（html2canvasは透過/グラデ/背景合成で事故ることがあるので保険）
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

// ========================
// Utility
// ========================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function wrapLine(label, value) {
  if (!value || !value.trim()) return '';
  return `<span class="label">${label}</span>${escapeHtml(value.trim())}`;
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

function getActiveThemeName() {
  return cardPreview.classList.contains('industrial') ? 'industrial'
    : cardPreview.classList.contains('fantasy') ? 'fantasy'
    : cardPreview.classList.contains('kawaii') ? 'kawaii'
    : cardPreview.classList.contains('chocolate') ? 'chocolate'
    : 'modern';
}

// html2canvas lazy-load
async function ensureHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error('html2canvas の読み込みに失敗しました'));
  });
  if (!window.html2canvas) throw new Error('html2canvas が利用できません');
  return window.html2canvas;
}

// フォント読み込み待ち（これやらないと文字幅が変わって崩れる）
async function waitFontsReady() {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (_) {
    // 失敗しても続行
  }
}

// 画像読み込み待ち（clone内のimgも含めて確実に）
function waitImagesLoaded(rootEl) {
  const imgs = Array.from(rootEl.querySelectorAll('img'));
  const promises = imgs.map((img) => new Promise((resolve) => {
    // 既に完了
    if (img.complete && img.naturalWidth > 0) return resolve();

    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }));
  return Promise.all(promises);
}

// 保存専用のオフスクリーンコンテナ作成
function createOffscreenStage() {
  let stage = document.getElementById('__export_stage__');
  if (stage) stage.remove();

  stage = document.createElement('div');
  stage.id = '__export_stage__';
  stage.style.position = 'fixed';
  stage.style.left = '-10000px';
  stage.style.top = '0';
  stage.style.width = '0';
  stage.style.height = '0';
  stage.style.overflow = 'hidden';
  stage.style.zIndex = '-1';
  document.body.appendChild(stage);
  return stage;
}

// 保存用クローンを作って固定サイズで配置
function buildExportClone({ width, height }) {
  const stage = createOffscreenStage();

  const wrapper = document.createElement('div');
  wrapper.style.width = width + 'px';
  wrapper.style.height = height + 'px';
  wrapper.style.display = 'block';
  wrapper.style.background = 'transparent';

  // cardPreviewをクローン
  const clone = cardPreview.cloneNode(true);

  // ID重複を避ける（html2canvasの内部処理で参照事故るのを避ける）
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

  // 画面用制約（max-width/aspect-ratio）を完全に潰して、保存用ピクセルに固定
  clone.style.width = width + 'px';
  clone.style.height = height + 'px';
  clone.style.maxWidth = 'none';
  clone.style.aspectRatio = 'auto';

  // 念のため：transform等で計測誤差が出るのを封じる
  clone.style.transform = 'none';

  wrapper.appendChild(clone);
  stage.appendChild(wrapper);

  return { stage, wrapper, clone };
}

// ========================
// Event wiring
// ========================

// アバター画像：DataURL化してプレビュー（保存で確実に含める）
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

// テーマ選択
themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyCardClasses();
  });
});

// 装飾選択
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
      // imgタグで埋める（DataURLなのでCORS不要）
      cardWatermark.innerHTML = '<img src="' + reader.result + '" alt="">';
      cardWatermark.style.opacity = (opacity / 100).toString();
    };
    reader.readAsDataURL(file);
  });
}

// 透過度スライダー
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

// ステータスタグ変更で更新
if (statusTagList) {
  statusTagList.addEventListener('change', updatePreview);
}

updatePreview();
applyCardClasses();

// ========================
// Export（完全版）
// ========================
downloadBtn.addEventListener('click', async () => {
  // 保存品質：ここで固定（3:4）
  // 900x1200 はSNS用途で十分高精細。もっと欲しければここを上げるだけでいい。
  const EXPORT_WIDTH = 900;
  const EXPORT_HEIGHT = 1200;

  // 端末DPRを考慮（ただし上限設けないとメモリ爆発する）
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  try {
    const html2canvas = await ensureHtml2Canvas();

    // 画面側のフォント確定
    await waitFontsReady();

    // 保存用クローン作成
    const { stage, wrapper, clone } = buildExportClone({
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
    });

    // clone内のimgロード待ち（アバター/透かし含む）
    await waitImagesLoaded(wrapper);

    // テーマ背景色（透明事故避け）
    const theme = getActiveThemeName();
    const bg = themeBgForExport[theme] || '#ffffff';

    // html2canvas：cloneを撮る（wrapperでもcloneでもOK、今回はclone）
    const canvas = await html2canvas(clone, {
      backgroundColor: bg,
      scale: dpr,              // DPR分だけ高解像度に
      useCORS: true,           // 外部画像が混ざる可能性に備える
      allowTaint: true,        // DataURL主体なら問題ないが保険
      logging: false,
      // width/heightは指定しない：clone自体を固定pxにしてるので不要＆ズレの元
    });

    // 後片付け（超重要：残すと次回以降バグる）
    stage.remove();

    // ダウンロード
    const link = document.createElement('a');
    const name = (fields.vrName.value || 'vr-card').trim().replace(/\s+/g, '_');
    link.download = `vrchat-intro-${name}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    alert('画像の保存に失敗しました: ' + (e && (e.message || e) ? (e.message || e) : 'unknown error'));
  }
});

// ========================
// Copy text
// ========================
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
