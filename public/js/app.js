// Sub-groups — edit this list to match your actual Queen's sub-groups
const SUBGROUPS = ['Pendo', 'Roses of Sharon', 'Favour', 'Victorious', 'Angels', 'Abigael', 'Daughters Of Destiny'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

async function updateSyncBadge() {
  const unsynced = await getUnsyncedCheckins();
  const badge = document.getElementById('sync-badge');
  const btn = document.getElementById('sync-btn');
  if (unsynced.length > 0) {
    badge.textContent = unsynced.length;
    badge.style.display = 'inline-flex';
    btn.disabled = false;
  } else {
    badge.style.display = 'none';
    btn.disabled = navigator.onLine ? false : true;
  }
  document.getElementById('online-dot').className = 'dot ' + (navigator.onLine ? 'dot--online' : 'dot--offline');
  document.getElementById('online-label').textContent = navigator.onLine ? 'Online' : 'Offline';
}

// --- TAB SWITCHING ---
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  if (tab === 'records') renderRecordsPanel();
}

// --- CHECKIN FORM ---
function buildForm() {
  const sel = document.getElementById('f-subgroup');
  SUBGROUPS.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    sel.appendChild(opt);
  });
}

async function handleCheckin(e) {
  e.preventDefault();
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const subgroup = document.getElementById('f-subgroup').value;

  if (!name || !phone || !subgroup) {
    showToast('Please fill in all fields', 'warn');
    return;
  }

  const record = {
    id: generateId(),
    name,
    phone,
    subgroup,
    checked_in_at: new Date().toISOString(),
    synced: 0
  };

  await saveCheckin(record);
  e.target.reset();
  document.getElementById('f-subgroup').value = '';
  showToast(`${name} checked in ✓`, 'success');
  updateSyncBadge();

  // Try to sync immediately if online
  if (navigator.onLine) {
    const result = await syncToServer();
    if (result.status === 'ok') updateSyncBadge();
  }
}

// --- RECORDS PANEL ---
async function renderRecordsPanel() {
  const container = document.getElementById('records-container');
  container.innerHTML = '<p class="loading">Loading…</p>';

  let records = [];
  let source = 'local';

  if (navigator.onLine) {
    try {
      // Sync first, then load from server for full picture
      await syncToServer();
      records = await fetchServerRecords();
      source = 'server';
    } catch {
      records = await getAllCheckins();
    }
  } else {
    records = await getAllCheckins();
    records.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
  }

  updateSyncBadge();

  // Stats
  document.getElementById('s-total').textContent = records.length;
  const groups = new Set(records.map(r => r.subgroup)).size;
  document.getElementById('s-groups').textContent = groups;
  const unsynced = (await getUnsyncedCheckins()).length;
  document.getElementById('s-unsynced').textContent = unsynced;
  document.getElementById('records-source').textContent = source === 'server' ? '(from server)' : '(local only — offline)';

  if (!records.length) {
    container.innerHTML = '<p class="empty">No check-ins yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="rtable">
      <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Sub-group</th><th>Time</th><th>Sync</th></tr></thead>
      <tbody>
        ${records.map((r, i) => {
          const t = new Date(r.checked_in_at);
          const time = t.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
          const date = t.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
          const synced = (source === 'server') || r.synced === 1;
          return `<tr>
            <td class="muted">${i + 1}</td>
            <td class="bold">${r.name}</td>
            <td>${r.phone}</td>
            <td><span class="pill">${r.subgroup}</span></td>
            <td class="muted">${date} ${time}</td>
            <td><span class="sync-dot ${synced ? 'synced' : 'pending'}" title="${synced ? 'Synced' : 'Pending sync'}"></span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// --- MANUAL SYNC BUTTON ---
document.getElementById('sync-btn').addEventListener('click', async () => {
  if (!navigator.onLine) { showToast('No internet connection', 'warn'); return; }
  const btn = document.getElementById('sync-btn');
  btn.textContent = 'Syncing…'; btn.disabled = true;
  const result = await syncToServer();
  btn.textContent = 'Sync now'; btn.disabled = false;
  if (result.status === 'ok') {
    showToast(result.saved > 0 ? `Synced ${result.saved} record(s) ✓` : 'Already up to date', 'success');
    renderRecordsPanel();
  } else {
    showToast('Sync failed — check connection', 'warn');
  }
  updateSyncBadge();
});

// --- EXPORT ---
document.getElementById('export-btn').addEventListener('click', () => {
  if (!navigator.onLine) { showToast('Export requires internet connection', 'warn'); return; }
  window.open('/export.csv', '_blank');
});

// --- INIT ---
document.getElementById('checkin-form').addEventListener('submit', handleCheckin);
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

buildForm();
updateSyncBadge();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

window.addEventListener('offline', updateSyncBadge);
window.addEventListener('online', updateSyncBadge);
