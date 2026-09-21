// ============================================================
//  admin.js — Admin Panel Frontend Logic
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    window.location.href = 'admin-login.html';
    return;
  }
  
  let allUsers = [];
  let allSkills = [];
  let allRequests = [];

  // --- Sidebar Navigation ---
  const navItems = document.querySelectorAll('.sidebar-nav li');
  const sections = document.querySelectorAll('.section-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      // Load data based on section
      if (targetId === 'dashboard') loadStats();
      if (targetId === 'users') loadUsers();
      if (targetId === 'skills') loadSkills();
      if (targetId === 'requests') loadRequests();
      if (targetId === 'matches') loadMatches();
    });
  });

  // --- Logout ---
  document.getElementById('btn-admin-logout').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
  });

  // --- API Fetch Helper ---
  async function adminFetch(url, options = {}) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(`/api/admin${url}`, options);
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = 'admin-login.html';
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  // --- Load Dashboard Stats ---
  async function loadStats() {
    try {
      const data = await adminFetch('/stats');
      if (data.success) {
        const { totalUsers, totalSkills, activeRequests, completedExchanges } = data.stats;
        
        document.getElementById('admin-stats-row').innerHTML = `
          <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${totalUsers}</div><div class="stat-label">Total Users</div></div>
          <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${totalSkills}</div><div class="stat-label">Total Skills</div></div>
          <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${activeRequests}</div><div class="stat-label">Active Requests</div></div>
          <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${completedExchanges}</div><div class="stat-label">Completed</div></div>
        `;

        renderChart(data.stats);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load stats', 'error');
    }
  }

  let chartInstance = null;
  function renderChart(stats) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Users', 'Total Skills', 'Active Requests', 'Completed Exchanges'],
        datasets: [{
          label: 'Platform Metrics',
          data: [stats.totalUsers, stats.totalSkills, stats.activeRequests, stats.completedExchanges],
          backgroundColor: [
            'rgba(139, 92, 246, 0.5)',
            'rgba(6, 182, 212, 0.5)',
            'rgba(245, 158, 11, 0.5)',
            'rgba(16, 185, 129, 0.5)'
          ],
          borderColor: [
            'rgba(139, 92, 246, 1)',
            'rgba(6, 182, 212, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(16, 185, 129, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- Load Users ---
  window.loadUsers = async function() {
    try {
      const data = await adminFetch('/users');
      if (data.success) {
        allUsers = data.users;
        applyUserFilters();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = users.map(u => {
      const skills = [u.offered_skills, u.wanted_skills].filter(Boolean).join(', ') || 'None';
      return `
        <tr>
          <td>#${u.user_id}</td>
          <td>${u.name} ${u.is_reported ? '<span class="badge badge-red">Reported</span>' : ''}</td>
          <td>${u.email}</td>
          <td>${u.credits}</td>
          <td><span style="font-size: 0.8rem; color: #a1a1aa;">${skills}</span></td>
          <td>
            <select class="status-select" onchange="updateUserStatus(${u.user_id}, this.value)">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspended</option>
              <option value="banned" ${u.status === 'banned' ? 'selected' : ''}>Banned</option>
            </select>
          </td>
          <td>
            <button class="action-btn" style="color:#ef4444;" onclick="deleteUser(${u.user_id})">Delete</button>
          </td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="7" style="text-align:center;">No users found.</td></tr>';
  }

  function applyUserFilters() {
    let filtered = [...allUsers];
    const term = (document.getElementById('user-search').value || '').toLowerCase();
    
    // Filter
    if (term) {
      filtered = filtered.filter(u => {
        const matchName = u.name.toLowerCase().includes(term);
        const matchEmail = u.email.toLowerCase().includes(term);
        const matchStatus = u.status.toLowerCase().includes(term);
        const matchRating = u.rating && u.rating.toString().includes(term);
        const matchSkills = (u.offered_skills || '').toLowerCase().includes(term) || (u.wanted_skills || '').toLowerCase().includes(term);
        return matchName || matchEmail || matchStatus || matchRating || matchSkills;
      });
    }

    // Sort
    const sortVal = document.getElementById('user-sort').value || 'id-asc';
    filtered.sort((a, b) => {
      if (sortVal === 'id-asc') return a.user_id - b.user_id;
      if (sortVal === 'id-desc') return b.user_id - a.user_id;
      if (sortVal === 'name-asc') return a.name.localeCompare(b.name);
      if (sortVal === 'name-desc') return b.name.localeCompare(a.name);
      if (sortVal === 'credits-asc') return a.credits - b.credits;
      if (sortVal === 'credits-desc') return b.credits - a.credits;
      return 0;
    });

    renderUsers(filtered);
  }

  // --- Search Users ---
  document.getElementById('user-search').addEventListener('input', applyUserFilters);
  document.getElementById('user-sort').addEventListener('change', applyUserFilters);

  window.updateUserStatus = async function(id, status) {
    try {
      const data = await adminFetch(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      if (data.success) showToast(data.message, 'success');
    } catch (err) { showToast('Error updating status', 'error'); }
  }

  window.deleteUser = async function(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const data = await adminFetch(`/users/${id}`, { method: 'DELETE' });
      if (data.success) {
        showToast(data.message, 'success');
        loadUsers();
      }
    } catch (err) { showToast('Error deleting user', 'error'); }
  }

  // --- Load Skills ---
  window.loadSkills = async function() {
    try {
      const data = await adminFetch('/skills');
      if (data.success) {
        allSkills = data.skills;
        applySkillFilters();
      }
    } catch (err) { console.error(err); }
  }

  function applySkillFilters() {
    let sorted = [...allSkills];
    const sortVal = document.getElementById('skill-sort').value || 'id-asc';
    
    sorted.sort((a, b) => {
      if (sortVal === 'id-asc') return a.skill_id - b.skill_id;
      if (sortVal === 'id-desc') return b.skill_id - a.skill_id;
      if (sortVal === 'name-asc') return a.skill_name.localeCompare(b.skill_name);
      if (sortVal === 'name-desc') return b.skill_name.localeCompare(a.skill_name);
      if (sortVal === 'category-asc') return a.category.localeCompare(b.category);
      if (sortVal === 'category-desc') return b.category.localeCompare(a.category);
      return 0;
    });

    renderSkills(sorted);
  }

  document.getElementById('skill-sort').addEventListener('change', applySkillFilters);

  function renderSkills(skills) {
    const tbody = document.getElementById('skills-tbody');
    tbody.innerHTML = skills.map(s => `
          <tr>
            <td>#${s.skill_id}</td>
            <td>${s.skill_name}</td>
            <td>${s.category}</td>
            <td>
              <select class="status-select" onchange="updateSkillStatus(${s.skill_id}, this.value)">
                <option value="approved" ${s.status === 'approved' ? 'selected' : ''}>Approved</option>
                <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>Rejected/Fake</option>
              </select>
            </td>
            <td>
              <button class="action-btn" style="color:#ef4444;" onclick="deleteSkill(${s.skill_id})">Delete</button>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No skills found.</td></tr>';
  }

  window.updateSkillStatus = async function(id, status) {
    try {
      const data = await adminFetch(`/skills/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      if (data.success) showToast(data.message, 'success');
    } catch (err) { showToast('Error updating skill', 'error'); }
  }

  window.deleteSkill = async function(id) {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    try {
      const data = await adminFetch(`/skills/${id}`, { method: 'DELETE' });
      if (data.success) {
        showToast(data.message, 'success');
        loadSkills();
      }
    } catch (err) { showToast('Error deleting skill', 'error'); }
  }

  // --- Load Requests ---
  window.loadRequests = async function() {
    try {
      const data = await adminFetch('/requests');
      if (data.success) {
        allRequests = data.requests;
        applyRequestFilters();
      }
    } catch (err) { console.error(err); }
  }

  function applyRequestFilters() {
    let sorted = [...allRequests];
    const sortVal = document.getElementById('request-sort').value || 'date-desc';
    
    sorted.sort((a, b) => {
      if (sortVal === 'id-asc') return a.request_id - b.request_id;
      if (sortVal === 'id-desc') return b.request_id - a.request_id;
      if (sortVal === 'date-asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortVal === 'date-desc') return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

    renderRequests(sorted);
  }

  document.getElementById('request-sort').addEventListener('change', applyRequestFilters);

  function renderRequests(requests) {
    const tbody = document.getElementById('requests-tbody');
    tbody.innerHTML = requests.map(r => `
          <tr>
            <td>#${r.request_id}</td>
            <td>${r.sender_name}</td>
            <td>${r.receiver_name}</td>
            <td><span class="badge badge-purple">${r.skill_offered}</span></td>
            <td><span class="badge badge-cyan">${r.skill_requested}</span></td>
            <td>${getStatusBadge(r.status)}</td>
            <td>${new Date(r.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center;">No requests found.</td></tr>';
  }

  function getStatusBadge(status) {
    const colors = { pending: 'amber', accepted: 'cyan', completed: 'green', rejected: 'red' };
    return `<span class="badge badge-${colors[status] || 'purple'}">${status}</span>`;
  }

  // --- Load Matches ---
  window.loadMatches = async function() {
    try {
      const data = await adminFetch('/matches');
      if (data.success) {
        const tbody = document.getElementById('matches-tbody');
        tbody.innerHTML = data.matches.map(m => `
          <tr>
            <td><strong>${m.user1_name}</strong></td>
            <td><span class="badge badge-purple">${m.user1_offers}</span></td>
            <td><strong>${m.user2_name}</strong></td>
            <td><span class="badge badge-cyan">${m.user2_offers}</span></td>
          </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">No mutual matches found.</td></tr>';
      }
    } catch (err) { console.error(err); }
  }

  // --- Modals ---
  const userModal = document.getElementById('add-user-modal');
  const skillModal = document.getElementById('add-skill-modal');

  document.getElementById('btn-open-add-user').addEventListener('click', () => { userModal.classList.add('open'); });
  document.getElementById('close-user-modal').addEventListener('click', () => { userModal.classList.remove('open'); });
  
  document.getElementById('btn-open-add-skill').addEventListener('click', () => { skillModal.classList.add('open'); });
  document.getElementById('close-skill-modal').addEventListener('click', () => { skillModal.classList.remove('open'); });

  // Add User Form
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-user-name').value;
    const email = document.getElementById('add-user-email').value;
    const password = document.getElementById('add-user-password').value;
    
    try {
      const data = await adminFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      if (data.success) {
        showToast('User created successfully', 'success');
        userModal.classList.remove('open');
        document.getElementById('add-user-form').reset();
        loadUsers();
        loadStats();
      } else {
        showToast(data.message || 'Failed to create user', 'error');
      }
    } catch (err) {
      showToast('Error creating user', 'error');
    }
  });

  // Add Skill Form
  document.getElementById('add-skill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const skill_name = document.getElementById('add-skill-name').value;
    const category = document.getElementById('add-skill-category').value;
    
    try {
      const data = await adminFetch('/skills', {
        method: 'POST',
        body: JSON.stringify({ skill_name, category })
      });
      if (data.success) {
        showToast('Skill added successfully', 'success');
        skillModal.classList.remove('open');
        document.getElementById('add-skill-form').reset();
        loadSkills();
        loadStats();
      } else {
        showToast(data.message || 'Failed to add skill', 'error');
      }
    } catch (err) {
      showToast('Error adding skill', 'error');
    }
  });

  // Initialize
  loadStats();
});
