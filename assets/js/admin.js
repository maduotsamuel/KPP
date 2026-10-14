import { sb, configured, message } from './app.js';

const login = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
let currentUser = null;
let isAdmin = false;

const withTimeout = (promise, ms = 45000) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('The request timed out. Check your internet connection and Supabase Storage settings before retrying.')), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
};

function toggle() {
  login.hidden = isAdmin;
  dashboard.hidden = !isAdmin;
}

function formStatus(form, text, success = false) {
  let status = form.querySelector('.publish-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'publish-status alert mt-3';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.append(status);
  }
  status.className = `publish-status alert mt-3 ${success ? 'alert-success' : 'alert-info'}`;
  status.textContent = text;
}

async function check() {
  if (!configured || !sb) {
    message('login-status', 'Add your Supabase URL and publishable key to assets/js/config.js.');
    return;
  }
  try {
    const { data, error } = await withTimeout(sb.auth.getUser());
    if (error) throw error;
    currentUser = data.user;
    if (currentUser) {
      const result = await withTimeout(sb.from('admins').select('user_id').eq('user_id', currentUser.id).maybeSingle());
      if (result.error) throw result.error;
      isAdmin = !!result.data;
    } else {
      isAdmin = false;
    }
    toggle();
    if (isAdmin) await loadAll();
    else if (currentUser) message('login-status', 'This account has not been granted admin access.');
  } catch (error) {
    isAdmin = false;
    toggle();
    message('login-status', `Unable to verify admin access: ${error.message}`);
  }
}

const formatDate = x => x ? new Date(x).toLocaleDateString() : '';
async function listRows(table) {
  const { data, error } = await withTimeout(sb.from(table).select('*').order('created_at', { ascending: false }).limit(200));
  if (error) throw error;
  return data || [];
}

async function loadAll() {
  try {
    for (const table of ['portfolio', 'artists']) {
      const rows = await listRows(table);
      const target = document.getElementById(`${table}-rows`);
      target.replaceChildren();
      rows.forEach(item => {
        const tr = document.createElement('tr');
        for (const value of [item.title || item.name, item.category || item.genre]) {
          const td = document.createElement('td');
          td.textContent = value || '';
          tr.append(td);
        }
        const actions = document.createElement('td');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Delete';
        button.className = 'btn btn-sm btn-outline-danger';
        button.addEventListener('click', () => removeRecord(table, item));
        actions.append(button);
        tr.append(actions);
        target.append(tr);
      });
    }
    const enquiries = await listRows('enquiries');
    const target = document.getElementById('enquiry-rows');
    target.replaceChildren();
    for (const item of enquiries) {
      const tr = document.createElement('tr');
      for (const value of [formatDate(item.created_at), item.name, item.email, item.phone || '', item.service || '', item.message, item.status]) {
        const td = document.createElement('td');
        td.textContent = value || '';
        tr.append(td);
      }
      const td = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'form-select form-select-sm';
      for (const status of ['new', 'contacted', 'closed']) select.add(new Option(status, status));
      select.value = item.status;
      select.addEventListener('change', async () => {
        select.disabled = true;
        try {
          const { error } = await withTimeout(sb.from('enquiries').update({ status: select.value }).eq('id', item.id));
          if (error) throw error;
          message('admin-status', 'Enquiry status updated.', true);
        } catch (error) {
          message('admin-status', `Unable to update enquiry: ${error.message}`);
          select.value = item.status;
        } finally { select.disabled = false; }
      });
      td.append(select);
      tr.append(td);
      target.append(tr);
    }
  } catch (error) {
    message('admin-status', `Unable to load dashboard: ${error.message}`);
  }
}

async function removeRecord(table, item) {
  if (!confirm('Delete this item?')) return;
  try {
    const { error } = await withTimeout(sb.from(table).delete().eq('id', item.id));
    if (error) throw error;
    if (item.storage_path) {
      const { error: storageError } = await withTimeout(sb.storage.from('media').remove([item.storage_path]));
      if (storageError) message('admin-status', `Item deleted, but image cleanup failed: ${storageError.message}`);
    }
    await loadAll();
  } catch (error) { message('admin-status', `Delete failed: ${error.message}`); }
}

for (const table of ['portfolio', 'artists']) {
  document.getElementById(`${table}-form`)?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"], button:not([type])');
    const previousText = button.textContent;
    button.disabled = true;
    let uploadedPath = null;
    try {
      if (!isAdmin) throw new Error('Your admin session has expired. Sign in again.');
      const fields = Object.fromEntries(new FormData(form).entries());
      const file = fields.image_file;
      if (!(file instanceof File) || !file.size) throw new Error('Choose an image.');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error('Choose a JPEG, PNG or WebP image no larger than 5 MB.');
      }
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `${table}/${crypto.randomUUID()}.${ext}`;
      button.textContent = 'Uploading image…';
      formStatus(form, 'Uploading image to Supabase Storage…');
      const { data: upload, error: uploadError } = await withTimeout(
        sb.storage.from('media').upload(path, file, { contentType: file.type, upsert: false }), 60000
      );
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      uploadedPath = upload?.path || path;
      const publicUrl = sb.storage.from('media').getPublicUrl(uploadedPath).data.publicUrl;
      button.textContent = 'Saving record…';
      formStatus(form, 'Image uploaded. Saving information to PostgreSQL…');
      const record = table === 'portfolio'
        ? { title: fields.title.trim(), category: fields.category.trim(), description: fields.description?.trim() || null, image: publicUrl, storage_path: uploadedPath }
        : { name: fields.name.trim(), genre: fields.genre.trim(), description: fields.description?.trim() || null, image: publicUrl, storage_path: uploadedPath };
      const { error: saveError } = await withTimeout(sb.from(table).insert(record));
      if (saveError) throw new Error(`Database save failed: ${saveError.message}`);
      uploadedPath = null;
      form.reset();
      formStatus(form, 'Published successfully. Your item is now available on the website.', true);
      await loadAll();
    } catch (error) {
      formStatus(form, `Publishing failed: ${error.message}`);
      if (uploadedPath) {
        try { await withTimeout(sb.storage.from('media').remove([uploadedPath]), 15000); } catch (_) { /* Log cleanup separately if required */ }
      }
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  });
}

document.getElementById('login-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!sb) return;
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const data = new FormData(form);
  button.disabled = true;
  try {
    const { error } = await withTimeout(sb.auth.signInWithPassword({ email: data.get('email'), password: data.get('password') }));
    if (error) throw error;
    await check();
  } catch (error) {
    message('login-status', `Sign in failed: ${error.message}`);
  } finally { button.disabled = false; }
});

document.getElementById('logout')?.addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  isAdmin = false;
  toggle();
});

document.getElementById('password-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = new FormData(form).get('password');
  if (password.length < 12) return message('admin-status', 'Use at least 12 characters.');
  try {
    const { error } = await withTimeout(sb.auth.updateUser({ password }));
    if (error) throw error;
    message('admin-status', 'Password changed.', true);
    form.reset();
  } catch (error) { message('admin-status', `Password change failed: ${error.message}`); }
});

check();
