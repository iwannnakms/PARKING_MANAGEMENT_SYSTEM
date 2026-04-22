// --- UI and Routing Logic ---

function showView(viewId) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Toggle dark mode background exclusively for admin view
  if (viewId === 'view-admin') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function switchAuthTab(tab) {
  // Reset tabs and forms
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById('auth-error').innerText = ''; // clear errors
  
  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('register-form').classList.add('active');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showView('view-auth');
}

function closeModal() {
  document.getElementById('booking-modal').classList.add('hidden');
  document.getElementById('booking-error').innerText = '';
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.add('hidden');
  // Clear the generated QR to prevent duplicates next time
  document.getElementById('qrcode-display').innerHTML = '';
}

// Global API Base URL (Assuming frontend runs on a different port than 5000 during dev, 
// but we'll hardcode to the backend port for simplicity).
const API_BASE_URL = 'http://localhost:5001/api';

// --- Auth Handlers ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('auth-error');
  errorEl.innerText = '';

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    routeToRoleView(data.user.role);
    
  } catch (err) {
    errorEl.innerText = err.message;
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const errorEl = document.getElementById('auth-error');
  errorEl.innerText = '';

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    
    // Auto-switch to login after successful register
    switchAuthTab('login');
    document.getElementById('login-email').value = email;
    alert('Registration successful! Please login.');
    
  } catch (err) {
    errorEl.innerText = err.message;
  }
});
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      routeToRoleView(user.role);
    } catch (e) {
      logout();
    }
  } else {
    showView('view-auth');
  }
});

function routeToRoleView(role) {
  if (role === 'admin') {
    showView('view-admin');
    if (typeof initAdmin === 'function') initAdmin();
  } else if (role === 'guard') {
    showView('view-guard');
    if (typeof initGuard === 'function') initGuard();
  } else {
    showView('view-customer');
    if (typeof initCustomer === 'function') initCustomer();
  }
}
