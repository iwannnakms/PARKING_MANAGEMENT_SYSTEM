// --- Security Guard Dashboard Logic ---

async function initGuard(user, token, socket) {
  const contentArea = document.querySelector('.content-area');
  const topbarTitle = document.querySelector('.topbar-left h2');
  topbarTitle.innerText = "Entry Scanner";

  contentArea.innerHTML = `
    <div class="guard-layout">
      <!-- Scanner Controls -->
      <div class="glass-card scanner-container">
        <div class="scanner-header">
          <div class="scanner-badge">Secure Terminal</div>
          <h3>QR Access Scanner</h3>
          <p>Scan visitor's digital pass to authorize entry</p>
        </div>

        <div class="scanner-viewport">
          <div id="reader" class="qr-reader-window"></div>
          <div class="scanner-overlay">
            <div class="scan-frame"></div>
          </div>
        </div>

        <div id="scan-feedback" class="scan-feedback hidden">
          <div class="feedback-icon"></div>
          <div class="feedback-text">
            <h4 id="feedback-title">Status</h4>
            <p id="feedback-msg">Waiting for scan...</p>
          </div>
        </div>

        <div class="scanner-actions">
          <button id="btn-start-scanner" class="btn-submit" onclick="toggleScanner()">
            Engage Camera
          </button>
        </div>
      </div>

      <!-- Live Log of recent scans -->
      <div class="glass-card log-container mt-8">
        <h3>Recent Validations</h3>
        <div id="scan-log" class="scan-log">
          <!-- Log items injected here -->
        </div>
      </div>
    </div>
  `;

  // Inject Guard-specific styles if not already present
  injectGuardStyles();
}

let html5QrCode;
let scannerActive = false;

async function toggleScanner() {
  const btn = document.getElementById('btn-start-scanner');
  const feedback = document.getElementById('scan-feedback');
  
  if (!scannerActive) {
    btn.innerText = "Disengage Camera";
    btn.style.background = "var(--space-darker)";
    btn.style.border = "1px solid var(--neon-purple)";
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess
      );
      scannerActive = true;
      feedback.classList.remove('hidden');
    } catch (err) {
      alert("Camera access denied or not found.");
      resetScannerUI();
    }
  } else {
    stopScanner();
  }
}

async function stopScanner() {
  if (html5QrCode) {
    await html5QrCode.stop();
  }
  resetScannerUI();
}

function resetScannerUI() {
  const btn = document.getElementById('btn-start-scanner');
  btn.innerText = "Engage Camera";
  btn.style.background = "var(--primary)";
  btn.style.border = "none";
  scannerActive = false;
}

async function onScanSuccess(decodedText, decodedResult) {
  // Briefly stop to process
  await html5QrCode.pause();
  
  const token = localStorage.getItem('token');
  const feedback = document.getElementById('scan-feedback');
  const feedbackTitle = document.getElementById('feedback-title');
  const feedbackMsg = document.getElementById('feedback-msg');

  feedback.className = "scan-feedback processing";
  feedbackTitle.innerText = "Verifying...";
  feedbackMsg.innerText = "Authenticating token with central server";

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ qrCodeToken: decodedText })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error);
    }

    // Success Check-in
    feedback.className = "scan-feedback success";
    feedbackTitle.innerText = "Access Granted";
    feedbackMsg.innerText = `Spot ${data.spotNumber} authorized for entry.`;
    
    addToLog(data.spotNumber, "SUCCESS");

    // Auto-resume after 2 seconds
    setTimeout(() => {
      feedback.className = "scan-feedback hidden";
      html5QrCode.resume();
    }, 2500);

  } catch (err) {
    feedback.className = "scan-feedback error";
    feedbackTitle.innerText = "Access Denied";
    feedbackMsg.innerText = err.message;
    
    addToLog("ERR", "DENIED");

    setTimeout(() => {
      feedback.className = "scan-feedback hidden";
      html5QrCode.resume();
    }, 3000);
  }
}

function addToLog(spot, status) {
  const log = document.getElementById('scan-log');
  const time = new Date().toLocaleTimeString();
  const logItem = document.createElement('div');
  logItem.className = 'log-item';
  logItem.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-spot">Spot ${spot}</span>
    <span class="log-status status-${status.toLowerCase()}">${status}</span>
  `;
  log.prepend(logItem);
}

function injectGuardStyles() {
  if (document.getElementById('guard-styles')) return;
  const style = document.createElement('style');
  style.id = 'guard-styles';
  style.innerHTML = `
    .scanner-container { max-width: 600px; margin: 0 auto; text-align: center; }
    .scanner-header { margin-bottom: 32px; }
    .scanner-badge { 
      display: inline-block; padding: 4px 12px; background: rgba(129, 140, 248, 0.1); 
      border: 1px solid var(--neon-purple); border-radius: 100px; color: var(--neon-purple);
      font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;
    }
    
    .scanner-viewport { 
      position: relative; width: 100%; aspect-ratio: 4/3; background: #000; 
      border-radius: 24px; overflow: hidden; margin-bottom: 24px;
      border: 1px solid var(--glass-border);
    }
    
    .qr-reader-window { width: 100%; height: 100%; }
    
    .scanner-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center; pointer-events: none;
    }
    
    .scan-frame {
      width: 250px; height: 250px; border: 2px solid var(--neon-blue);
      border-radius: 20px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.3), 0 0 0 1000px rgba(0,0,0,0.5);
      position: relative;
    }
    
    .scan-frame::after {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
      background: var(--neon-blue); box-shadow: 0 0 15px var(--neon-blue);
      animation: scanLine 2s linear infinite;
    }
    
    @keyframes scanLine {
      0% { top: 0; }
      100% { top: 100%; }
    }
    
    .scan-feedback {
      padding: 20px; border-radius: 16px; margin-bottom: 24px;
      display: flex; align-items: center; gap: 16px; text-align: left;
      transition: all 0.3s var(--ease-out);
    }
    
    .scan-feedback.processing { background: rgba(56, 189, 248, 0.1); border: 1px solid var(--neon-blue); }
    .scan-feedback.success { background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; }
    .scan-feedback.error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; }
    
    .log-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .log-time { color: var(--text-muted); font-size: 13px; }
    .log-spot { font-weight: 600; }
    .log-status { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .status-success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .status-denied { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  `;
  document.head.appendChild(style);
}
