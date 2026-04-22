// --- Dashboard Shell, Role Management, and Global State ---

const API_BASE_URL = '/api';
let socket;

class ParkSyncState {
  constructor() {
    this.spots = [];
    this.stats = {};
    this.recentActivity = [];
    this.myBooking = null;
    this.history = [];
    this.selectedSpotId = null;
    this.currentUser = null;
    this.token = null;
    this.currentView = null;
    this.activeTab = 'main'; 
    this.guardMode = 'checkin';
  }

  syncUI() {
    console.log(`[ParkSync] Triggering UI Sync for: ${this.currentView}`);
    try {
      if (this.currentView === 'admin' && typeof renderAdmin === 'function') renderAdmin();
      if (this.currentView === 'customer' && typeof renderCustomer === 'function') renderCustomer();
      if (this.currentView === 'guard' && typeof renderGuard === 'function') renderGuard();
    } catch (e) {
      console.error('[ParkSync] Sync Error:', e);
    }
  }
}

const GlobalState = new ParkSyncState();

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[ParkSync] Booting Terminal...');
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = '/';
    return;
  }

  GlobalState.token = token;
  GlobalState.currentUser = JSON.parse(userStr);
  GlobalState.currentView = GlobalState.currentUser.role;

  const switcher = document.getElementById('dev-role-switcher');
  if (switcher) switcher.value = GlobalState.currentView;
  
  document.getElementById('role-display').innerText = GlobalState.currentUser.role.toUpperCase();
  const avatar = document.querySelector('.avatar');
  avatar.src = `https://ui-avatars.com/api/?name=${GlobalState.currentUser.name}&background=6366f1&color=fff&bold=true`;
  
  buildSidebar(GlobalState.currentView);
  await initDashboard();
});

function switchRole(newRole) {
  GlobalState.currentView = newRole;
  GlobalState.activeTab = 'main';
  document.getElementById('role-display').innerText = newRole.toUpperCase();
  buildSidebar(newRole);
  initDashboard();
}

const ICONS = {
  dashboard: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
  grid: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
  scanner: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2z"></path><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle></svg>',
  user: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
  history: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  logout: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="17 16 21 12 17 8"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
};

function buildSidebar(role) {
  const sidebarMenu = document.getElementById('sidebar-menu');
  sidebarMenu.innerHTML = '';
  const navItems = [];
  if (role === 'admin') {
    navItems.push({ id: 'main', label: 'Analytics', icon: ICONS.dashboard });
    navItems.push({ id: 'map', label: 'Facility Map', icon: ICONS.grid });
  } else if (role === 'guard') {
    navItems.push({ id: 'main', label: 'Entry Mode', icon: ICONS.scanner, sub: 'checkin' });
    navItems.push({ id: 'main', label: 'Exit Mode', icon: ICONS.logout, sub: 'checkout' });
    navItems.push({ id: 'map', label: 'Spot Monitor', icon: ICONS.grid });
  } else {
    navItems.push({ id: 'main', label: 'Bookings', icon: ICONS.grid });
    navItems.push({ id: 'history', label: 'History', icon: ICONS.history });
    navItems.push({ id: 'profile', label: 'My Profile', icon: ICONS.user });
  }
  navItems.forEach(item => {
    const a = document.createElement('a');
    a.href = '#';
    const isActive = (GlobalState.activeTab === item.id && (!item.sub || GlobalState.guardMode === item.sub));
    a.className = `nav-item ${isActive ? 'active' : ''}`;
    a.innerHTML = `${item.icon}<span class="nav-text">${item.label}</span>`;
    a.onclick = (e) => {
      e.preventDefault();
      GlobalState.activeTab = item.id;
      if (item.sub) GlobalState.guardMode = item.sub;
      buildSidebar(GlobalState.currentView);
      initDashboard();
    };
    sidebarMenu.appendChild(a);
  });
}

async function initDashboard() {
  if (!socket && typeof io !== 'undefined') {
    try {
      socket = io();
      socket.on('connect', () => document.querySelector('.status-dot').classList.add('green'));
      socket.on('spotUpdated', () => fetchData());
    } catch (e) {
      console.warn('[ParkSync] Socket connection failed.');
    }
  }

  try {
    if (GlobalState.currentView === 'admin' && typeof initAdmin === 'function') initAdmin();
    if (GlobalState.currentView === 'customer' && typeof initCustomer === 'function') initCustomer();
    if (GlobalState.currentView === 'guard' && typeof initGuard === 'function') initGuard();
  } catch (e) {
    console.error('[ParkSync] Initialization Crash:', e);
  }

  await fetchData();
}

async function fetchData() {
  try {
    const headers = { 'Authorization': `Bearer ${GlobalState.token}` };
    
    // Fetch spots (All roles)
    const spotsRes = await fetch(`${API_BASE_URL}/bookings/spots`, { headers });
    const spotsData = await spotsRes.json();
    GlobalState.spots = spotsData.spots || [];

    if (GlobalState.currentView === 'admin') {
      const [statsRes, activityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings/stats`, { headers }),
        fetch(`${API_BASE_URL}/bookings/activity`, { headers })
      ]);
      const statsData = await statsRes.json();
      const activityData = await activityRes.json();
      GlobalState.stats = statsData;
      GlobalState.recentActivity = activityData.activity || [];
    } 
    else if (GlobalState.currentView === 'customer') {
      const [myBookingRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings/my-booking`, { headers }),
        fetch(`${API_BASE_URL}/bookings/history`, { headers })
      ]);
      const myBookingData = await myBookingRes.json();
      const historyData = await historyRes.json();
      GlobalState.myBooking = myBookingData.booking;
      GlobalState.history = historyData.history || [];
    } 
    else if (GlobalState.currentView === 'guard') {
      // Guard now uses the shared activity endpoint
      const activityRes = await fetch(`${API_BASE_URL}/bookings/activity`, { headers });
      const activityData = await activityRes.json();
      GlobalState.recentActivity = activityData.activity || [];
    }

    GlobalState.syncUI();
  } catch (err) {
    console.error('[ParkSync] Data Synchronization Failed:', err);
  }
}

async function cancelBooking(bookingId) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GlobalState.token}` },
      body: JSON.stringify({ bookingId })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    fetchData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  localStorage.clear();
  window.location.href = '/';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('global-toast');
  if (!toast) return;
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> <span>${message}</span>`;
  toast.className = `global-toast active ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.classList.add('hidden'), 500);
  }, 4000);
}
