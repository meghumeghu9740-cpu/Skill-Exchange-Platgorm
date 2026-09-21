// ============================================================
//  app.js — Shared Frontend Utilities
//  Included on every page. Handles:
//  - API communication with auth token
//  - Token/user session management
//  - Toast notifications
//  - Auth guard (redirects to login if not authenticated)
//  - Navigation highlighting
// ============================================================

const API_BASE = 'http://localhost:3000/api';

// ============================================================
// Token & Session Management
// ============================================================

function saveSession(token, user) {
  localStorage.setItem('se_token', token);
  localStorage.setItem('se_user', JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem('se_token');
}

function getUser() {
  const raw = localStorage.getItem('se_user');
  return raw ? JSON.parse(raw) : null;
}

function updateUserCredits(newCredits) {
  const user = getUser();
  if (user) {
    user.credits = newCredits;
    localStorage.setItem('se_user', JSON.stringify(user));
  }
}

function logout() {
  localStorage.removeItem('se_token');
  localStorage.removeItem('se_user');
  window.location.href = 'index.html';
}

/**
 * Call on protected pages to redirect guests to login.
 * Returns the user object if authenticated.
 */
function requireAuth() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// ============================================================
// API Helpers
// ============================================================

/**
 * Fetch wrapper that automatically attaches the JWT token.
 * @param {string} endpoint  - e.g. '/match-users'
 * @param {object} options   - standard fetch options
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Auto-logout on 401
  if (response.status === 401) {
    showToast('Session expired. Please log in again.', 'warning');
    setTimeout(logout, 1500);
    return null;
  }

  return response;
}

/**
 * Convenience: POST JSON to a protected endpoint.
 */
async function apiPost(endpoint, body) {
  const res = await fetchWithAuth(endpoint, {
    method:  'POST',
    body:    JSON.stringify(body)
  });
  if (!res) return null;
  return res.json();
}

/**
 * Convenience: GET from a protected endpoint.
 */
async function apiGet(endpoint) {
  const res = await fetchWithAuth(endpoint);
  if (!res) return null;
  return res.json();
}

/**
 * Convenience: DELETE from a protected endpoint.
 */
async function apiDelete(endpoint) {
  const res = await fetchWithAuth(endpoint, { method: 'DELETE' });
  if (!res) return null;
  return res.json();
}

// ============================================================
// Toast Notifications
// ============================================================

function ensureToastContainer() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration  ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = ensureToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutToast 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// Star Rating Renderer
// ============================================================

function renderStars(rating, max = 5) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = max - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ============================================================
// Navigation: Highlight Active Link & Populate User Info
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // Populate credits badge in navbar
  const user = getUser();
  const creditsBadge = document.getElementById('nav-credits');
  if (creditsBadge && user) {
    creditsBadge.textContent = `💰 ${user.credits} credits`;
  }

  const navName = document.getElementById('nav-username');
  if (navName && user) {
    navName.textContent = user.name;
  }

  // Wire logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});

// ============================================================
// Tabs Helper
// ============================================================

function initTabs(tabsSelector, contentsSelector) {
  const tabs     = document.querySelectorAll(tabsSelector);
  const contents = document.querySelectorAll(contentsSelector);

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      contents[i].classList.add('active');
    });
  });
}

// ============================================================
// Modal Helper
// ============================================================

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
