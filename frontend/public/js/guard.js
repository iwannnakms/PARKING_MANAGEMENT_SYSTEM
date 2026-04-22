// --- Guard Dashboard: Operations & Verification ---

let html5Scanner = null;

async function initGuard() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  const mode = GlobalState.guardMode === 'checkin' ? "Entry Scanner" : "Exit Scanner";
  viewTitle.innerText = mode;

  // CRITICAL: Properly stop existing scanner before replacing HTML
  if (html5Scanner) {
    try {
      if (html5Scanner.isScanning) {
        await html5Scanner.stop();
      }
    } catch (e) {
      console.warn('[ParkSync] Scanner cleanup warning:', e);
    }
    html5Scanner = null;
  }

  mainContent.innerHTML = `
    <div class="guard-layout reveal visible">
      <div class="guard-grid">
        <!-- Scanner & Verification -->
        <div class="glass-card scanner-panel ${GlobalState.guardMode}">
          <div class="scanner-header">
            <h3>${GlobalState.guardMode === 'checkin' ? 'Check-In Mode' : 'Check-Out Mode'}</h3>
            <div class="live-status">
              <span class="status-dot green"></span> Terminal Active
            </div>
          </div>
          
          <div class="scanner-mock">
            <div id="guard-reader" class="qr-reader-box"></div>
            <div class="scanner-overlay-line"></div>
          </div>

          <div class="manual-entry-container mt-8">
            <div class="input-group">
              <label class="static-label">Authentication Token (${GlobalState.guardMode})</label>
              <div class="premium-input-wrapper">
                <input type="text" id="manual-token" placeholder="Paste hex token here..." autocomplete="off">
                <button class="verify-btn" onclick="verifyToken()">
                  <span>Validate</span>
                </button>
              </div>
            </div>
          </div>

          <div id="verify-result" class="verify-feedback hidden"></div>
        </div>

        <!-- Quick Actions & Manual Control -->
        <div class="glass-card status-panel">
          <div class="card-header">
            <h3>Manual Spot Control</h3>
            <p>Click a spot below to force override</p>
          </div>
          
          <div class="quick-actions mt-6">
            <div id="guard-selected-spot" class="selected-spot-banner mb-4">
              <div class="banner-info">
                <span class="label">Target Coordinate</span>
                <strong id="guard-display-spot">--</strong>
              </div>
            </div>

            <div class="action-buttons">
              <button id="btn-force-checkin" class="action-btn checkin" onclick="triggerForce('checkin')" disabled>Force Entry</button>
              <button id="btn-force-checkout" class="action-btn checkout" onclick="triggerForce('checkout')" disabled>Force Exit</button>
            </div>
            <p class="action-hint mt-4">Use only for manual overrides</p>
          </div>
        </div>
      </div>

      <!-- Spot Monitor Grid -->
      <div class="glass-card mt-8">
        <div class="card-header">
          <h3>Spot Monitor</h3>
          <p>Real-time bird's-eye view of all spots</p>
        </div>
        <div id="guard-parking-grid" class="parking-grid mt-4"></div>
      </div>

      <!-- Recent Log -->
      <div class="glass-card mt-8">
        <h3>Terminal Validation Log</h3>
        <div class="log-wrapper mt-4">
          <div id="guard-event-log" class="event-log"></div>
        </div>
      </div>
    </div>
  `;

  renderGuard();
  
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    startGuardScanner();
  }, 100);
}

let guardSelectedSpotId = null;

function renderGuard() {
  const { stats, spots, recentActivity } = GlobalState;

  const grid = document.getElementById('guard-parking-grid');
  if (grid) {
    grid.innerHTML = '';
    spots.forEach(spot => {
      const spotDiv = document.createElement('div');
      const isSelected = guardSelectedSpotId === spot._id;
      spotDiv.className = `spot-card mini ${spot.status.toLowerCase()} ${isSelected ? 'selected' : ''}`;
      spotDiv.innerHTML = `<span>${spot.spotNumber}</span>`;
      spotDiv.onclick = () => selectGuardSpot(spot);
      grid.appendChild(spotDiv);
    });
  }

  const log = document.getElementById('guard-event-log');
  if (log) {
    log.innerHTML = '';
    recentActivity.slice(0, 8).forEach(act => {
      const item = document.createElement('div');
      item.className = 'log-entry';
      const time = new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      item.innerHTML = `
        <span class="time">${time}</span>
        <span class="msg">Spot <strong>${act.spot?.spotNumber || 'N/A'}</strong> ${act.status}</span>
      `;
      log.appendChild(item);
    });
  }
}

function selectGuardSpot(spot) {
  guardSelectedSpotId = spot._id;
  const display = document.getElementById('guard-display-spot');
  const btnIn = document.getElementById('btn-force-checkin');
  const btnOut = document.getElementById('btn-force-checkout');
  if (display) display.innerText = spot.spotNumber;
  if (btnIn) btnIn.disabled = false;
  if (btnOut) btnOut.disabled = false;
  renderGuard();
}

async function triggerForce(action) {
  if (!guardSelectedSpotId) return;
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/force`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ spotId: guardSelectedSpotId, action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Force ${action} successful`, 'success');
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function startGuardScanner() {
  if (html5Scanner) return;
  
  html5Scanner = new Html5Qrcode("guard-reader");
  const config = { fps: 15, qrbox: { width: 250, height: 250 } };
  
  html5Scanner.start(
    { facingMode: "environment" }, 
    config, 
    (text) => {
      html5Scanner.pause(); // Pause to prevent double scans
      document.getElementById('manual-token').value = text;
      verifyToken(text);
      setTimeout(() => html5Scanner.resume(), 3000);
    }
  ).catch(err => {
    console.error("Scanner Error:", err);
    // If start fails, ensure we nullify so user can try again
    html5Scanner = null;
  });
}

async function verifyToken(passedToken) {
  const token = passedToken || document.getElementById('manual-token').value;
  if (!token) return;
  const mode = GlobalState.guardMode; 
  
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ qrCodeToken: token, mode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message, 'success');
    document.getElementById('manual-token').value = '';
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
