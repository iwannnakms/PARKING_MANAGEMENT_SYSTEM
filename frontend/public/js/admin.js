// --- Admin Dashboard Logic ---

let adminSocket;
let occupancyChart = null;
let adminSpotsData = [];

async function initAdmin(user, token, socket) {
  adminSocket = socket;
  const contentArea = document.querySelector('.content-area');
  const topbarTitle = document.querySelector('.topbar-left h2');
  topbarTitle.innerText = "Command Center";

  contentArea.innerHTML = `
    <div class="admin-layout">
      <!-- Admin Analytics Widgets -->
      <div class="dashboard-widgets">
        <div class="glass-card stat-card">
          <h4>Total Revenue</h4>
          <h2 id="admin-revenue" class="gradient-text-blue">$0</h2>
          <p class="stat-meta">Real-time earnings</p>
        </div>
        <div class="glass-card stat-card">
          <h4>Current Occupancy</h4>
          <h2 id="admin-occupancy-rate" class="gradient-text-purple">0%</h2>
          <p class="stat-meta" id="occupancy-ratio">0 / 50 Spots</p>
        </div>
        <div class="glass-card stat-card">
          <h4>System Health</h4>
          <h2 class="gradient-text-pink">Active</h2>
          <p class="stat-meta">Socket.io Connected</p>
        </div>
      </div>

      <!-- Charts & Monitoring -->
      <div class="admin-grid-layout mt-8">
        <div class="glass-card chart-container">
          <div class="card-header">
            <h3>Occupancy Distribution</h3>
          </div>
          <div class="chart-wrapper">
            <canvas id="adminOccupancyChart"></canvas>
          </div>
        </div>

        <div class="glass-card grid-container">
          <div class="card-header">
            <h3>Live Grid Monitor</h3>
            <div class="grid-legend">
              <span class="legend-item"><span class="dot available"></span> Avail</span>
              <span class="legend-item"><span class="dot booked"></span> Booked</span>
              <span class="legend-item"><span class="dot occupied"></span> Occ</span>
            </div>
          </div>
          <div id="admin-parking-grid" class="admin-mini-grid">
            <!-- Mini spots injected here -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Inject Admin Styles
  injectAdminStyles();

  // Initial Data Fetch
  await fetchAdminData(token);

  // Socket Listeners
  socket.on('spotUpdated', (update) => {
    const index = adminSpotsData.findIndex(s => s._id === update.spotId);
    if (index !== -1) {
      adminSpotsData[index].status = update.status;
      renderAdminGrid();
      fetchAdminStats(token); // Refresh charts and counters
    }
  });

  renderAdminGrid();
}

async function fetchAdminData(token) {
  await fetchAdminSpots(token);
  await fetchAdminStats(token);
}

async function fetchAdminSpots(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/spots`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    adminSpotsData = data.spots;
  } catch (err) {
    console.error('Error fetching admin spots:', err);
  }
}

async function fetchAdminStats(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    // Update Text
    document.getElementById('admin-revenue').innerText = `$${data.totalRevenue}`;
    const occRate = Math.round(((data.bookedSpots + data.occupiedSpots) / data.totalSpots) * 100);
    document.getElementById('admin-occupancy-rate').innerText = `${occRate}%`;
    document.getElementById('occupancy-ratio').innerText = `${data.bookedSpots + data.occupiedSpots} / ${data.totalSpots} Spots`;

    // Update Chart
    updateAdminChart(data.availableSpots, data.bookedSpots, data.occupiedSpots);
  } catch (err) {
    console.error('Error fetching admin stats:', err);
  }
}

function renderAdminGrid() {
  const grid = document.getElementById('admin-parking-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  adminSpotsData.forEach(spot => {
    const spotDiv = document.createElement('div');
    spotDiv.className = `admin-spot ${spot.status.toLowerCase()}`;
    spotDiv.title = `${spot.spotNumber}: ${spot.status}`;
    grid.appendChild(spotDiv);
  });
}

function updateAdminChart(avail, booked, occ) {
  const ctx = document.getElementById('adminOccupancyChart');
  if (!ctx) return;

  if (occupancyChart) {
    occupancyChart.data.datasets[0].data = [avail, booked, occ];
    occupancyChart.update();
  } else {
    occupancyChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Booked', 'Occupied'],
        datasets: [{
          data: [avail, booked, occ],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderColor: 'rgba(255,255,255,0.05)',
          borderWidth: 8,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { family: 'Outfit', size: 14 }, padding: 20 }
          }
        }
      }
    });
  }
}

function injectAdminStyles() {
  if (document.getElementById('admin-styles')) return;
  const style = document.createElement('style');
  style.id = 'admin-styles';
  style.innerHTML = `
    .admin-grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .stat-meta { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .chart-wrapper { height: 300px; position: relative; }
    
    .grid-legend { display: flex; gap: 12px; }
    .legend-item { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.available { background: #10b981; }
    .dot.booked { background: #f59e0b; }
    .dot.occupied { background: #ef4444; }

    .admin-mini-grid {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 10px;
    }
    
    .admin-spot {
      aspect-ratio: 1; border-radius: 6px; 
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.3s ease;
    }
    .admin-spot.available { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); }
    .admin-spot.booked { background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); }
    .admin-spot.occupied { background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
    
    @media (max-width: 1024px) {
      .admin-grid-layout { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}
