/* PSE IDE renderer — Monaco + tabs + terminal + PSE panels. Dark, SR/EN. */
import * as monaco from 'monaco-editor';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

import { t, Lang } from '../core/i18n';
import { ThetaMonitor } from '../core/theta';
import { Agent } from '../core/agent';
import { Swarm } from '../core/swarm';
import { ProjectMemory } from '../core/memory';
import { describeCall } from '../core/tools';
import type { ToolCall } from '../core/model/types';
import type { ActionKind } from '../core/necessity';
import type { PrivacyLabel } from '../core/guardianScanner';
import type { PseApi } from '../main/preload';

declare global { interface Window { pse: PseApi; MonacoEnvironment: any; } }

// Monaco web-workers (bundled as sibling files by scripts/build-renderer.mjs)
self.MonacoEnvironment = {
  getWorkerUrl(_moduleId: string, label: string) {
    if (label === 'json') return 'json.worker.js';
    if (label === 'typescript' || label === 'javascript') return 'ts.worker.js';
    return 'editor.worker.js';
  },
};

const pse = window.pse;
let lang: Lang = 'sr';

// ---------------- editor + tabs ----------------
const editorEl = document.getElementById('editor')!;
const editor = monaco.editor.create(editorEl, {
  value: '', language: 'plaintext', theme: 'vs-dark', automaticLayout: true,
  minimap: { enabled: true }, fontSize: 13,
});
interface Tab { path: string; model: monaco.editor.ITextModel; dirty: boolean; }
const tabs: Tab[] = [];
let active = -1;

function langFromPath(p: string): string {
  if (/\.(ts|tsx)$/.test(p)) return 'typescript';
  if (/\.(js|jsx|mjs)$/.test(p)) return 'javascript';
  if (/\.json$/.test(p)) return 'json';
  if (/\.(md)$/.test(p)) return 'markdown';
  if (/\.(css)$/.test(p)) return 'css';
  if (/\.(html?)$/.test(p)) return 'html';
  if (/\.(py)$/.test(p)) return 'python';
  return 'plaintext';
}

async function openFile(path: string) {
  let idx = tabs.findIndex((t) => t.path === path);
  if (idx < 0) {
    const content = await pse.readFile(path).catch(() => '');
    const model = monaco.editor.createModel(content, langFromPath(path));
    const tab: Tab = { path, model, dirty: false };
    model.onDidChangeContent(() => { if (!tab.dirty) { tab.dirty = true; renderTabs(); } });
    tabs.push(tab);
    idx = tabs.length - 1;
  }
  active = idx;
  editor.setModel(tabs[idx].model);
  renderTabs();
}
function renderTabs() {
  const el = document.getElementById('tabs')!;
  el.innerHTML = '';
  tabs.forEach((tb, i) => {
    const d = document.createElement('div');
    d.className = 'tab' + (i === active ? ' active' : '');
    d.innerHTML = `<span>${tb.dirty ? '● ' : ''}${tb.path.split('/').pop()}</span><span class="x">✕</span>`;
    d.querySelector('span')!.addEventListener('click', () => { active = i; editor.setModel(tb.model); renderTabs(); });
    d.querySelector('.x')!.addEventListener('click', (e) => { e.stopPropagation(); tabs.splice(i, 1); active = Math.min(active, tabs.length - 1); if (active >= 0) editor.setModel(tabs[active].model); else editor.setModel(monaco.editor.createModel('', 'plaintext')); renderTabs(); });
    el.appendChild(d);
  });
}
async function saveActive() {
  if (active < 0) return;
  await pse.writeFile(tabs[active].path, tabs[active].model.getValue());
  tabs[active].dirty = false; renderTabs();
}

// ---------------- terminal ----------------
let term: Terminal | null = null; let fit: FitAddon | null = null; let ptyId = -1;
async function toggleTerminal() {
  const panel = document.getElementById('terminal-panel')!;
  const wasHidden = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (wasHidden && !term) {
    term = new Terminal({ theme: { background: '#010409', foreground: '#c9d1d9' }, fontSize: 12 });
    fit = new FitAddon(); term.loadAddon(fit);
    term.open(document.getElementById('terminal-host')!);
    fit.fit();
    ptyId = await pse.ptySpawn(currentFolder || undefined);
    term.onData((d) => pse.ptyWrite(ptyId, d));
    pse.on('pty:data', (id: number, data: string) => { if (id === ptyId) term!.write(data); });
    window.addEventListener('resize', () => { fit?.fit(); if (term && ptyId >= 0) pse.ptyResize(ptyId, term.cols, term.rows); });
  } else if (wasHidden && term) {
    fit?.fit();
  }
}
document.getElementById('terminal-close')!.addEventListener('click', () => document.getElementById('terminal-panel')!.classList.add('hidden'));

// ---------------- views / activitybar ----------------
let currentFolder = '';
function showView(name: string) {
  document.querySelectorAll('.act').forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.view === name));
  document.querySelectorAll('.side-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById('side-' + name)?.classList.remove('hidden');
  if (name === 'theta') drawTheta();
  if (name === 'memory') renderMemory();
}
document.querySelectorAll('.act[data-view]').forEach((b) => b.addEventListener('click', () => showView((b as HTMLElement).dataset.view!)));

// ---------------- explorer ----------------
async function loadFolder(dir: string) {
  currentFolder = dir;
  const items = await pse.listDir(dir).catch(() => []);
  const el = document.getElementById('side-explorer')!;
  el.innerHTML = `<h3>${dir.split('/').pop()}</h3>`;
  items.sort((a: any, b: any) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'file-row';
    row.textContent = (it.dir ? '📁 ' : '📄 ') + it.name;
    row.addEventListener('click', () => it.dir ? loadFolder(dir + '/' + it.name) : openFile(dir + '/' + it.name));
    el.appendChild(row);
  }
}

// ---------------- chat: the PSE-governed agent loop (Phase 1) ----------------
const agents: Record<string, ThetaMonitor> = {};
const swarm = new Swarm();
const gateCtx = { repoId: 'default', preAuthorized: new Set<string>(), trust: 0 };
let memory = new ProjectMemory();

function execTool(call: ToolCall): Promise<string> {
  const a: any = call.args || {};
  switch (call.name) {
    case 'read_file': return pse.readFile(a.path);
    case 'write_file': return pse.writeFile(a.path, a.content).then(() => 'written');
    case 'create_file': return pse.createFile(a.path, a.content || '');
    case 'delete_file': return pse.deleteFile(a.path);
    case 'run_command': return pse.runCommand(a.cmd, currentFolder || undefined) as Promise<string>;
    case 'search_files': return pse.searchFiles(currentFolder || '.', a.query) as Promise<string>;
    default: return Promise.resolve('unknown tool');
  }
}

function makeAgent(id: string): Agent {
  const a = new Agent(id, {
    complete: (req) => pse.modelComplete(getModelConfig(), req) as any,
    execute: (call) => execTool(call),
    gateAsk: (action, detail) => gateCard(action, detail),
    injectionAsk: (matched) => Promise.resolve(confirm(t('inj_alert', lang) + '\n\n' + matched.join('\n'))),
    gateCtx,
    hooks: {
      onText: (text, gov) => addMsg('assistant', text, gov),
      onTool: (call, tier, gated) => addMsg('assistant', `⚙ ${describeCall(call.name, call.args)} · θ:${tier}${gated ? ' · 🔒' : ''}`, true),
      onTheta: () => { if (!document.getElementById('side-theta')!.classList.contains('hidden')) drawTheta(id); },
      onTangent: (p) => addMsg('assistant', '⟳ ' + p, true),
      onAbsorptionProposal: (s) => proposeAbsorption(s),
      onPhysician: () => addMsg('assistant', '🩺 Physician: boundary reset', true),
    },
  });
  agents[id] = a.theta;
  swarm.register(a);
  return a;
}
let mainAgent = makeAgent('Endo');

function renderChat() {
  const el = document.getElementById('side-chat')!;
  el.innerHTML = `<h3>${t('panel_chat', lang)}</h3>
    <div id="chat-log"></div>
    <textarea id="chat-input" placeholder="${t('chat_placeholder', lang)}"></textarea>
    <div class="row"><button class="btn primary" id="chat-send">➤</button></div>`;
  document.getElementById('chat-send')!.addEventListener('click', runAgent);
}
function addMsg(who: 'user' | 'assistant', text: string, governed: boolean) {
  const log = document.getElementById('chat-log'); if (!log) return;
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  const badge = who === 'assistant'
    ? `<span class="badge ${governed ? 'pse' : 'third'}">${governed ? t('provenance_pse', lang) : t('provenance_third', lang)}</span>`
    : '';
  d.innerHTML = badge + escapeHtml(text);
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
async function runAgent() {
  const input = document.getElementById('chat-input') as HTMLTextAreaElement;
  const text = input.value.trim(); if (!text) return;
  input.value = '';
  addMsg('user', text, true);
  try { await mainAgent.run(text); }
  catch (e: any) { addMsg('assistant', 'Greška / Error: ' + e.message, true); }
  swarm.tick(Date.now());
  if (!document.getElementById('side-theta')!.classList.contains('hidden')) drawTheta('Endo');
}

// gate card (Axis 2) — resolves the agent's promise on the user's choice
function gateCard(action: ActionKind, detail: string): Promise<'approve' | 'reject' | 'always'> {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root')!;
    root.innerHTML = `<div class="overlay"><div class="card">
      <h2>${t('gate_title', lang)}</h2>
      <div class="kv"><b>${action}</b>${escapeHtml(detail)}</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px">
        <button class="btn" id="g-reject">${t('gate_reject', lang)}</button>
        <button class="btn" id="g-always">${t('gate_always', lang)}</button>
        <button class="btn primary" id="g-approve">${t('gate_approve', lang)}</button>
      </div></div></div>`;
    const done = (v: 'approve' | 'reject' | 'always') => { root.innerHTML = ''; resolve(v); };
    document.getElementById('g-reject')!.addEventListener('click', () => done('reject'));
    document.getElementById('g-always')!.addEventListener('click', () => done('always'));
    document.getElementById('g-approve')!.addEventListener('click', () => done('approve'));
  });
}

// absorption proposal (Phase 3) — parked until human-confirmed in the memory panel
let absorbSeq = 0;
function proposeAbsorption(summary: string) {
  memory.proposeAbsorption({ id: 'org' + (++absorbSeq), kind: 'fix', summary, evidence: 'session', createdAt: Date.now() });
  persistMemory();
  if (!document.getElementById('side-memory')!.classList.contains('hidden')) renderMemory();
}
function persistMemory() { pse.memorySave(memory.toJSON()).catch(() => {}); }

// ---------------- theta panel ----------------
function renderThetaPanel() {
  const el = document.getElementById('side-theta')!;
  el.innerHTML = `<h3>${t('panel_theta', lang)}</h3><div id="agent-chips"></div>
    <canvas id="theta-graph"></canvas><div id="theta-suggest"></div>`;
  const chips = document.getElementById('agent-chips')!;
  for (const [id, m] of Object.entries(agents)) {
    const h = m.health();
    const c = document.createElement('span');
    c.className = 'agent-chip';
    c.innerHTML = `<span class="dot ${h.ok ? 'ok' : 'bad'}"></span>${id}`;
    c.addEventListener('click', () => drawTheta(id));
    chips.appendChild(c);
  }
}
function drawTheta(id = 'Endo') {
  renderThetaPanelOnce();
  const m = agents[id] || agents['Endo']; if (!m) return;
  const canvas = document.getElementById('theta-graph') as HTMLCanvasElement;
  if (!canvas) return;
  const w = canvas.width = canvas.clientWidth; const h = canvas.height = canvas.clientHeight;
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, w, h);
  const series = m.series.length ? m.series : [{ theta: m.current } as any];
  const health = m.health();
  const color = health.ok ? '#3fb950' : '#f85149';
  // axes: x=time, y=theta[15..45]
  const y = (th: number) => h - ((th - 15) / 30) * h;
  ctx.strokeStyle = '#30363d'; ctx.beginPath(); ctx.moveTo(0, y(30)); ctx.lineTo(w, y(30)); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  series.forEach((s: any, i: number) => { const x = (i / Math.max(series.length - 1, 1)) * w; i ? ctx.lineTo(x, y(s.theta)) : ctx.moveTo(x, y(s.theta)); });
  ctx.stroke();
  const sug = document.getElementById('theta-suggest')!;
  if (health.ok) { sug.innerHTML = `<div class="suggestion">${t('theta_ok', lang)}</div>`; }
  else {
    sug.innerHTML = `<div>${t('theta_bad', lang)}</div>` +
      `<div class="suggestion">${lang === 'sr' ? 'Vrati agenta na zadatak: „fokusiraj se na traženu izmenu, bez zastranjivanja".' : 'Bring the agent back on task: "focus on the requested change, no tangents".'}</div>`;
  }
}
let thetaRendered = false;
function renderThetaPanelOnce() { if (!thetaRendered) { renderThetaPanel(); thetaRendered = true; } }

// ---------------- memory panel (Phase 3) ----------------
function renderMemory() {
  const el = document.getElementById('side-memory')!;
  const items = memory.list();
  const rows = items.map((o) => `
    <div class="agent-chip" style="display:flex;justify-content:space-between;width:100%">
      <span>${o.confirmed ? '✅' : '❔'} ${escapeHtml(o.summary)}</span>
      <span>
        ${o.confirmed ? '' : `<button class="btn" data-yes="${o.id}">${t('yes', lang)}</button>`}
        <button class="btn danger" data-del="${o.id}">${t('no', lang)}</button>
      </span>
    </div>`).join('');
  el.innerHTML = `<h3>${t('panel_memory', lang)}</h3>
    ${items.length ? '' : `<div class="joke">${t('memory_confirm', lang)}</div>`}
    ${rows}
    <div class="row" style="margin-top:8px"><button class="btn" id="mem-export">${lang === 'sr' ? 'Izvezi u repo…' : 'Export to repo…'}</button></div>`;
  el.querySelectorAll('[data-yes]').forEach((b) => b.addEventListener('click', () => { memory.confirm((b as HTMLElement).dataset.yes!, true); persistMemory(); renderMemory(); }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { memory.remove((b as HTMLElement).dataset.del!); persistMemory(); renderMemory(); }));
  document.getElementById('mem-export')!.addEventListener('click', async () => {
    const dir = await pse.openFolderDialog();
    if (dir) { await pse.memoryExport(memory.toJSON(), dir + '/.pse-memory.json'); alert(t('saved', lang)); }
  });
}

// ---------------- extensions (Open VSX + scan) ----------------
function renderExtensions() {
  const el = document.getElementById('side-extensions')!;
  el.innerHTML = `<h3>${t('menu_extensions', lang)}</h3>
    <input id="vsx-q" class="btn" style="width:100%" placeholder="${t('ext_placeholder', lang)}"/>
    <div class="row"><button class="btn" id="vsx-search">🔍</button></div>
    <div class="joke">${t('ext_note', lang)}</div>
    <div id="vsx-results"></div>`;
  document.getElementById('vsx-search')!.addEventListener('click', async () => {
    const q = (document.getElementById('vsx-q') as HTMLInputElement).value;
    const res: any = await pse.vsxSearch(q).catch(() => ({ extensions: [] }));
    const box = document.getElementById('vsx-results')!; box.innerHTML = '';
    for (const x of res.extensions || []) {
      const row = document.createElement('div'); row.className = 'file-row';
      row.textContent = `🧩 ${x.namespace}.${x.name}`;
      row.addEventListener('click', () => installFlow(x.namespace, x.name));
      box.appendChild(row);
    }
  });
}
async function installFlow(ns: string, name: string) {
  const { label } = await pse.vsxDownloadScan(ns, name) as any;
  showScanModal(label);
}

// ---------------- scan modal ----------------
function showScanModal(label: PrivacyLabel) {
  const root = document.getElementById('modal-root')!;
  root.innerHTML = `<div class="overlay"><div class="card">
    <h2>${escapeHtml(label.displayName)} · <span class="level ${label.level}">${label.level}</span></h2>
    <div class="kv"><b>${t('scan_receives', lang)}</b>${(label.disclosure.length ? label.disclosure : ['—']).map((d) => `<span class="pill">${escapeHtml(d)}</span>`).join('')}</div>
    <div class="kv"><b>${t('scan_cansee', lang)}</b>${(label.canSee.length ? label.canSee : ['—']).map((d) => `<span class="pill">${escapeHtml(d)}</span>`).join('')}</div>
    <div class="kv"><b>${t('scan_cando', lang)}</b>${(label.canDo.concat(label.redFlags).length ? label.canDo.concat(label.redFlags) : ['—']).map((d) => `<span class="pill">${escapeHtml(d)}</span>`).join('')}</div>
    <div class="kv"><b>${t('why', lang)}</b>${escapeHtml(label.reasons.join('; '))} · ${label.confidence}</div>
    ${label.level === 'CRITICAL' ? `<div class="joke">${t('scan_joke', lang)}</div>` : ''}
    <div class="row" style="justify-content:flex-end;margin-top:12px">
      <button class="btn" id="scan-cancel">${t('scan_cancel', lang)}</button>
      <button class="btn danger" id="scan-install">${t('scan_install', lang)}</button>
    </div>
  </div></div>`;
  document.getElementById('scan-cancel')!.addEventListener('click', () => root.innerHTML = '');
  document.getElementById('scan-install')!.addEventListener('click', () => { root.innerHTML = ''; /* Path-2 install proceeds; runtime host = Phase 1 */ });
}

// ---------------- settings ----------------
function renderSettings() {
  const el = document.getElementById('side-settings')!;
  el.innerHTML = `<h3>${t('menu_settings', lang)}</h3>
    <div class="kv"><b>${t('set_profile', lang)}</b><input id="set-profile" class="btn" style="width:100%" value="${loadCfg().profile || 'personal'}"/></div>
    <div class="kv"><b>Anthropic ${t('set_key', lang)}</b><input id="set-anthropic" class="btn" style="width:100%" type="password"/></div>
    <div class="kv"><b>Mistral ${t('set_key', lang)}</b><input id="set-mistral" class="btn" style="width:100%" type="password"/></div>
    <div class="kv"><b>Groq ${t('set_key', lang)}</b><input id="set-groq" class="btn" style="width:100%" type="password"/></div>
    <div class="kv"><b>GGUF endpoint (llama-server)</b><input id="set-gguf" class="btn" style="width:100%" value="${loadCfg().ggufEndpoint || 'http://127.0.0.1:8080/v1'}"/></div>
    <div class="kv"><b>Lokalni .gguf</b>
      <div class="row"><input id="set-ggufpath" class="btn" style="flex:1" value="${loadCfg().ggufPath || ''}" placeholder="/put/do/model.gguf"/>
      <button class="btn" id="gguf-pick">📂</button></div>
      <div class="row"><button class="btn" id="llama-start">▶ llama-server</button><button class="btn danger" id="llama-stop">■</button><span id="llama-status"></span></div></div>
    <div class="kv"><b>${t('set_provider', lang)}</b>
      <select id="set-override" class="btn" style="width:100%">
        <option value="">${t('set_auto', lang)}</option>
        <option value="anthropic">anthropic</option><option value="mistral">mistral</option>
        <option value="groq">groq</option><option value="llamacpp">llamacpp</option>
      </select></div>
    <div class="kv"><b>Model</b><input id="set-model" class="btn" style="width:100%" value="${loadCfg().model || ''}" placeholder="npr. claude-opus-4-8"/></div>
    <div class="row"><button class="btn primary" id="set-save">💾 ${t('set_save', lang)}</button></div>`;
  document.getElementById('set-save')!.addEventListener('click', async () => {
    const profile = (document.getElementById('set-profile') as HTMLInputElement).value || 'personal';
    for (const prov of ['anthropic', 'mistral', 'groq'] as const) {
      const v = (document.getElementById('set-' + prov) as HTMLInputElement).value;
      if (v) await pse.keychainSet('pse-ide', `${profile}:${prov}`, v);
    }
    const cfg = { profile, override: (document.getElementById('set-override') as HTMLSelectElement).value || null,
      preferredOnline: 'anthropic', ggufEndpoint: (document.getElementById('set-gguf') as HTMLInputElement).value,
      ggufPath: (document.getElementById('set-ggufpath') as HTMLInputElement).value,
      model: (document.getElementById('set-model') as HTMLInputElement).value || undefined };
    localStorage.setItem('pse-cfg', JSON.stringify(cfg));
    alert(t('saved', lang));
  });
  document.getElementById('gguf-pick')!.addEventListener('click', async () => {
    const p = await pse.openGgufDialog();
    if (p) (document.getElementById('set-ggufpath') as HTMLInputElement).value = p;
  });
  document.getElementById('llama-start')!.addEventListener('click', async () => {
    const p = (document.getElementById('set-ggufpath') as HTMLInputElement).value;
    const r: any = await pse.llamaStart(p); document.getElementById('llama-status')!.textContent = r.msg;
  });
  document.getElementById('llama-stop')!.addEventListener('click', async () => {
    await pse.llamaStop(); document.getElementById('llama-status')!.textContent = 'stopped';
  });
}
function loadCfg(): any { try { return JSON.parse(localStorage.getItem('pse-cfg') || '{}'); } catch { return {}; } }
function getModelConfig() {
  const c = loadCfg();
  return { profile: c.profile || 'personal', override: c.override || null,
    preferredOnline: c.preferredOnline || 'anthropic', ggufEndpoint: c.ggufEndpoint, model: c.model };
}

// ---------------- i18n / lang ----------------
const ACT_TITLE: Record<string, string> = {
  explorer: 'act_explorer', chat: 'act_chat', theta: 'act_theta',
  extensions: 'act_extensions', memory: 'act_memory', settings: 'act_settings',
};
function renderExplorerHome() {
  const el = document.getElementById('side-explorer')!;
  el.innerHTML = `<h3>PSE IDE</h3><div class="file-row" id="open-folder">📂 ${t('explorer_open', lang)}</div>`;
  document.getElementById('open-folder')!.addEventListener('click', async () => {
    const dir = await pse.openFolderDialog();
    if (dir) loadFolder(dir);
  });
}
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t((e as HTMLElement).dataset.i18n!, lang); });
  // activity-bar titles
  document.querySelectorAll('.act[data-view]').forEach((b) => {
    const v = (b as HTMLElement).dataset.view!;
    if (ACT_TITLE[v]) (b as HTMLElement).title = t(ACT_TITLE[v], lang);
  });
  document.getElementById('langBtn')!.textContent = lang.toUpperCase();
  document.getElementById('langBtn')!.title = t('act_lang', lang);
  renderChat(); renderExtensions(); renderSettings(); renderMemory(); thetaRendered = false; renderThetaPanel(); thetaRendered = true;
  if (currentFolder) loadFolder(currentFolder); else renderExplorerHome();
}
document.getElementById('langBtn')!.addEventListener('click', () => { lang = lang === 'sr' ? 'en' : 'sr'; applyLang(); });

// ---------------- menu wiring ----------------
pse.on('menu:save', () => saveActive());
pse.on('menu:toggleTerminal', () => toggleTerminal());
pse.on('menu:toggleChat', () => showView('chat'));
pse.on('menu:toggleTheta', () => showView('theta'));
pse.on('menu:openFolder', (dir: string) => { loadFolder(dir); showView('explorer'); });
pse.on('menu:extensions', () => showView('extensions'));
pse.on('menu:lang', (l: Lang) => { lang = l; applyLang(); });
pse.on('scan:result', (label: PrivacyLabel) => showScanModal(label));

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }

// init
pse.memoryLoad().then((json: string) => { try { memory = ProjectMemory.fromJSON(json); renderMemory(); } catch { /* fresh */ } });
applyLang();
showView('explorer');
