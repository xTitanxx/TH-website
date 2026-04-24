// In-place admin for the Casa & Studio Indigo site.
// Loaded via <script type="module" src="/admin/admin.js"> from the admin pages.
// Talks directly to the GitHub Contents API with a user-supplied fine-grained PAT
// stored in localStorage. No server, no proxy.

import yaml from 'https://esm.sh/js-yaml@4.1.0';
import { marked } from 'https://esm.sh/marked@12.0.2';

const cfg = window.__ADMIN__;
if (!cfg) throw new Error('window.__ADMIN__ missing — admin page did not inject repo config');

const LS_PAT = 'th-admin-pat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toast(msg, tone = 'info', ms = 4000) {
  const root = document.getElementById('admin-toast-root');
  if (!root) return;
  const el = document.createElement('div');
  const base = 'px-4 py-2 rounded shadow-lg text-sm text-white max-w-sm';
  const colour = tone === 'ok' ? 'background:#047857' : tone === 'error' ? 'background:#b91c1c' : 'background:#1e293b';
  el.style.cssText = `${colour};padding:8px 16px;border-radius:4px;color:white;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);max-width:360px`;
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function setStatus(txt) {
  const el = document.getElementById('admin-status');
  if (el) el.textContent = txt;
}

function setAtPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cur[k] == null) cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// GitHub API
// ---------------------------------------------------------------------------

function getPAT() { return localStorage.getItem(LS_PAT); }
function setPAT(v) { localStorage.setItem(LS_PAT, v); }
function clearPAT() { localStorage.removeItem(LS_PAT); }

async function gh(path, init = {}) {
  const pat = getPAT();
  if (!pat) throw new Error('not signed in');
  const res = await fetch(`https://api.github.com${path}`, {
    // Bypass the browser's HTTP cache. The Contents API responds with
    // Cache-Control: private, max-age=60, which made rapid-fire saves
    // read a stale sha on every retry and 409 forever.
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  return res;
}

async function validatePAT(pat) {
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function bytesToB64(uint8) {
  let bin = '';
  uint8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

async function getFile(path) {
  const r = await gh(
    `/repos/${cfg.owner}/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(cfg.branch)}`,
  );
  const j = await r.json();
  return { sha: j.sha, content: b64ToUtf8(j.content) };
}

async function getFileOrNull(path) {
  try { return await getFile(path); }
  catch (e) { if (String(e).includes('404')) return null; throw e; }
}

async function putFile(path, content, sha, msg) {
  const body = { message: msg, content: utf8ToB64(content), branch: cfg.branch };
  if (sha) body.sha = sha;
  const r = await gh(
    `/repos/${cfg.owner}/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  return r.json();
}

async function uploadBinary(path, arrayBuffer, msg) {
  const existing = await getFileOrNull(path);
  const body = { message: msg, content: bytesToB64(new Uint8Array(arrayBuffer)), branch: cfg.branch };
  if (existing) body.sha = existing.sha;
  const r = await gh(
    `/repos/${cfg.owner}/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  return r.json();
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: yaml.load(m[1]) ?? {}, body: m[2] };
}

function stringifyFrontmatter(data, body) {
  const fm = yaml.dump(data, { lineWidth: 120, quotingType: '"', forceQuotes: false });
  return `---\n${fm}---\n\n${body.replace(/^\n+/, '')}`;
}

// ---------------------------------------------------------------------------
// Commit pipeline
// ---------------------------------------------------------------------------

// Per-file queue: all commitUpdate calls to the same filePath run serially.
// Different files still run in parallel. This prevents the client-side race
// where two parallel handlers both getFile → both putFile against the same
// pre-state sha and GitHub 409s the loser.
const fileLocks = new Map();

function commitUpdate(filePath, updates, msgField) {
  const prev = fileLocks.get(filePath) ?? Promise.resolve();
  // If the previous update rejected, don't let that poison the queue — run
  // our attempt either way.
  const next = prev.then(
    () => commitUpdateImpl(filePath, updates, msgField),
    () => commitUpdateImpl(filePath, updates, msgField),
  );
  fileLocks.set(filePath, next.catch(() => {}));
  return next;
}

// Re-reads the file on every attempt so we always put against the latest sha.
// Retries on 409 with exponential backoff — the window needs to outlast
// GitHub's Contents API replica lag (typically 5–15 s) because reads after
// a successful write can briefly see stale state.
async function commitUpdateImpl(filePath, updates, msgField) {
  setStatus('saving…');
  const maxAttempts = 6;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { sha, content } = await getFile(filePath);
      const { data, body } = parseFrontmatter(content);
      let newBody = body;
      for (const u of updates) {
        if (u.kind === 'data') setAtPath(data, u.path, u.value);
        else newBody = u.value;
      }
      const out = stringifyFrontmatter(data, newBody);
      await putFile(filePath, out, sha, `admin: update ${msgField} in ${filePath.split('/').pop()}`);
      setStatus('saved ✓');
      toast('Saved — live in ~1 minute', 'ok');
      return;
    } catch (e) {
      lastErr = e;
      const msg = String(e.message ?? e);
      if (msg.includes('409') && attempt < maxAttempts) {
        setStatus(`retrying (conflict, attempt ${attempt + 1})…`);
        const backoff = 600 * Math.pow(2, attempt - 1) + Math.random() * 400;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }
  setStatus('save failed');
  toast(`Save failed: ${lastErr?.message ?? lastErr}`, 'error', 7000);
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Auth UI
// ---------------------------------------------------------------------------

async function promptForPAT() {
  const msg =
    `Paste a GitHub fine-grained Personal Access Token.\n\n` +
    `Scopes needed: Contents — Read and write on ${cfg.owner}/${cfg.repo}.\n\n` +
    `Create one at:\nhttps://github.com/settings/personal-access-tokens/new`;
  const pat = prompt(msg);
  if (!pat) return;
  const who = await validatePAT(pat.trim());
  if (!who) { toast('Token rejected by GitHub.', 'error'); return; }
  setPAT(pat.trim());
  toast(`Signed in as ${who.login}`, 'ok');
  location.reload();
}

function wireAuthButtons(signedIn, login) {
  const signin = document.getElementById('admin-signin');
  const signout = document.getElementById('admin-signout');
  if (!signin || !signout) return;
  if (signedIn) {
    signin.classList.add('hidden');
    signout.classList.remove('hidden');
    setStatus(`signed in${login ? ` as ${login}` : ''}`);
  } else {
    signin.classList.remove('hidden');
    signout.classList.add('hidden');
    setStatus('read-only — click Unlock editing');
  }
  signin.onclick = () => promptForPAT();
  signout.onclick = () => { clearPAT(); toast('Signed out', 'info'); location.reload(); };
}

// ---------------------------------------------------------------------------
// Styling for edit affordances
// ---------------------------------------------------------------------------

function injectStyles() {
  const css = `
    [data-editable="text"] { position: relative; cursor: text; transition: outline .12s; }
    [data-editable="text"]:hover { outline: 1px dashed rgba(35,44,84,.35); outline-offset: 4px; border-radius: 2px; }
    [data-editable="text"]:focus { outline: 2px solid #3a4475; outline-offset: 4px; background: rgba(255,255,255,.6); }
    [data-editable="text"]::after { content: "✎"; position: absolute; top: 0; right: -1.3em; font-size: .6em; opacity: 0; color: #3a4475; transition: opacity .15s; pointer-events: none; }
    [data-editable="text"]:hover::after { opacity: 1; }

    [data-editable="markdown"] { position: relative; }
    [data-editable="markdown"]:hover > .rendered-body { outline: 1px dashed rgba(35,44,84,.35); outline-offset: 4px; border-radius: 2px; }
    .md-edit-btn { position: absolute; top: 8px; right: 8px; z-index: 2; background: #232c54; color: white; border: 0; border-radius: 999px; width: 32px; height: 32px; opacity: 0; transition: opacity .15s; cursor: pointer; font-size: 14px; }
    [data-editable="markdown"]:hover .md-edit-btn { opacity: 1; }
    .md-textarea { width: 100%; min-height: 200px; font-family: ui-monospace,Menlo,monospace; font-size: 13px; line-height: 1.6; padding: 12px; border: 1px solid rgba(35,44,84,.4); border-radius: 4px; background: white; box-sizing: border-box; }
    .md-actions { display: flex; gap: 8px; margin-top: 8px; }
    .md-actions button { padding: 6px 14px; border-radius: 4px; font-size: 13px; cursor: pointer; border: 0; }
    .md-save { background: #232c54; color: white; }
    .md-save:disabled { opacity: .5; cursor: wait; }
    .md-cancel { background: transparent; color: #5a4f3b; }

    [data-editable="image"] { position: relative; overflow: hidden; }
    [data-editable="image"]:hover::before { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.28); z-index: 1; pointer-events: none; }
    .img-replace-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 2; background: white; color: #141a38; border: 0; border-radius: 4px; padding: 8px 16px; font-size: 13px; cursor: pointer; opacity: 0; transition: opacity .15s; font-weight: 500; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    [data-editable="image"]:hover .img-replace-btn { opacity: 1; }

    body.admin-read-only [data-editable] { cursor: default; }
    body.admin-read-only [data-editable="text"]::after { display: none; }
    body.admin-read-only [data-editable="text"]:hover { outline: none; }
    body.admin-read-only [data-editable="markdown"]:hover > .rendered-body { outline: none; }
    body.admin-read-only .md-edit-btn,
    body.admin-read-only .img-replace-btn,
    body.admin-read-only [data-editable="image"]:hover::before { display: none; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Edit wiring
// ---------------------------------------------------------------------------

function wireTextFields() {
  document.querySelectorAll('[data-editable="text"]').forEach((el) => {
    el.setAttribute('contenteditable', 'plaintext-only');
    el.spellcheck = false;
    // Preserve line breaks the user types (Enter inserts a real newline).
    el.style.whiteSpace = 'pre-line';
    el.addEventListener('keydown', (e) => {
      // Escape cancels; Cmd/Ctrl+Enter saves early. Plain Enter inserts a line break.
      if (e.key === 'Escape') { el.textContent = el.dataset.original ?? ''; el.blur(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('blur', async () => {
      const orig = el.dataset.original ?? '';
      // Trim leading/trailing whitespace but preserve interior newlines.
      const next = (el.textContent ?? '').replace(/^\s+|\s+$/g, '');
      if (next === orig) return;
      try {
        await commitUpdate(el.dataset.file, [{ kind: 'data', path: el.dataset.field, value: next }], el.dataset.field);
        el.dataset.original = next;
      } catch { el.textContent = orig; }
    });
  });
}

function wireMarkdownFields() {
  document.querySelectorAll('[data-editable="markdown"]').forEach((wrapper) => {
    const pre = wrapper.querySelector('.raw-markdown-source');
    const body = wrapper.querySelector('.rendered-body');
    if (!pre || !body) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-edit-btn';
    btn.textContent = '✎';
    btn.setAttribute('aria-label', 'Edit body');
    wrapper.appendChild(btn);

    let editing = false;
    btn.addEventListener('click', () => {
      if (editing) return;
      editing = true;
      const current = pre.textContent ?? '';
      const textarea = document.createElement('textarea');
      textarea.className = 'md-textarea';
      textarea.value = current;
      const actions = document.createElement('div');
      actions.className = 'md-actions';
      const save = document.createElement('button');
      save.className = 'md-save';
      save.textContent = 'Save';
      const cancel = document.createElement('button');
      cancel.className = 'md-cancel';
      cancel.textContent = 'Cancel';
      actions.append(save, cancel);
      body.style.display = 'none';
      btn.style.display = 'none';
      wrapper.insertBefore(textarea, body);
      wrapper.insertBefore(actions, body);
      textarea.focus();

      const teardown = () => {
        textarea.remove();
        actions.remove();
        body.style.display = '';
        btn.style.display = '';
        editing = false;
      };

      cancel.addEventListener('click', teardown);
      save.addEventListener('click', async () => {
        const next = textarea.value;
        if (next === current) { teardown(); return; }
        save.disabled = true;
        save.textContent = 'Saving…';
        try {
          await commitUpdate(wrapper.dataset.file, [{ kind: 'body', value: next }], 'body');
          pre.textContent = next;
          body.innerHTML = await marked.parse(next);
          teardown();
        } catch {
          save.disabled = false;
          save.textContent = 'Save';
        }
      });
    });
  });
}

// Resize + re-encode in the browser before upload so GitHub Pages isn't
// serving 17 MB iPhone originals. Falls back to the raw file on any failure
// (e.g. HEIC that the browser can't decode) so the upload still happens.
async function compressImage(file, { maxEdge = 2400, quality = 0.82 } = {}) {
  // Small files and non-rasters aren't worth touching.
  if (file.size < 300 * 1024) return { blob: file, ext: extFromType(file) };
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { blob: file, ext: extFromType(file) };

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: 'image/jpeg', quality })
      : await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));

    if (!blob || blob.size >= file.size) return { blob: file, ext: extFromType(file) };
    return { blob, ext: 'jpg' };
  } catch (e) {
    console.warn('[admin] compression failed, uploading original:', e);
    return { blob: file, ext: extFromType(file) };
  }
}

function extFromType(file) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
  if (map[file.type]) return map[file.type];
  return (file.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
}

function wireImageFields() {
  document.querySelectorAll('[data-editable="image"]').forEach((wrapper) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'img-replace-btn';
    btn.textContent = 'Replace image';
    wrapper.appendChild(btn);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    wrapper.appendChild(input);

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      btn.textContent = 'Uploading…';
      btn.disabled = true;
      let uploadDone = false;
      try {
        setStatus(`compressing ${(f.size / 1024 / 1024).toFixed(1)} MB…`);
        const { blob, ext } = await compressImage(f);
        const base = f.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
        const fname = `${Date.now()}-${base}.${ext}`;
        const uploadPath = `public/images/uploads/${fname}`;
        const publicSrc = `/images/uploads/${fname}`;

        const buf = await blob.arrayBuffer();
        setStatus(`uploading ${(blob.size / 1024 / 1024).toFixed(2)} MB…`);
        await uploadBinary(uploadPath, buf, `admin: upload ${fname}`);
        uploadDone = true;
        await commitUpdate(
          wrapper.dataset.file,
          [{ kind: 'data', path: wrapper.dataset.field, value: publicSrc }],
          wrapper.dataset.field,
        );

        const existing = wrapper.querySelector('img');
        if (existing) {
          existing.src = publicSrc;
        } else {
          const placeholder = wrapper.querySelector('[role="img"]');
          if (placeholder) placeholder.remove();
          const img = document.createElement('img');
          img.src = publicSrc;
          img.alt = '';
          img.loading = 'lazy';
          img.className = 'block w-full h-full object-cover';
          img.style.aspectRatio = '4/3';
          wrapper.prepend(img);
        }
      } catch (e) {
        console.error('[admin] image upload failed:', e);
        setStatus('upload failed');
        if (!uploadDone) {
          toast(`Upload failed: ${(e && e.message) || e}`, 'error', 8000);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Replace image';
        input.value = '';
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Title-size slider (global design setting)
// ---------------------------------------------------------------------------

function wireTitleScale() {
  const group = document.getElementById('admin-title-scale-group');
  const slider = document.getElementById('admin-title-scale');
  const valueEl = document.getElementById('admin-title-scale-value');
  const saveBtn = document.getElementById('admin-title-scale-save');
  if (!group || !slider || !saveBtn) return;

  group.classList.remove('hidden');
  group.classList.add('flex');

  const doc = document.documentElement;
  const computed = parseFloat(getComputedStyle(doc).getPropertyValue('--title-scale')) || 1;
  const saved = Math.min(1.2, Math.max(0.7, computed));
  slider.value = String(saved);
  slider.dataset.saved = String(saved);
  valueEl.textContent = saved.toFixed(2);

  const refreshSaveState = () => {
    const cur = parseFloat(slider.value);
    const savedVal = parseFloat(slider.dataset.saved);
    saveBtn.disabled = Math.abs(cur - savedVal) < 0.001;
  };
  refreshSaveState();

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    doc.style.setProperty('--title-scale', String(v));
    valueEl.textContent = v.toFixed(2);
    refreshSaveState();
  });

  saveBtn.addEventListener('click', async () => {
    const v = parseFloat(slider.value);
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await commitUpdate(
        'src/content/settings/design.md',
        [{ kind: 'data', path: 'titleScale', value: v }],
        'titleScale',
      );
      slider.dataset.saved = String(v);
    } catch {
      // commitUpdate already toasted
    } finally {
      saveBtn.textContent = 'Save size';
      refreshSaveState();
    }
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  injectStyles();

  const pat = getPAT();
  if (!pat) {
    document.body.classList.add('admin-read-only');
    wireAuthButtons(false);
    return;
  }

  const who = await validatePAT(pat);
  if (!who) {
    clearPAT();
    document.body.classList.add('admin-read-only');
    wireAuthButtons(false);
    toast('Stored token rejected by GitHub. Please sign in again.', 'error');
    return;
  }

  wireAuthButtons(true, who.login);
  wireTitleScale();
  wireTextFields();
  wireMarkdownFields();
  wireImageFields();
}

boot();
