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

async function commitUpdate(filePath, updates, msgField) {
  setStatus('saving…');
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
  } catch (e) {
    setStatus('save failed');
    toast(`Save failed: ${e.message ?? e}`, 'error', 7000);
    throw e;
  }
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
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = el.dataset.original ?? ''; el.blur(); }
    });
    el.addEventListener('blur', async () => {
      const orig = el.dataset.original ?? '';
      const next = (el.textContent ?? '').trim();
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
      try {
        const ext = (f.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
        const base = f.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
        const fname = `${Date.now()}-${base}.${ext}`;
        const uploadPath = `public/images/uploads/${fname}`;
        const publicSrc = `/images/uploads/${fname}`;

        const buf = await f.arrayBuffer();
        await uploadBinary(uploadPath, buf, `admin: upload ${fname}`);
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
      } catch {
        // toast already fired in commitUpdate / uploadBinary
      } finally {
        btn.disabled = false;
        btn.textContent = 'Replace image';
        input.value = '';
      }
    });
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
  wireTextFields();
  wireMarkdownFields();
  wireImageFields();
}

boot();
