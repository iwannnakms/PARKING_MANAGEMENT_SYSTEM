// --- Customer Dashboard Logic ---

let spotsData = [];
let currentSelectedSpot = null;

async function initCustomer(user, token, socket) {
  // 1. Set Up the Layout for Customer
  const contentArea = document.querySelector('.content-area');
  const topbarTitle = document.querySelector('.topbar-left h2');
  topbarTitle.innerText = "Reserve a Spot";

  contentArea.innerHTML = `
    <!-- Customer Widgets -->
    <div class="dashboard-widgets" id="customer-widgets">
      <div class="glass-card stat-card">
        <h4>Available</h4>
        <h2 id="count-available" class="gradient-text-blue">0</h2>
      </div>
      <div class="glass-card stat-card">
        <h4>Your Bookings</h4>
        <h2 id="count-user-bookings" class="gradient-text-purple">0</h2>
      </div>
      <div class="glass-card stat-card">
        <h4>Occupied</h4>
        <h2 id="count-occupied" class="gradient-text-pink">0</h2>
      </div>
    </div>

    <!-- Parking Grid Container -->
    <div class="grid-section mt-8">
      <div class="section-header">
        <h3>Live Parking Grid</h3>
        <p>Select an available spot to book instantly</p>
      </div>
      <div id="parking-grid" class="parking-grid">
        <!-- Spots injected here -->
      </div>
    </div>

    <!-- Modals (Hidden by default) -->
    <div id="customer-modals"></div>
  `;

  // 2. Fetch Initial Spots
  await fetchSpots(token);

  // 3. Listen for Real-Time Updates
  socket.on('spotUpdated', (update) => {
    const index = spotsData.findIndex(s => s._id === update.spotId);
    if (index !== -1) {
      spotsData[index].status = update.status;
      renderGrid();
      updateWidgets();
    }
  });

  renderGrid();
  updateWidgets();
}

async function fetchSpots(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/spots`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    spotsData = data.spots;
  } catch (err) {
    console.error('Error fetching spots:', err);
  }
}

function updateWidgets() {
  const avail = spotsData.filter(s => s.status === 'Available').length;
  const occupied = spotsData.filter(s => s.status === 'Occupied').length;
  
  document.getElementById('count-available').innerText = avail;
  document.getElementById('count-occupied').innerText = occupied;
  // Note: Count user bookings would require an additional API call or local filtering
}

function renderGrid() {
  const grid = document.getElementById('parking-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  spotsData.forEach(spot => {
    const spotDiv = document.createElement('div');
    spotDiv.className = `spot-card ${spot.status.toLowerCase()}`;
    spotDiv.innerHTML = `
      <div class="spot-number">${spot.spotNumber}</div>
      <div class="spot-status">${spot.status}</div>
    `;
    
    if (spot.status === 'Available') {
      spotDiv.onclick = () => openBookingModal(spot);
    }
    
    grid.appendChild(spotDiv);
  });
}

function openBookingModal(spot) {
  currentSelectedSpot = spot;
  const modalContainer = document.getElementById('customer-modals');
  
  modalContainer.innerHTML = `
    <div class="auth-overlay">
      <div class="auth-container glass-card" style="max-width: 400px;">
        <div class="modal-header">
          <h2>Confirm Booking</h2>
          <p>Spot ID: ${spot.spotNumber}</p>
        </div>
        <div class="modal-body" style="margin: 24px 0; text-align: center;">
          <p style="font-size: 18px; color: var(--text-main);">Rate: <span class="gradient-text" style="font-weight: 700;">$10.00 / session</span></p>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">*Mock payment transaction will be processed</p>
        </div>
        <button class="btn-submit" onclick="confirmBooking()">Confirm & Pay</button>
        <button class="toggle-btn" style="width: 100%; margin-top: 12px; color: #ef4444;" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
}

async function confirmBooking() {
  const token = localStorage.getItem('token');
  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.innerText = "Processing...";

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ spotId: currentSelectedSpot._id })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Show Success & QR
    showQR(data.booking.qrCodeToken);
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerText = "Confirm & Pay";
  }
}

function showQR(qrToken) {
  const modalContainer = document.getElementById('customer-modals');
  modalContainer.innerHTML = `
    <div class="auth-overlay">
      <div class="auth-container glass-card" style="max-width: 450px; text-align: center;">
        <h2 class="gradient-text">Booking Successful!</h2>
        <p style="margin-bottom: 24px;">Your digital entry pass is ready.</p>
        
        <div id="qrcode" style="background: white; padding: 20px; border-radius: 20px; display: inline-block;"></div>
        
        <p style="margin-top: 24px; color: var(--text-muted); font-size: 14px;">Present this QR code to the Security Guard at the entrance.</p>
        <button class="btn-submit" onclick="closeModal()" style="margin-top: 24px;">Done</button>
      </div>
    </div>
  `;

  new QRCode(document.getElementById("qrcode"), {
    text: qrToken,
    width: 250,
    height: 250,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
}

function closeModal() {
  document.getElementById('customer-modals').innerHTML = '';
}
