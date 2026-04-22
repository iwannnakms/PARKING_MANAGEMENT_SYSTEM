// --- Guard Dashboard: Operations & Verification ---

function initGuard() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  viewTitle.innerText = "Security Terminal";

  mainContent.innerHTML = `
    <div class="guard-layout reveal visible">
      <div class="guard-grid">
        <!-- Scanner & Verification -->
        <div class="glass-card scanner-panel">
          <div class="scanner-header">
            <h3>QR Verification</h3>
            <div class="live-status">
              <span class="status-dot green"></span> System Live
            </div>
          </div>
          
          <div class="scanner-mock">
            <div id="guard-reader" class="qr-reader-box"></div>
            <div class="scanner-overlay-line"></div>
          </div>

          <div class="manual-entry-container mt-8">
            <div class="input-group">
              <label class="static-label">Authentication Token</label>
              <div class="premium-input-wrapper">
                <input type="text" id="manual-token" placeholder="Enter token hex..." autocomplete="off">
                <button class="verify-btn" onclick="verifyToken()">
                  <span>Validate</span>
                </button>
              </div>
            </div>
          </div>

          <div id="verify-result" class="verify-feedback hidden"></div>
        </div>

        <!-- Real-time Status & Quick Actions -->
        <div class="glass-card status-panel">
          <h3>Facility Status</h3>
          <div class="status-metrics mt-4">
            <div class="metric">
              <span class="m-value" id="guard-cars-inside">0</span>
              <span class="m-label">Vehicles Inside</span>
            </div>
          </div>
          
          <div class="quick-actions mt-8">
            <h4>Manual Spot Control</h4>
            <p class="action-hint mb-4">Select a spot from the map to force action</p>
            
            <div id="guard-selected-spot" class="selected-spot-banner mb-4">
              <div class="banner-info">
                <span class="label">Target Spot</span>
                <strong id="guard-display-spot">--</strong>
              </div>
            </div>

            <div class="action-buttons">
              <button id="btn-force-checkin" class="action-btn checkin" onclick="triggerForce('checkin')" disabled>Force Check-In</button>
              <button id="btn-force-checkout" class="action-btn checkout" onclick="triggerForce('checkout')" disabled>Force Check-Out</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Spot Monitor Grid -->
      <div class="glass-card mt-8">
        <div class="card-header">
          <h3>Spot Monitor</h3>
          <p>Click any spot to enable manual override</p>
        </div>
        <div id="guard-parking-grid" class="parking-grid mt-4">
          <!-- Monitor spots injected here -->
        </div>
      </div>

      <!-- Recent Log -->
      <div class="glass-card mt-8">
        <h3>Terminal Event Log</h3>
        <div class="log-wrapper mt-4">
          <div id="guard-event-log" class="event-log">
            <!-- Events injected here -->
          </div>
        </div>
      </div>
    </div>
  `;

  renderGuard();
  startGuardScanner();
}

let guardSelectedSpotId = null;

function renderGuard() {
  const { stats, spots, recentActivity } = GlobalState;

  // 1. Update Counters
  const carsInside = document.getElementById('guard-cars-inside');
  if (carsInside) carsInside.innerText = stats.occupiedSpots || 0;

  // 2. Render Monitor Grid
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

  // 3. Update Log
  const log = document.getElementById('guard-event-log');
  if (log) {
    log.innerHTML = '';
    // Show last 8 actions
    recentActivity.slice(0, 8).forEach(act => {
      const item = document.createElement('div');
      item.className = 'log-entry';
      const time = new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      item.innerHTML = `
        <span class="time">${time}</span>
        <span class="msg">Spot <strong>${act.spot?.spotNumber || 'N/A'}</strong> set to <strong>${act.status}</strong></span>
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GlobalState.token}`
      },
      body: JSON.stringify({ spotId: guardSelectedSpotId, action })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    showToast(`Spot updated successfully`, 'success');
    fetchData(); // Sync global state
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let html5Scanner;
function startGuardScanner() {
  if (html5Scanner) return;
  html5Scanner = new Html5Qrcode("guard-reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  html5Scanner.start({ facingMode: "environment" }, config, (text) => {
    document.getElementById('manual-token').value = text;
    verifyToken(text);
  }).catch(err => console.warn("Scanner Error:", err));
}

async function verifyToken(passedToken) {
  const token = passedToken || document.getElementById('manual-token').value;
  const feedback = document.getElementById('verify-result');
  if (!token) return;

  feedback.classList.remove('hidden', 'success', 'error');
  feedback.innerText = "Verifying...";
  
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ qrCodeToken: token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`Access Granted: Spot ${data.spotNumber}`, 'success');
    document.getElementById('manual-token').value = '';
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
    feedback.classList.add('error');
    feedback.innerText = err.message;
  }
}
