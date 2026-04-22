// --- Dashboard Shell & Role Management ---

const API_BASE_URL = 'http://localhost:5001/api';
let socket;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = 'index.html';
    return;
  }

  const user = JSON.parse(userStr);
  
  // Update Topbar Info
  document.getElementById('role-display').innerText = user.role.toUpperCase();
  const avatar = document.querySelector('.avatar');
  avatar.src = `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff&bold=true`;
  
  // Initialize Role-Specific View
  initDashboard(user, token);
});

async function initDashboard(user, token) {
  // Connect Socket.io
  socket = io('http://localhost:5001');

  socket.on('connect', () => {
    console.log('Connected to ParkSync Socket');
    document.querySelector('.status-dot').style.background = '#10b981';
    document.querySelector('.status-dot').style.boxShadow = '0 0 10px #10b981';
  });

  socket.on('disconnect', () => {
    document.querySelector('.status-dot').style.background = '#64748b';
    document.querySelector('.status-dot').style.boxShadow = 'none';
  });

  // Handle Role Routing
  if (user.role === 'customer') {
    if (typeof initCustomer === 'function') {
      initCustomer(user, token, socket);
    }
  } else if (user.role === 'guard') {
    if (typeof initGuard === 'function') {
      initGuard(user, token, socket);
    }
  } else if (user.role === 'admin') {
    if (typeof initAdmin === 'function') {
      initAdmin(user, token, socket);
    }
  }
}

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}
