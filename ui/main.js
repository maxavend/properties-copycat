import '@rogieking/figui3/fig.css';
import '@rogieking/figui3/fig.js';
import './styles.css';
import { icons } from './icons.js';

const $ = (id) => document.getElementById(id);

const btnCopy = $('btn-copy');
const btnPaste = $('btn-paste');
const btnHideWarnings = $('btn-hide-warnings');
const statusEl = $('status');
const selectionEl = $('selection');
const copiedSection = $('copied-section');
const copiedCount = $('copied-count');
const copiedList = $('copied-list');
const warningsSection = $('warnings-section');
const warningsList = $('warnings-list');
const progressEl = $('progress');
const progressBar = $('progress-bar');
const progressPercent = $('progress-percent');
const progressLabel = $('progress-label');

const BUTTON_LABELS = {
  copy: { idle: 'Copy', busy: 'Copying…' },
  paste: { idle: 'Paste', busy: 'Pasting…' }
};

const LAYER_ICONS = {
  INSTANCE: ['instance', 'component'],
  COMPONENT: ['component', 'component'],
  COMPONENT_SET: ['componentSet', 'component'],
  TEXT: ['text', 'default']
};

let hasCopy = false;
let busy = null; // 'copy' | 'paste' | null
let statusTimer = null;
let progressTimer = null;

function post(type) {
  parent.postMessage({ pluginMessage: { type } }, '*');
}

function setDisabled(button, disabled) {
  if (disabled) button.setAttribute('disabled', '');
  else button.removeAttribute('disabled');
}

function setButtonContent(button, label, loading) {
  const children = [];
  if (loading) {
    const spinner = document.createElement('fig-spinner');
    spinner.setAttribute('size', 'small');
    spinner.setAttribute('slot', 'prepend');
    spinner.setAttribute('aria-hidden', 'true');
    children.push(spinner);
  }
  children.push(label);
  button.replaceChildren(...children);
}

function render() {
  setDisabled(btnCopy, busy !== null);
  setDisabled(btnPaste, busy !== null || !hasCopy);
  setButtonContent(btnCopy, BUTTON_LABELS.copy[busy === 'copy' ? 'busy' : 'idle'], busy === 'copy');
  setButtonContent(btnPaste, BUTTON_LABELS.paste[busy === 'paste' ? 'busy' : 'idle'], busy === 'paste');
  btnCopy.setAttribute('aria-busy', String(busy === 'copy'));
  btnPaste.setAttribute('aria-busy', String(busy === 'paste'));
}

// Icons are static markup from ui/icons.js; layer names always go in as text
function createRow({ tag = 'li', iconName, kind = 'default', text, className }) {
  const row = document.createElement(tag);
  row.className = className ? `row ${className}` : 'row';

  if (iconName === 'warning') {
    const icon = document.createElement('fig-icon');
    icon.setAttribute('name', 'warning');
    icon.setAttribute('size', 'small');
    icon.setAttribute('aria-hidden', 'true');
    icon.className = 'row-icon';
    row.appendChild(icon);
  } else if (iconName) {
    const icon = document.createElement('span');
    icon.className = 'row-icon';
    icon.dataset.kind = kind;
    icon.innerHTML = icons[iconName];
    row.appendChild(icon);
  }

  const label = document.createElement('span');
  label.className = 'row-label';
  label.dataset.kind = kind;
  label.textContent = text;
  row.appendChild(label);
  return row;
}

function renderSelection(selection) {
  if (selection.length === 0) {
    selectionEl.className = 'row row-empty';
    selectionEl.textContent = 'Select an instance';
    return;
  }
  const [iconName, kind] = selection.length === 1
    ? LAYER_ICONS[selection[0].type] || ['frame', 'default']
    : [null, 'default'];
  const text = selection.length === 1 ? selection[0].name : `${selection.length} items`;
  const row = createRow({ tag: 'div', iconName, kind, text });
  selectionEl.className = row.className;
  selectionEl.replaceChildren(...row.childNodes);
}

function renderCopied(instances) {
  copiedSection.hidden = false;
  copiedList.replaceChildren(...(instances.length > 0
    ? instances.map(name => createRow({ iconName: 'instance', kind: 'component', text: name }))
    : [createRow({ text: 'Root copied' })]));
  copiedCount.textContent = instances.length > 0 ? String(instances.length) : '';
}

function renderWarnings(warnings) {
  warningsList.replaceChildren(...warnings.map(text => createRow({ iconName: 'warning', text, className: 'warning' })));
  warningsSection.hidden = warnings.length === 0;
}

function showStatus(message, timeout) {
  clearTimeout(statusTimer);
  statusEl.textContent = message;
  statusEl.title = message;
  if (timeout) {
    statusTimer = setTimeout(() => {
      if (statusEl.textContent === message) statusEl.textContent = '';
    }, timeout);
  }
}

function showProgress(value, label) {
  clearTimeout(progressTimer);
  progressEl.hidden = false;
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  progressBar.value = percent;
  progressPercent.textContent = `${percent}%`;
  if (label) progressLabel.textContent = label;

  if (percent >= 100) {
    progressTimer = setTimeout(() => {
      progressEl.hidden = true;
      progressBar.value = 0;
    }, 1500);
  }
}

btnCopy.addEventListener('click', () => {
  if (busy) return;
  busy = 'copy';
  render();
  post('copy-properties');
});

btnPaste.addEventListener('click', () => {
  if (busy || !hasCopy) return;
  busy = 'paste';
  warningsSection.hidden = true;
  render();
  post('paste-properties');
});

btnHideWarnings.addEventListener('click', () => {
  warningsSection.hidden = true;
  btnPaste.focus();
});

window.addEventListener('message', (event) => {
  const msg = event.data && event.data.pluginMessage;
  if (!msg || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case 'selection-update':
      renderSelection(Array.isArray(msg.selection) ? msg.selection : []);
      break;
    case 'status':
      showStatus(String(msg.message ?? ''), msg.timeout);
      break;
    case 'progress':
      showProgress(Number(msg.value) || 0, msg.label);
      break;
    case 'properties-copied':
      hasCopy = true;
      renderCopied(Array.isArray(msg.instances) ? msg.instances : []);
      render();
      break;
    case 'copy-done':
      if (busy === 'copy') busy = null;
      render();
      break;
    case 'paste-result':
      renderWarnings(Array.isArray(msg.warnings) ? msg.warnings : []);
      break;
    case 'paste-done':
      if (busy === 'paste') busy = null;
      render();
      break;
  }
});

render();
