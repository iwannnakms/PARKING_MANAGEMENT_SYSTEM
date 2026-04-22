// --- Authentication & UI Logic ---

const API_BASE_URL = 'http://localhost:5001/api';

// Toggle Auth Modal
function toggleAuthModal() {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.toggle('hidden');
}

// Switch between Login and Sign Up forms
function showAuthForm(type) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const toggleBg = document.getElementById('toggle-bg');
  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');

  if (type === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    toggleBg.style.left = '6px';
    btnLogin.classList.add('active');
    btnSignup.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    toggleBg.style.left = 'calc(50% + 0px)';
    btnLogin.classList.remove('active');
    btnSignup.classList.add('active');
  }
}

// Handle Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  
  errorEl.innerText = '';
  const submitBtn = e.target.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Authenticating...';

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Success: Store Token and User info
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect based on role
    window.location.href = 'dashboard.html';

  } catch (err) {
    errorEl.innerText = err.message;
    submitBtn.disabled = false;
    submitBtn.innerText = 'Sign In →';
  }
});

// Handle Sign Up
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const errorEl = document.getElementById('signup-error');
  
  errorEl.innerText = '';
  const submitBtn = e.target.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Creating Account...';

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Successfully registered, auto-switch to login
    alert('Registration successful! You can now log in.');
    showAuthForm('login');
    document.getElementById('login-email').value = email;
    
    submitBtn.disabled = false;
    submitBtn.innerText = 'Register →';

  } catch (err) {
    errorEl.innerText = err.message;
    submitBtn.disabled = false;
    submitBtn.innerText = 'Register →';
  }
});
