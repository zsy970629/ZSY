const $ = (selector) => document.querySelector(selector);
const fileInput = $('#fileInput');
const dropzone = $('#dropzone');
const uploadPrompt = $('#uploadPrompt');
const previewWrap = $('#previewWrap');
const preview = $('#preview');
const removeImage = $('#removeImage');
const analyzeButton = $('#analyzeButton');
const emptyResult = $('#emptyResult');
const loadingResult = $('#loadingResult');
const resultContent = $('#resultContent');
const errorMessage = $('#errorMessage');
const historyList = $('#historyList');

let selectedFile = null;

function setFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return showError('請選擇圖片檔案。');
  if (file.size > 10 * 1024 * 1024) return showError('圖片大小不能超過 10MB。');
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  uploadPrompt.classList.add('hidden');
  previewWrap.classList.remove('hidden');
  analyzeButton.disabled = false;
  clearError();
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  preview.src = '';
  previewWrap.classList.add('hidden');
  uploadPrompt.classList.remove('hidden');
  analyzeButton.disabled = true;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function clearError() { errorMessage.classList.add('hidden'); errorMessage.textContent = ''; }

function setView(view) {
  emptyResult.classList.toggle('hidden', view !== 'empty');
  loadingResult.classList.toggle('hidden', view !== 'loading');
  resultContent.classList.toggle('hidden', view !== 'result');
}

function renderResult(result) {
  const ingredients = result.items?.length
    ? `<div class="ingredient-list">${result.items.map((item) => `<div class="ingredient"><span>${escapeHtml(item.name)}</span><span>${item.calories} kcal</span></div>`).join('')}</div>`
    : '';
  resultContent.innerHTML = `
    <div class="result-title-row"><div><h3>${escapeHtml(result.dishName)}</h3><p class="serving">${escapeHtml(result.serving)}</p></div><span class="confidence">信心 ${result.confidence}%</span></div>
    <div class="calorie-main"><strong>${result.calories}</strong><span>kcal 估算</span></div>
    <div class="macro-grid"><div class="macro"><p>蛋白質</p><strong>${result.protein}</strong> <span>g</span></div><div class="macro"><p>碳水</p><strong>${result.carbs}</strong> <span>g</span></div><div class="macro"><p>脂肪</p><strong>${result.fat}</strong> <span>g</span></div></div>
    ${ingredients}<p class="result-note">💡 ${escapeHtml(result.note)}</p>`;
  setView('result');
  saveHistory(result);
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }

async function analyze() {
  if (!selectedFile) return;
  analyzeButton.disabled = true;
  analyzeButton.querySelector('span').textContent = '分析中…';
  clearError();
  setView('loading');
  const formData = new FormData();
  formData.append('foodImage', selectedFile);
  try {
    const response = await fetch('/api/analyze', { method:'POST', body:formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '辨識失敗');
    renderResult(data.result);
  } catch (error) {
    setView('empty');
    showError(error.message || '辨識失敗，請稍後再試。');
  } finally {
    analyzeButton.disabled = !selectedFile;
    analyzeButton.querySelector('span').textContent = '開始 AI 辨識';
  }
}

function saveHistory(result) {
  const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
  history.unshift({ dishName: result.dishName, calories: result.calories, date: new Date().toLocaleDateString('zh-TW', { month:'numeric', day:'numeric' }) });
  localStorage.setItem('foodHistory', JSON.stringify(history.slice(0, 5)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('foodHistory') || '[]');
  if (!history.length) { historyList.innerHTML = '<p class="muted">完成第一次辨識後，紀錄會出現在這裡。</p>'; return; }
  historyList.innerHTML = `<div class="history-items">${history.map((item) => `<div class="history-item"><div><strong>${escapeHtml(item.dishName)}</strong><small>${item.date}</small></div><div class="history-calories">${item.calories} <small>kcal</small></div></div>`).join('')}</div>`;
}

fileInput.addEventListener('change', (event) => setFile(event.target.files[0]));
removeImage.addEventListener('click', (event) => { event.preventDefault(); clearFile(); });
analyzeButton.addEventListener('click', analyze);
['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', (event) => setFile(event.dataTransfer.files[0]));
$('#clearHistory').addEventListener('click', () => { localStorage.removeItem('foodHistory'); renderHistory(); });
renderHistory();
