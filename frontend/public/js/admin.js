// --- Admin Dashboard: Analytics & Management ---

let adminOccupancyChart = null;

function initAdmin() {
  const mainContent = document.getElementById('main-content');
  const viewTitle = document.getElementById('view-title');
  viewTitle.innerText = "Command Center";

  mainContent.innerHTML = `
    <div class="admin-layout reveal visible">
      <div class="dashboard-widgets">
        <div class="glass-card stat-card">
          <h4>Total Revenue</h4>
          <h2 id="admin-revenue" class="gradient-text-blue">$0</h2>
          <p class="stat-meta">Lifetime Earnings</p>
        </div>
        <div class="glass-card stat-card">
          <h4>Availability</h4>
          <h2 id="admin-spots-avail" class="gradient-text-purple">0</h2>
          <p class="stat-meta">Free / 50 Total</p>
        </div>
        <div class="glass-card stat-card">
          <h4>Daily Traffic</h4>
          <h2 id="admin-checkins" class="gradient-text-pink">0</h2>
          <p class="stat-meta">Check-ins Today</p>
        </div>
      </div>

      <div class="admin-visuals-row mt-8">
        <div class="glass-card chart-container">
          <div class="card-header"><h3>Occupancy Distribution</h3></div>
          <div class="chart-wrapper"><canvas id="adminOccupancyChart"></canvas></div>
        </div>
        <div class="glass-card mini-grid-container">
          <div class="card-header"><h3>Live Facility Monitor</h3></div>
          <div id="admin-parking-grid" class="parking-grid admin-mini-grid"></div>
        </div>
      </div>

      <div class="glass-card activity-container mt-8">
        <div class="card-header"><h3>Facility Event Log</h3><p>Real-time status updates</p></div>
        <div class="table-wrapper mt-4">
          <table class="activity-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Registration</th>
                <th>Spot</th>
                <th>Booked At</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="activity-log-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  adminOccupancyChart = null;
  renderAdmin();
}

function renderAdmin() {
  const { stats, spots, recentActivity } = GlobalState;
  
  const revEl = document.getElementById('admin-revenue');
  const availEl = document.getElementById('admin-spots-avail');
  const checkinEl = document.getElementById('admin-checkins');

  if (revEl) revEl.innerText = `₹${stats.totalRevenue || 0}`;
  if (availEl) availEl.innerText = stats.availableSpots || 0;
  if (checkinEl) checkinEl.innerText = stats.dailyCheckins || 0;

  updateAdminDashboardChart(stats);

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

  const tableBody = document.getElementById('activity-log-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    recentActivity.forEach(act => {
      const row = document.createElement('tr');
      const bookedAt = new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const checkIn = act.checkInTime ? new Date(act.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const checkOut = act.endTime ? new Date(act.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      
      row.innerHTML = `
        <td>${act.user?.name || 'System'}</td>
        <td class="code-text">${act.vehicleRegistration || '--'}</td>
        <td><strong>${act.spot?.spotNumber || 'N/A'}</strong></td>
        <td>${bookedAt}</td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td><span class="badge-status ${act.status.toLowerCase()}">${act.status}</span></td>
      `;
      tableBody.appendChild(row);
    });
  }
}

function updateAdminDashboardChart(stats) {
  const canvas = document.getElementById('adminOccupancyChart');
  if (!canvas) return;
  const data = {
    labels: ['Available', 'Booked', 'Occupied'],
    datasets: [{
      data: [stats.availableSpots || 0, stats.bookedSpots || 0, stats.occupiedSpots || 0],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderColor: 'rgba(255,255,255,0.05)',
      borderWidth: 5,
      hoverOffset: 10
    }]
  };
  if (adminOccupancyChart) {
    adminOccupancyChart.data = data;
    adminOccupancyChart.update();
  } else {
    adminOccupancyChart = new Chart(canvas, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 }, padding: 20 } }
        }
      }
    });
  }
}
