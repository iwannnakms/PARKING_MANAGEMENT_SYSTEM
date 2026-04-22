// --- Guard Dashboard: Operations & Verification ---

function initGuard() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  viewTitle.innerText = "Security Terminal";

  mainContent.innerHTML = `
    <div class="guard-layout">
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
                <input type="text" id="manual-token" placeholder="Enter 32-character hex token..." autocomplete="off">
                <button class="verify-btn" onclick="verifyToken()">
                  <span>Validate</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
            </div>
          </div>

          <div id="verify-result" class="verify-feedback hidden"></div>
        </div>

        <!-- Real-time Status -->
        <div class="glass-card status-panel">
          <h3>Facility Status</h3>
          <div class="status-metrics mt-4">
            <div class="metric">
              <span class="m-value" id="guard-cars-inside">0</span>
              <span class="m-label">Vehicles Inside</span>
            </div>
          </div>
          
          <div class="quick-actions mt-8">
            <h4>Quick Resolution</h4>
            <div class="action-buttons">
              <button class="action-btn checkin" onclick="triggerScanAction('checkin')">Force Check-In</button>
              <button class="action-btn checkout" onclick="triggerScanAction('checkout')">Force Check-Out</button>
            </div>
            <p class="action-hint">Use only if scanner/token fails validation</p>
          </div>
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

function renderGuard() {
  const { stats, recentActivity } = GlobalState;

  // Update Counters
  const carsInside = document.getElementById('guard-cars-inside');
  if (carsInside) carsInside.innerText = stats.occupiedSpots || 0;

  // Update Log
  const log = document.getElementById('guard-event-log');
  if (log) {
    log.innerHTML = '';
    recentActivity.slice(0, 5).forEach(act => {
      const item = document.createElement('div');
      item.className = 'log-entry';
      const time = new Date(act.updatedAt).toLocaleTimeString();
      item.innerHTML = `
        <span class="time">${time}</span>
        <span class="msg">Spot <strong>${act.spot?.spotNumber || 'N/A'}</strong> ${act.status} by ${act.user?.name || 'User'}</span>
      `;
      log.appendChild(item);
    });
  }
}

let html5Scanner;

function startGuardScanner() {
  if (html5Scanner) return;

  html5Scanner = new Html5Qrcode("guard-reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  
  html5Scanner.start(
    { facingMode: "environment" }, 
    config, 
    (text) => {
      document.getElementById('manual-token').value = text;
      verifyToken(text);
    }
  ).catch(err => console.warn("Scanner Error:", err));
}

async function verifyToken(passedToken) {
  const token = passedToken || document.getElementById('manual-token').value;
  const feedback = document.getElementById('verify-result');

  if (!token) return;

  feedback.classList.remove('hidden', 'success', 'error');
  feedback.innerText = "Verifying Token...";
  
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GlobalState.token}`
      },
      body: JSON.stringify({ qrCodeToken: token })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    feedback.classList.add('success');
    feedback.innerText = `Success! Authorized Spot ${data.spotNumber}`;
    
    // Refresh Global State
    fetchData();

  } catch (err) {
    feedback.classList.add('error');
    feedback.innerText = `Error: ${err.message}`;
  }
}

function triggerScanAction(type) {
  // Simplified for prototype: Usually would require a selected spot
  alert(`Manual ${type} triggered. Select a spot from the Facility Map (Coming Soon).`);
}
