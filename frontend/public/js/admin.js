// --- Admin Dashboard: Analytics & Management ---

function initAdmin() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  viewTitle.innerText = "Command Center";

  mainContent.innerHTML = `
    <div class="admin-layout">
      <!-- Top Metric Cards -->
      <div class="dashboard-widgets">
        <div class="glass-card stat-card reveal visible">
          <h4>Total Revenue</h4>
          <h2 id="admin-revenue" class="gradient-text-blue">$0</h2>
          <p class="stat-meta">Lifetime Earnings</p>
        </div>
        <div class="glass-card stat-card reveal visible">
          <h4>Availability</h4>
          <h2 id="admin-spots-avail" class="gradient-text-purple">0</h2>
          <p class="stat-meta">Free / 50 Total</p>
        </div>
        <div class="glass-card stat-card reveal visible">
          <h4>Daily Check-ins</h4>
          <h2 id="admin-checkins" class="gradient-text-pink">0</h2>
          <p class="stat-meta">Today's Traffic</p>
        </div>
      </div>

      <div class="admin-grid-layout mt-8">
        <!-- Live Parking Grid -->
        <div class="glass-card grid-container">
          <div class="card-header">
            <h3>Live Facility Map</h3>
            <div class="grid-legend">
              <span class="legend-item"><span class="dot available"></span> Avail</span>
              <span class="legend-item"><span class="dot reserved"></span> Reserved</span>
              <span class="legend-item"><span class="dot occupied"></span> Occ</span>
            </div>
          </div>
          <div id="admin-parking-grid" class="parking-grid admin-mini-grid">
            <!-- Spots rendered here -->
          </div>
        </div>

        <!-- Recent Activity Table -->
        <div class="glass-card activity-container">
          <h3>Recent Activity</h3>
          <div class="table-wrapper">
            <table class="activity-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Spot</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody id="activity-log-body">
                <!-- Activity rows injected here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  renderAdmin();
}

function renderAdmin() {
  // 1. Update Metrics
  const { stats, spots, recentActivity } = GlobalState;
  
  const revEl = document.getElementById('admin-revenue');
  const availEl = document.getElementById('admin-spots-avail');
  const checkinEl = document.getElementById('admin-checkins');

  if (revEl) revEl.innerText = `$${stats.totalRevenue || 0}`;
  if (availEl) availEl.innerText = stats.availableSpots || 0;
  if (checkinEl) checkinEl.innerText = stats.dailyCheckins || 0;

  // 2. Render Grid
  const grid = document.getElementById('admin-parking-grid');
  if (grid) {
    grid.innerHTML = '';
    spots.forEach(spot => {
      const spotDiv = document.createElement('div');
      spotDiv.className = `spot-card mini ${spot.status.toLowerCase()}`;
      spotDiv.innerHTML = `<span>${spot.spotNumber}</span>`;
      grid.appendChild(spotDiv);
    });
  }

  // 3. Render Activity Table
  const tableBody = document.getElementById('activity-log-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    recentActivity.forEach(act => {
      const row = document.createElement('tr');
      const time = new Date(act.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      row.innerHTML = `
        <td>${act.user?.name || 'N/A'}</td>
        <td>${act.spot?.spotNumber || 'N/A'}</td>
        <td><span class="badge-status ${act.status.toLowerCase()}">${act.status}</span></td>
        <td>${time}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}
