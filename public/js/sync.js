// Sync engine — pushes unsynced IndexedDB records to backend when online
const API = window.location.origin;

async function syncToServer() {
  if (!navigator.onLine) return { status: 'offline' };

  try {
    const unsynced = await getUnsyncedCheckins();
    if (!unsynced.length) return { status: 'ok', saved: 0 };

    const res = await fetch(`${API}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsynced)
    });

    if (!res.ok) throw new Error('Server error');
    const result = await res.json();
    await markSynced(unsynced.map(r => r.id));
    return { status: 'ok', saved: result.saved };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function fetchServerRecords() {
  const res = await fetch(`${API}/records`);
  if (!res.ok) throw new Error('Could not fetch records');
  return res.json();
}

// Auto-sync whenever we come back online
window.addEventListener('online', async () => {
  const result = await syncToServer();
  if (result.status === 'ok' && result.saved > 0) {
    showToast(`Synced ${result.saved} record(s) to server ✓`, 'success');
    if (document.getElementById('panel-records').classList.contains('active')) {
      renderRecordsPanel();
    }
  }
  updateSyncBadge();
});
