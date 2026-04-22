// --- User Dashboard: Booking, QR Pass & History ---

function initCustomer() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');

  if (GlobalState.activeTab === 'profile') {
    viewTitle.innerText = "User Profile";
    renderProfileView(mainContent);
  } else if (GlobalState.activeTab === 'history') {
    viewTitle.innerText = "Booking History";
    renderHistoryView(mainContent);
  } else {
    viewTitle.innerText = "Reserve Your Spot";
    renderBookingView(mainContent);
  }
}

function renderBookingView(mainContent) {
  const hasActive = !!GlobalState.myBooking;
  const activeSpotNum = GlobalState.myBooking?.spot?.spotNumber;
  const selectedSpotNum = getSelectedSpotNumber();

  mainContent.innerHTML = `
    <div class="user-layout reveal visible">
      <div class="user-grid">
        <!-- New Booking Form -->
        <div class="glass-card booking-form-container">
          <div class="card-header">
            <h3>Configure Session</h3>
            <p>Select your parameters below</p>
          </div>
          
          <form id="new-booking-form" class="mt-6">
            ${hasActive ? `
              <div class="suggestion-box">
                <div class="s-icon">ℹ️</div>
                <div class="s-text">
                  <strong>Active Session Detected</strong>
                  <p>You already have a pass for <strong>Spot ${activeSpotNum}</strong>. You can view your QR code in the "Digital Pass" section or cancel it to book a different spot.</p>
                </div>
              </div>
            ` : ''}

            <div class="input-row ${hasActive ? 'op-3' : ''}">
              <div class="input-group">
                <label class="static-label">Vehicle Registration</label>
                <input type="text" id="vehicle-registration" class="custom-select" placeholder="e.g. ABC-1234" ${hasActive ? 'disabled' : ''} required>
              </div>
              <div class="input-group">
                <label class="static-label">Vehicle Type</label>
                <select id="vehicle-type" class="custom-select" ${hasActive ? 'disabled' : ''}>
                  <option value="Four-wheeler">Four-wheeler (Car/SUV)</option>
                  <option value="Two-wheeler">Two-wheeler (Bike)</option>
                </select>
              </div>
            </div>

            <div class="input-row mt-4 ${hasActive ? 'op-3' : ''}">
              <div class="input-group">
                <label class="static-label">Reservation Date</label>
                <input type="date" id="booking-date" class="custom-date-input" ${hasActive ? 'disabled' : ''}>
              </div>
              <div class="input-group">
                <label class="static-label">Time Slot</label>
                <select id="booking-time" class="custom-select" ${hasActive ? 'disabled' : ''}>
                  <option value="08:00">08:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                </select>
              </div>
            </div>
            
            <div id="selected-spot-display" class="selected-spot-banner mt-6">
              <div class="banner-info">
                <span class="label">Assigned Coordinate</span>
                <strong id="display-spot-number">${hasActive ? activeSpotNum : selectedSpotNum}</strong>
              </div>
              <div class="banner-price">
                <span class="label">Fixed Rate</span>
                <strong>$10.00</strong>
              </div>
            </div>

            <button type="submit" id="submit-booking-btn" class="glow-btn mt-6" ${hasActive ? 'disabled' : (GlobalState.selectedSpotId ? '' : 'disabled')}>
              ${hasActive ? `${activeSpotNum} Booked` : `Book Spot ${selectedSpotNum}`}
            </button>
          </form>
        </div>

        <!-- Active Pass -->
        <div class="glass-card active-booking-container">
          <div class="card-header">
            <h3>Active Digital Pass</h3>
            <p>Authorized access token</p>
          </div>
          <div id="active-booking-content" class="active-booking-status">
            <div class="loading-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <!-- Facility Map -->
      <div class="glass-card mt-8 map-card">
        <div class="card-header">
          <h3>Interactive Facility Map</h3>
          <div class="map-status">
            <span class="status-dot green"></span> Live Sync
          </div>
        </div>
        <p class="map-hint">Click on an <span class="text-green">Available</span> spot to select your coordinate</p>
        
        <div id="customer-parking-grid" class="parking-grid mt-6"></div>
      </div>
    </div>
  `;

  if (!hasActive) {
    const dateInput = document.getElementById('booking-date');
    if (dateInput) dateInput.valueAsDate = new Date();
    document.getElementById('new-booking-form').addEventListener('submit', handleNewBooking);
  }
  
  renderCustomer();
}

function getSelectedSpotNumber() {
  const spot = GlobalState.spots.find(s => s._id === GlobalState.selectedSpotId);
  return spot ? spot.spotNumber : '--';
}

function renderCustomer() {
  const { spots } = GlobalState;
  const grid = document.getElementById('customer-parking-grid');
  if (!grid) return;

  grid.innerHTML = '';
  spots.forEach(spot => {
    const spotDiv = document.createElement('div');
    const isSelected = GlobalState.selectedSpotId === spot._id;
    spotDiv.className = `spot-card ${spot.status.toLowerCase()} ${isSelected ? 'selected' : ''}`;
    spotDiv.innerHTML = `<div class="spot-glint"></div><div class="spot-number">${spot.spotNumber}</div><div class="spot-status">${spot.status}</div>`;
    
    if (spot.status === 'Available' && !GlobalState.myBooking) {
      spotDiv.onclick = () => selectSpotForBooking(spot);
    } else {
      spotDiv.style.cursor = 'not-allowed';
      if (GlobalState.myBooking) {
        spotDiv.onclick = () => showToast("You already have an active booking. Please cancel it first.", "error");
      }
    }
    grid.appendChild(spotDiv);
  });

  updateActivePass();
}

function selectSpotForBooking(spot) {
  GlobalState.selectedSpotId = spot._id;
  const displayNum = document.getElementById('display-spot-number');
  const submitBtn = document.getElementById('submit-booking-btn');
  if (displayNum) displayNum.innerText = spot.spotNumber;
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = `Book Spot ${spot.spotNumber}`;
  }
  renderCustomer();
}

async function handleNewBooking(e) {
  e.preventDefault();
  const vehicleType = document.getElementById('vehicle-type').value;
  const vehicleRegistration = document.getElementById('vehicle-registration').value;
  const date = document.getElementById('booking-date').value;
  const time = document.getElementById('booking-time').value;
  const btn = document.getElementById('submit-booking-btn');

  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ 
        spotId: GlobalState.selectedSpotId, 
        vehicleType, 
        vehicleRegistration,
        startTime: `${date}T${time}:00` 
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast("Reservation Successful! Your digital pass is now active.", "success");
    
    GlobalState.selectedSpotId = null;
    fetchData();

  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
  }
}

function updateActivePass() {
  const container = document.getElementById('active-booking-content');
  if (!container) return;

  const myBooking = GlobalState.myBooking;

  if (myBooking && (myBooking.status === 'Booked' || myBooking.status === 'Checked-In')) {
    container.innerHTML = `
      <div class="active-pass-card reveal visible">
        <div class="qr-zone"><div id="active-pass-qr"></div></div>
        <div class="pass-details">
          <div class="pass-row"><span class="l">Registration</span><span class="v">${myBooking.vehicleRegistration || '--'}</span></div>
          <div class="pass-row"><span class="l">Spot</span><span class="v">${myBooking.spot?.spotNumber || '--'}</span></div>
          <div class="pass-row"><span class="l">Status</span><span class="v badge-status ${myBooking.status.toLowerCase()}">${myBooking.status}</span></div>
          <div class="pass-row token-row"><span class="l">Token Hex</span><span class="v code-text">${myBooking.qrCodeToken}</span></div>
          
          ${myBooking.status === 'Booked' ? `
            <div class="cancel-container mt-6">
              <button class="premium-cancel-btn" onclick="cancelBooking('${myBooking._id}')">
                <span class="btn-text">Terminate Reservation</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </button>
              <p class="cancel-hint">Valid only before check-in</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    new QRCode(document.getElementById("active-pass-qr"), {
      text: myBooking.qrCodeToken,
      width: 180, height: 180, colorDark : "#000000", colorLight : "#ffffff"
    });
  } else {
    container.innerHTML = `<div class="empty-pass"><div class="empty-icon">🎫</div><p>No active reservations</p></div>`;
  }
}

function renderHistoryView(mainContent) {
  const history = GlobalState.history;
  mainContent.innerHTML = `
    <div class="glass-card reveal visible">
      <div class="card-header">
        <h3>Reservation History</h3>
        <p>Log of your previous facility interactions</p>
      </div>
      <div class="table-wrapper mt-6">
        <table class="activity-table">
          <thead>
            <tr><th>Date</th><th>Spot</th><th>Vehicle No.</th><th>Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${history.map(item => `
              <tr>
                <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                <td>${item.spot?.spotNumber || 'N/A'}</td>
                <td>${item.vehicleRegistration || '--'}</td>
                <td>${item.vehicleType || 'Car'}</td>
                <td><span class="badge-status ${item.status.toLowerCase()}">${item.status}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 40px; opacity: 0.5;">No records found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProfileView(mainContent) {
  const user = GlobalState.currentUser;
  mainContent.innerHTML = `
    <div class="profile-layout glass-card reveal visible">
      <div class="profile-header">
        <img src="https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff&bold=true" class="profile-avatar-large">
        <h3>${user.name}</h3>
        <p class="text-muted">Registered Member</p>
      </div>
      <div class="profile-info-grid">
        <div class="info-field"><span class="label">Email</span><span class="value">${user.email}</span></div>
        <div class="info-field"><span class="label">Role</span><span class="value">${user.role.toUpperCase()}</span></div>
        <div class="info-field"><span class="label">Status</span><span class="value text-green">Verified</span></div>
      </div>
      <button class="glow-btn mt-8" onclick="logout()">Terminate Session</button>
    </div>
  `;
}
