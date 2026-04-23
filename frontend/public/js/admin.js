// --- Admin Dashboard: Analytics & Management ---

let adminOccupancyChart = null;
let adminSelectedSpotId = null;

function initAdmin() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  if (!mainContent) return;
  
  viewTitle.innerText = "Command Center";

  if (adminOccupancyChart) { adminOccupancyChart.destroy(); adminOccupancyChart = null; }

  mainContent.innerHTML = `
    <div class="admin-layout reveal visible">
      <!-- 1. Metrics -->
      <div class="dashboard-widgets">
        <div class="glass-card stat-card">
          <h4>Total Revenue</h4>
          <h2 id="admin-revenue" class="gradient-text-blue">₹0</h2>
        </div>
        <div class="glass-card stat-card">
          <h4>Availability</h4>
          <h2 id="admin-spots-avail" class="gradient-text-purple">0</h2>
          <p class="stat-meta">/ <span id="admin-total-spots">50</span> Total</p>
        </div>
        <div class="glass-card stat-card">
          <h4>Check-ins</h4>
          <h2 id="admin-checkins" class="gradient-text-pink">0</h2>
          <p class="stat-meta">Today</p>
        </div>
      </div>

      <div class="admin-visuals-row mt-8">
        <!-- 2. Occupancy Chart -->
        <div class="glass-card chart-container">
          <div class="card-header"><h3>Occupancy Distribution</h3></div>
          <div class="chart-wrapper"><canvas id="adminOccupancyChart"></canvas></div>
        </div>
        
        <!-- 3. Inventory Management -->
        <div class="glass-card inventory-panel">
          <div class="card-header">
            <h3>Facility Inventory</h3>
            <p>Adjust total parking slots</p>
          </div>
          <div class="inventory-controls mt-6">
            <div class="input-group">
              <label class="static-label">Target Capacity</label>
              <div class="premium-input-wrapper">
                <input type="number" id="target-slot-count" min="1" max="200" value="50">
                <button class="verify-btn" onclick="updateInventory()">Update</button>
              </div>
            </div>
            <p class="action-hint mt-4">Reduces capacity by removing available spots from the end.</p>
          </div>
        </div>
      </div>

      <div class="admin-visuals-row mt-8">
        <!-- 4. Live Monitor -->
        <div class="glass-card mini-grid-container">
          <div class="card-header">
            <h3>Live Facility Monitor</h3>
            <p>Select a spot to override status</p>
          </div>
          <div id="admin-parking-grid" class="parking-grid admin-mini-grid mt-4"></div>
        </div>

        <!-- 5. Force Actions Terminal -->
        <div class="glass-card status-panel">
          <div class="card-header">
            <h3>Spot Override Terminal</h3>
            <p>Manual state manipulation</p>
          </div>
          <div class="quick-actions mt-6">
            <div id="admin-selected-spot" class="selected-spot-banner mb-4">
              <div class="banner-info">
                <span class="label">Coordinate</span>
                <strong id="admin-display-spot">--</strong>
              </div>
            </div>
            <div class="action-buttons">
              <button id="btn-admin-checkin" class="action-btn checkin" onclick="triggerAdminForce('checkin')" disabled>Force Entry</button>
              <button id="btn-admin-checkout" class="action-btn checkout" onclick="triggerAdminForce('checkout')" disabled>Force Exit</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Activity Log -->
      <div class="glass-card mt-8">
        <div class="card-header"><h3>Facility Event Log</h3></div>
        <div class="table-wrapper mt-4">
          <table class="activity-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Reg. No</th>
                <th>Spot</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="activity-log-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  renderAdmin();
}

function renderAdmin() {
  const { stats, spots, recentActivity } = GlobalState;
  
  const revEl = document.getElementById('admin-revenue');
  const availEl = document.getElementById('admin-spots-avail');
  const totalEl = document.getElementById('admin-total-spots');
  const checkinEl = document.getElementById('admin-checkins');
  const targetInput = document.getElementById('target-slot-count');

  if (revEl) revEl.innerText = `₹${stats.totalRevenue || 0}`;
  if (availEl) availEl.innerText = stats.availableSpots || 0;
  if (totalEl) totalEl.innerText = stats.totalSpots || 0;
  if (checkinEl) checkinEl.innerText = stats.dailyCheckins || 0;
  if (targetInput && !targetInput.matches(':focus')) targetInput.value = stats.totalSpots || 50;

  updateAdminOccupancyChart(stats);

  const grid = document.getElementById('admin-parking-grid');
  if (grid) {
    grid.innerHTML = spots.map(spot => {
      const isSelected = adminSelectedSpotId === spot._id;
      return `<div class="spot-card mini ${spot.status.toLowerCase()} ${isSelected ? 'selected' : ''}" onclick="selectAdminSpot('${spot._id}', '${spot.spotNumber}')"><span>${spot.spotNumber}</span></div>`;
    }).join('');
  }

  const tableBody = document.getElementById('activity-log-body');
  if (tableBody) {
    tableBody.innerHTML = recentActivity.map(act => {
      const time = act.updatedAt ? new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      return `
        <tr>
          <td>${act.user?.name || 'System'}</td>
          <td class="code-text">${act.vehicleRegistration || '--'}</td>
          <td><strong>${act.spot?.spotNumber || 'N/A'}</strong></td>
          <td><span class="badge-status ${act.status ? act.status.toLowerCase() : 'unknown'}">${act.status || 'Unknown'}</span></td>
          <td class="text-muted">${time}</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="5" style="text-align:center; padding:20px; opacity:0.5;">No activity logs found</td></tr>';
  }
}

function selectAdminSpot(id, number) {
  adminSelectedSpotId = id;
  const display = document.getElementById('admin-display-spot');
  const btnIn = document.getElementById('btn-admin-checkin');
  const btnOut = document.getElementById('btn-admin-checkout');
  if (display) display.innerText = number;
  if (btnIn) btnIn.disabled = false;
  if (btnOut) btnOut.disabled = false;
  renderAdmin();
}

async function triggerAdminForce(action) {
  if (!adminSelectedSpotId) return;
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/force`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ spotId: adminSelectedSpotId, action })
    });
    if (res.ok) {
      showToast(`Force ${action} successful`, 'success');
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error, 'error');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function updateInventory() {
  const targetCount = parseInt(document.getElementById('target-slot-count').value);
  if (isNaN(targetCount) || targetCount < 1) return showToast("Invalid count", "error");

  try {
    const res = await fetch(`${API_BASE_URL}/bookings/manage-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ targetCount })
    });
    if (res.ok) {
      showToast("Inventory updated", "success");
      fetchData();
    } else {
      const data = await res.json();
      showToast(data.error, "error");
    }
  } catch (err) { showToast(err.message, "error"); }
}

function updateAdminOccupancyChart(stats) {
  const canvas = document.getElementById('adminOccupancyChart');
  if (!canvas) return;
  const data = {
    labels: ['Available', 'Booked', 'Occupied'],
    datasets: [{
      data: [stats.availableSpots || 0, stats.bookedSpots || 0, stats.occupiedSpots || 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderColor: 'rgba(255,255,255,0.05)',
      borderWidth: 5
    }]
  };
  if (adminOccupancyChart) {
    adminOccupancyChart.data = data;
    adminOccupancyChart.update();
  } else {
    adminOccupancyChart = new Chart(canvas, {
      type: 'doughnut',
      data: data,
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } } } }
    });
  }
}
