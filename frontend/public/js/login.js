// --- Premium Auth & Real-Time Redirection ---

const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.querySelector('.toggle-slider');
  const btns = document.querySelectorAll('.toggle-btn');
  const forms = document.querySelectorAll('.role-form');

  btns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      slider.style.transform = `translateX(${index * 100}%)`;
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const selectedRole = btn.getAttribute('data-role');
      forms.forEach(form => {
        if (form.id === `form-${selectedRole}`) {
          form.classList.add('active');
        } else {
          form.classList.remove('active');
        }
      });
    });
  });
});

async function handleLogin(event, role) {
  event.preventDefault();
  
  const email = document.getElementById(`${role}-email`).value;
  const password = document.getElementById(`${role}-password`).value;
  const btn = event.target.querySelector('button[type="submit"]');
  const originalText = btn.innerText;
  
  // UI Feedback: Loading state
  btn.disabled = true;
  btn.innerText = "Authenticating Spot...";
  btn.style.opacity = "0.7";

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Access Denied');
    }

    // Success: Store and Redirect
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    btn.innerText = "Access Granted";
    btn.style.background = "#10b981"; // Success Green

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);

  } catch (err) {
    // Error Handling: Reset UI and notify user
    btn.innerText = err.message;
    btn.style.background = "#ef4444"; // Error Red
    
    setTimeout(() => {
      btn.disabled = false;
      btn.innerText = originalText;
      btn.style.background = ""; // Reset to original gradient
      btn.style.opacity = "1";
    }, 2000);
  }
}
