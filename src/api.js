// ════════════════════════════════════════════════
//  JobSouqKSA — Frontend API Service Layer
//  Connects HTML frontend to Node.js backend
// ════════════════════════════════════════════════

const API_BASE = 'https://jobsouqksa-backend-production.up.railway.app/api';

// ─── Token helpers ────────────────────────────────
const getToken  = ()          => localStorage.getItem('jsq_token');
const setToken  = (t)         => localStorage.setItem('jsq_token', t);
const clearToken = ()         => localStorage.removeItem('jsq_token');
const getUser   = ()          => JSON.parse(localStorage.getItem('jsq_user') || 'null');
const setUser   = (u)         => localStorage.setItem('jsq_user', JSON.stringify(u));
const clearUser = ()          => localStorage.removeItem('jsq_user');

// ─── Base fetch wrapper ───────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'API Error');
    err.status  = res.status;
    err.data    = data;
    throw err;
  }
  return data;
}

// ─── Multipart form (file uploads) ───────────────
async function apiUpload(endpoint, formData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

// ════════════════════════════════════════════════
//  AUTH API
// ════════════════════════════════════════════════
const Auth = {
  register: async (name, email, password, role = 'jobseeker') => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });
    if (data.token) { setToken(data.token); setUser(data.user); }
    return data;
  },

  login: async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) { setToken(data.token); setUser(data.user); }
    return data;
  },

  googleLogin: async (googleToken, role = 'jobseeker') => {
    const data = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: googleToken, role })
    });
    if (data.token) { setToken(data.token); setUser(data.user); }
    return data;
  },

  logout: async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    clearToken(); clearUser();
    window.location.reload();
  },

  getMe: ()                    => apiFetch('/auth/me'),

  forgotPassword: (email)      => apiFetch('/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({ email })
  }),

  resetPassword: (token, password) => apiFetch(`/auth/reset-password/${token}`, {
    method: 'PUT', body: JSON.stringify({ password })
  }),

  changePassword: (currentPassword, newPassword) => apiFetch('/auth/change-password', {
    method: 'PUT', body: JSON.stringify({ currentPassword, newPassword })
  }),

  isLoggedIn: () => !!getToken(),
  currentUser: () => getUser()
};

// ════════════════════════════════════════════════
//  JOBS API
// ════════════════════════════════════════════════
const Jobs = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/jobs${qs ? '?' + qs : ''}`);
  },

  getById:      (id)              => apiFetch(`/jobs/${id}`),
  getMyJobs:    ()                => apiFetch('/jobs/my-jobs'),
  getRecommended: ()              => apiFetch('/jobs/recommended'),

  create: (jobData)               => apiFetch('/jobs', {
    method: 'POST', body: JSON.stringify(jobData)
  }),

  update: (id, jobData)           => apiFetch(`/jobs/${id}`, {
    method: 'PUT', body: JSON.stringify(jobData)
  }),

  delete: (id)                    => apiFetch(`/jobs/${id}`, { method: 'DELETE' }),

  toggleSave: (id)                => apiFetch(`/jobs/${id}/save`, { method: 'POST' }),

  search: (keyword, filters = {}) => Jobs.getAll({ keyword, ...filters })
};

// ════════════════════════════════════════════════
//  APPLICATIONS API
// ════════════════════════════════════════════════
const Applications = {
  apply: (jobId, coverLetter, answers = []) => apiFetch('/applications', {
    method: 'POST', body: JSON.stringify({ jobId, coverLetter, answers })
  }),

  getMy: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/applications/my${qs ? '?' + qs : ''}`);
  },

  getForJob:     (jobId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/applications/job/${jobId}${qs ? '?' + qs : ''}`);
  },

  updateStatus:  (id, status, note, interviewDate) => apiFetch(`/applications/${id}/status`, {
    method: 'PUT', body: JSON.stringify({ status, note, interviewDate })
  }),

  withdraw:      (id)             => apiFetch(`/applications/${id}/withdraw`, { method: 'DELETE' }),

  getCompanyStats: (companyId)    => apiFetch(`/applications/company/${companyId}/stats`)
};

// ════════════════════════════════════════════════
//  USERS API
// ════════════════════════════════════════════════
const Users = {
  getById: (id)                   => apiFetch(`/users/${id}`),

  search: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/users/search${qs ? '?' + qs : ''}`);
  },

  updateProfile: (profileData)    => apiFetch('/users/profile', {
    method: 'PUT', body: JSON.stringify(profileData)
  }),

  uploadAvatar: (file) => {
    const fd = new FormData(); fd.append('avatar', file);
    return apiUpload('/users/avatar', fd);
  },

  uploadResume: (file) => {
    const fd = new FormData(); fd.append('resume', file);
    return apiUpload('/users/resume', fd);
  },

  sendConnectionRequest: (userId) => apiFetch(`/users/${userId}/connect`, { method: 'POST' }),

  respondToConnection: (requestId, action) => apiFetch(`/users/connections/${requestId}`, {
    method: 'PUT', body: JSON.stringify({ action })
  })
};

// ════════════════════════════════════════════════
//  COMPANIES API
// ════════════════════════════════════════════════
const Companies = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/companies${qs ? '?' + qs : ''}`);
  },

  getById:       (id)             => apiFetch(`/companies/${id}`),

  create: (companyData)           => apiFetch('/companies', {
    method: 'POST', body: JSON.stringify(companyData)
  }),

  update: (id, companyData)       => apiFetch(`/companies/${id}`, {
    method: 'PUT', body: JSON.stringify(companyData)
  }),

  toggleFollow:  (id)             => apiFetch(`/companies/${id}/follow`, { method: 'POST' })
};

// ════════════════════════════════════════════════
//  MESSAGES API
// ════════════════════════════════════════════════
const Messages = {
  getConversations: ()            => apiFetch('/messages/conversations'),
  getMessages: (conversationId)   => apiFetch(`/messages/conversations/${conversationId}`),
  send: (recipientId, content)    => apiFetch('/messages', {
    method: 'POST', body: JSON.stringify({ recipientId, content })
  })
};

// ════════════════════════════════════════════════
//  NOTIFICATIONS API
// ════════════════════════════════════════════════
const Notifications = {
  getAll:    (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/notifications${qs ? '?' + qs : ''}`);
  },
  markRead:  (ids = [])   => apiFetch('/notifications/read', {
    method: 'PUT', body: JSON.stringify({ ids })
  })
};

// ════════════════════════════════════════════════
//  SOCKET.IO — Real-time
// ════════════════════════════════════════════════
let socket = null;

const SocketService = {
  connect: () => {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client not loaded. Add <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>');
      return null;
    }
    socket = io('http://localhost:5000');
    const user = getUser();
    if (user) socket.emit('user_online', user._id);
    return socket;
  },

  disconnect: () => { if (socket) socket.disconnect(); },

  onMessage: (cb)      => socket?.on('receive_message', cb),
  onTyping:  (cb)      => socket?.on('user_typing', cb),
  onOnlineUsers: (cb)  => socket?.on('online_users', cb),

  sendMessage: (recipientId, message) => {
    socket?.emit('send_message', { recipientId, message });
  },

  sendTyping: (recipientId) => {
    const user = getUser();
    socket?.emit('typing', { recipientId, senderId: user?._id });
  }
};

// ════════════════════════════════════════════════
//  UI STATE MANAGER
// ════════════════════════════════════════════════
const UI = {
  // Show toast notification
  toast: (message, type = 'success') => {
    const existing = document.getElementById('jsq-toast');
    if (existing) existing.remove();

    const colors = { success: '#15803d', error: '#b91c1c', info: '#0f4c81', warning: '#c47f17' };
    const t = document.createElement('div');
    t.id = 'jsq-toast';
    t.textContent = message;
    Object.assign(t.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      background: colors[type] || colors.info,
      color: '#fff', padding: '10px 18px', borderRadius: '8px',
      fontSize: '13px', zIndex: '9999', maxWidth: '280px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      transition: 'all 0.3s', opacity: '0', transform: 'translateY(10px)'
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateY(10px)';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  },

  // Show loading spinner
  loading: (show, containerId) => {
    const container = containerId ? document.getElementById(containerId) : document.body;
    const existing = container.querySelector('.jsq-spinner');
    if (show && !existing) {
      const spinner = document.createElement('div');
      spinner.className = 'jsq-spinner';
      Object.assign(spinner.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', width: '100%'
      });
      spinner.innerHTML = `
        <div style="width:32px;height:32px;border:3px solid #e8f1fb;border-top-color:#0f4c81;
                    border-radius:50%;animation:spin 0.8s linear infinite"></div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
      container.appendChild(spinner);
    } else if (!show && existing) {
      existing.remove();
    }
  },

  // Format date
  timeAgo: (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  },

  // Format salary
  formatSalary: (salary) => {
    if (!salary?.min && !salary?.max) return 'Negotiable';
    const fmt = n => n?.toLocaleString();
    const range = salary.min && salary.max
      ? `${fmt(salary.min)} – ${fmt(salary.max)}`
      : fmt(salary.min || salary.max);
    return `${salary.currency || 'SAR'} ${range} / ${salary.period || 'Month'}`;
  },

  // Render avatar initials
  initials: (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
};

// ════════════════════════════════════════════════
//  FEED RENDERER — renders posts & jobs into DOM
// ════════════════════════════════════════════════
const Feed = {
  // Render a job card into the feed
  renderJobCard: (job) => `
    <div class="post card pad" data-job-id="${job._id}">
      <div class="ph">
        <div class="pa" style="background:#0f4c81;border-radius:8px">
          ${job.company?.logo
            ? `<img src="${job.company.logo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
            : UI.initials(job.company?.name || 'Co')}
        </div>
        <div class="pm">
          <h4>${job.company?.name || 'Company'}
            ${job.company?.isVerified ? '<span style="color:#0f4c81;font-size:11px"> · ✓ Verified</span>' : ''}
          </h4>
          <p>${job.company?.industry || ''} · ${job.location?.city || ''}</p>
          <span class="pt">${UI.timeAgo(job.createdAt)}</span>
        </div>
        <div class="pbadge${job.urgent ? ' hire' : ''}">
          ${job.urgent ? 'Urgent' : job.featured ? 'Featured' : 'Job'}
        </div>
      </div>
      <div class="jbox">
        <h5>${job.title}</h5>
        <div class="jmeta">
          <span class="jtag">${job.location?.city}${job.location?.remote ? ' · Remote' : ''}</span>
          <span class="jtag">${job.jobType}</span>
          <span class="jtag">${job.experienceLevel}</span>
          ${job.salary?.isVisible ? `<span class="jtag stag">${UI.formatSalary(job.salary)}</span>` : ''}
        </div>
        <p style="font-size:12px;color:var(--muted);margin-top:7px;line-height:1.55">
          ${(job.description || '').slice(0, 150)}${job.description?.length > 150 ? '...' : ''}
        </p>
        <div style="display:flex;gap:5px;margin-top:8px">
          <button class="abtn${job.hasApplied ? ' applied' : ''}"
            onclick="handleApply('${job._id}', this)"
            style="flex:1;${job.hasApplied ? 'background:#15803d' : ''}">
            ${job.hasApplied ? '✓ Applied' : 'Apply Now'}
          </button>
          <button onclick="handleSaveJob('${job._id}', this)"
            style="background:none;border:0.5px solid var(--border);border-radius:6px;padding:8px 12px;
                   font-size:12px;cursor:pointer;color:${job.isSaved ? '#0f4c81' : 'var(--muted)'}">
            ${job.isSaved ? '🔖 Saved' : 'Save'}
          </button>
        </div>
      </div>
      <div class="pacts">
        <button class="acbt" onclick="UI.toast('${job.applications} applications so far')">
          👥 ${job.applications || 0} applicants
        </button>
        <button class="acbt" onclick="UI.toast('Link copied!')" style="margin-left:auto">Share</button>
      </div>
    </div>`,

  // Render job list into container
  renderJobs: async (containerId, params = {}) => {
    UI.loading(true, containerId);
    try {
      const res = await Jobs.getAll({ ...params, limit: 10 });
      const container = document.getElementById(containerId);
      if (!container) return;
      if (!res.data?.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">No jobs found</p>';
        return;
      }
      container.innerHTML = res.data.map(Feed.renderJobCard).join('');
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      UI.loading(false, containerId);
    }
  },

  // Render application list
  renderApplications: async (containerId) => {
    UI.loading(true, containerId);
    try {
      const res = await Applications.getMy();
      const container = document.getElementById(containerId);
      if (!container) return;
      if (!res.data?.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">No applications yet</p>';
        return;
      }
      const statusColors = {
        pending:     { bg: '#fef9ee', color: '#854f0b' },
        reviewed:    { bg: '#e8f1fb', color: '#0c447c' },
        shortlisted: { bg: '#f0fdf4', color: '#166534' },
        interview:   { bg: '#f0fdf4', color: '#166534' },
        offer:       { bg: '#f0fdf4', color: '#15803d' },
        rejected:    { bg: '#fee2e2', color: '#b91c1c' },
        withdrawn:   { bg: '#f3f4f6', color: '#6b7280' }
      };
      container.innerHTML = res.data.map(app => {
        const sc = statusColors[app.status] || statusColors.pending;
        return `
          <div class="appitem" style="margin-bottom:8px">
            <div class="appava" style="background:#0f4c81">${UI.initials(app.job?.company?.name)}</div>
            <div class="appinfo">
              <h5>${app.job?.title || 'Job'}</h5>
              <p>${app.job?.company?.name || ''} · ${UI.timeAgo(app.createdAt)}</p>
            </div>
            <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <span style="background:${sc.bg};color:${sc.color};font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500">
                ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </span>
              ${app.status === 'pending' ? `<button onclick="handleWithdraw('${app._id}',this)" style="font-size:10px;color:var(--muted);background:none;border:none;cursor:pointer">Withdraw</button>` : ''}
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      UI.loading(false, containerId);
    }
  },

  // Render notifications
  renderNotifications: async (containerId) => {
    try {
      const res = await Notifications.getAll({ limit: 20 });
      const container = document.getElementById(containerId);
      if (!container) return;
      if (!res.data?.length) {
        container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">No notifications</p>';
        return;
      }
      container.innerHTML = res.data.map(n => `
        <div style="display:flex;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);
                    opacity:${n.isRead ? 0.7 : 1};cursor:pointer"
             onclick="Notifications.markRead(['${n._id}'])">
          <div style="width:8px;height:8px;border-radius:50%;background:${n.isRead ? 'transparent' : '#0f4c81'};
                      flex:none;margin-top:5px"></div>
          <div>
            <div style="font-size:12px;font-weight:${n.isRead ? 400 : 600}">${n.title}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${n.body}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${UI.timeAgo(n.createdAt)}</div>
          </div>
        </div>`).join('');
    } catch (err) {
      console.error('Notifications error:', err);
    }
  }
};

// ════════════════════════════════════════════════
//  EVENT HANDLERS — called from HTML onclick
// ════════════════════════════════════════════════

// Handle sign in form
async function handleSignIn(e) {
  if (e) e.preventDefault();
  const email    = document.getElementById('w-email')?.value;
  const password = document.getElementById('w-pass')?.value;
  if (!email || !password) return UI.toast('Please enter email and password', 'error');

  const btn = document.getElementById('w-sibtn');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }

  try {
    const res = await Auth.login(email, password);
    UI.toast(`Welcome back, ${res.user.name}!`, 'success');
    setTimeout(() => showPage('feed'), 800);
    updateNavForUser(res.user);
  } catch (err) {
    UI.toast(err.message, 'error');
  } finally {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
  }
}

// Handle register form
async function handleRegister(e) {
  if (e) e.preventDefault();
  const name     = document.getElementById('w-rname')?.value;
  const email    = document.getElementById('w-remail')?.value;
  const password = document.getElementById('w-rpass')?.value;
  const role     = document.querySelector('.role-opt.on')?.dataset?.role || 'jobseeker';

  if (!name || !email || !password) return UI.toast('Please fill all fields', 'error');
  if (password.length < 6) return UI.toast('Password must be at least 6 characters', 'error');

  const btn = document.getElementById('w-regbtn');
  if (btn) { btn.textContent = 'Creating account...'; btn.disabled = true; }

  try {
    const res = await Auth.register(name, email, password, role);
    UI.toast(`Welcome to JobSouqKSA, ${res.user.name}!`, 'success');
    setTimeout(() => showPage('feed'), 800);
    updateNavForUser(res.user);
  } catch (err) {
    UI.toast(err.message, 'error');
  } finally {
    if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
  }
}

// Handle Google login
async function handleGoogleLogin(googleToken) {
  try {
    const role = document.querySelector('.role-opt.on')?.dataset?.role || 'jobseeker';
    const res  = await Auth.googleLogin(googleToken, role);
    UI.toast(`Welcome, ${res.user.name}!`);
    updateNavForUser(res.user);
    showPage('feed');
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// Handle Apply button
async function handleApply(jobId, btn) {
  if (!Auth.isLoggedIn()) {
    UI.toast('Please sign in to apply', 'info');
    return showPage('login');
  }
  if (btn?.classList.contains('applied')) return UI.toast('Already applied!', 'info');

  // Simple apply (no cover letter modal for now)
  try {
    btn.textContent = 'Applying...';
    btn.disabled    = true;
    await Applications.apply(jobId, '');
    btn.textContent = '✓ Applied';
    btn.style.background = '#15803d';
    btn.classList.add('applied');
    UI.toast('Application submitted successfully!', 'success');
  } catch (err) {
    UI.toast(err.message, 'error');
    btn.textContent = 'Apply Now';
    btn.disabled    = false;
  }
}

// Handle Save Job
async function handleSaveJob(jobId, btn) {
  if (!Auth.isLoggedIn()) {
    UI.toast('Please sign in to save jobs', 'info');
    return showPage('login');
  }
  try {
    const res = await Jobs.toggleSave(jobId);
    btn.textContent   = res.saved ? '🔖 Saved' : 'Save';
    btn.style.color   = res.saved ? '#0f4c81' : 'var(--muted)';
    UI.toast(res.message);
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// Handle Withdraw Application
async function handleWithdraw(applicationId, btn) {
  if (!confirm('Withdraw this application?')) return;
  try {
    await Applications.withdraw(applicationId);
    btn.closest('.appitem')?.remove();
    UI.toast('Application withdrawn');
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// Handle application status update (company dashboard)
async function handleStatusUpdate(applicationId, status) {
  try {
    await Applications.updateStatus(applicationId, status);
    UI.toast(`Application ${status}`, 'success');
    // Refresh dashboard
    const companyId = getUser()?.companyId;
    if (companyId) loadDashboard(companyId);
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// Handle Follow Company
async function handleFollowCompany(companyId, btn) {
  if (!Auth.isLoggedIn()) {
    UI.toast('Please sign in to follow companies', 'info');
    return showPage('login');
  }
  try {
    const res = await Companies.toggleFollow(companyId);
    btn.textContent  = res.following ? 'Following' : 'Follow';
    btn.classList.toggle('fw', res.following);
    UI.toast(res.message);
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// Handle Profile Update
async function handleProfileUpdate(formData) {
  try {
    const res = await Users.updateProfile(formData);
    setUser(res.data);
    UI.toast('Profile updated successfully!', 'success');
    return res;
  } catch (err) {
    UI.toast(err.message, 'error');
    throw err;
  }
}

// Handle Job Search
async function handleSearch(e) {
  if (e) e.preventDefault();
  const keyword    = document.querySelector('.nsearch input')?.value || '';
  const feedEl     = document.getElementById('job-feed') || document.querySelector('.feed');
  if (feedEl) await Feed.renderJobs(feedEl.id, { keyword });
}

// Handle forgot password
async function handleForgotPassword(email) {
  try {
    await Auth.forgotPassword(email);
    UI.toast('Reset email sent! Check your inbox.', 'success');
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════
//  DASHBOARD LOADER
// ════════════════════════════════════════════════
async function loadDashboard(companyId) {
  try {
    const [statsRes, jobsRes] = await Promise.all([
      Applications.getCompanyStats(companyId),
      Jobs.getMyJobs()
    ]);

    // Update stat cards
    const stats = statsRes.data;
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('stat-total-apps',  stats.totalApps);
    setEl('stat-active-jobs', stats.activeJobs);
    setEl('stat-shortlisted', stats.shortlisted);
    setEl('stat-hired',       stats.hired);

    // Render jobs table
    const tbody = document.querySelector('.jtable tbody');
    if (tbody && jobsRes.data) {
      tbody.innerHTML = jobsRes.data.map(job => `
        <tr>
          <td style="font-weight:500">${job.title}</td>
          <td style="color:var(--muted)">${job.location?.city}</td>
          <td>${job.applicationCount || job.applications || 0}</td>
          <td><span class="jstatus js-${job.status === 'active' ? 'a' : job.status === 'paused' ? 'p' : 'c'}">
            ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span></td>
          <td>
            <button class="act-btn" onclick="loadJobApplications('${job._id}')">View Apps</button>
            <button class="act-btn" onclick="toggleJobStatus('${job._id}', '${job.status}')" style="margin-left:4px">
              ${job.status === 'active' ? 'Pause' : 'Activate'}
            </button>
          </td>
        </tr>`).join('');
    }
  } catch (err) {
    UI.toast('Failed to load dashboard: ' + err.message, 'error');
  }
}

async function loadJobApplications(jobId) {
  try {
    const res = await Applications.getForJob(jobId, { limit: 20 });
    const container = document.querySelector('.applist');
    if (!container) return;
    if (!res.data?.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:10px">No applications yet</p>';
      return;
    }
    container.innerHTML = res.data.map(app => `
      <div class="appitem">
        <div class="appava" style="background:#0f4c81">${UI.initials(app.applicant?.name)}</div>
        <div class="appinfo">
          <h5>${app.applicant?.name || 'Applicant'}</h5>
          <p>${app.applicant?.headline || ''} · ${UI.timeAgo(app.createdAt)}</p>
        </div>
        <div class="app-acts">
          <button class="abt abt-y" onclick="handleStatusUpdate('${app._id}','shortlisted')">Shortlist</button>
          <button class="abt abt-n" onclick="handleStatusUpdate('${app._id}','rejected')">Reject</button>
        </div>
      </div>`).join('');
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

async function toggleJobStatus(jobId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  try {
    await Jobs.update(jobId, { status: newStatus });
    UI.toast(`Job ${newStatus}`, 'success');
    const user = getUser();
    if (user?.companyId) loadDashboard(user.companyId);
  } catch (err) {
    UI.toast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════
//  PROFILE LOADER
// ════════════════════════════════════════════════
async function loadProfile(userId) {
  try {
    const res = userId ? await Users.getById(userId) : await Auth.getMe();
    const user = res.user || res.data;
    if (!user) return;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    setEl('w-pname',  user.name);
    setEl('w-prole',  user.headline);
    setEl('w-ploc',   `${user.location?.city || ''}, ${user.location?.country || 'Saudi Arabia'}`);
    setEl('w-pconn',  user.connections?.length || 0);

    // Render skills
    const skillsEl = document.querySelector('.sec .skill-pill')?.parentElement;
    if (skillsEl && user.skills?.length) {
      skillsEl.innerHTML = user.skills
        .map(s => `<span class="skill-pill">${s.name}</span>`).join('');
    }

    // Render experience
    const expEl = document.querySelectorAll('.exp-item');
    if (expEl.length && user.experience?.length) {
      user.experience.slice(0, 3).forEach((exp, i) => {
        if (expEl[i]) {
          expEl[i].querySelector('h5').textContent = `${exp.title} — ${exp.company}`;
          expEl[i].querySelector('p').textContent =
            `${new Date(exp.startDate).getFullYear()} – ${exp.current ? 'Present' : new Date(exp.endDate).getFullYear()} · ${exp.location || ''}`;
        }
      });
    }
  } catch (err) {
    console.error('Profile load error:', err);
  }
}

// ════════════════════════════════════════════════
//  NAV UPDATE ON LOGIN
// ════════════════════════════════════════════════
function updateNavForUser(user) {
  if (!user) return;
  const ava = document.querySelector('.nava');
  if (ava) ava.textContent = UI.initials(user.name);

  // Update sidebar profile
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('w-uname', user.name);
  setEl('w-urole', `${user.headline || user.role} · ${user.location?.city || 'Saudi Arabia'}`);
}

// ════════════════════════════════════════════════
//  APP INIT — runs on page load
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Restore session
  if (Auth.isLoggedIn()) {
    try {
      const res = await Auth.getMe();
      setUser(res.user);
      updateNavForUser(res.user);
    } catch {
      clearToken(); clearUser();
    }
  }

  // Load feed jobs
  const feedContainer = document.querySelector('.feed');
  if (feedContainer && !feedContainer.id) feedContainer.id = 'main-feed';
  if (document.getElementById('p-feed')?.classList.contains('on')) {
    await Feed.renderJobs('main-feed');
  }

  // Connect socket if logged in
  if (Auth.isLoggedIn()) {
    SocketService.connect();
    SocketService.onMessage(msg => {
      UI.toast(`New message from ${msg.sender?.name || 'Someone'}`, 'info');
    });
  }

  // Wire up sign in form
  const siForm = document.getElementById('si-form');
  if (siForm) {
    const sibtn = document.getElementById('w-sibtn');
    if (sibtn) sibtn.onclick = handleSignIn;
  }

  // Wire up register form
  const regbtn = document.getElementById('w-regbtn');
  if (regbtn) regbtn.onclick = handleRegister;

  // Wire up search
  const searchInput = document.querySelector('.nsearch input');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(e); });
  }

  // Google Sign-In button (if google SDK loaded)
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: 'YOUR_GOOGLE_CLIENT_ID',
      callback: (response) => handleGoogleLogin(response.credential)
    });
    const googleBtns = document.querySelectorAll('#w-google, #w-google-app');
    googleBtns.forEach(btn => {
      btn.onclick = () => google.accounts.id.prompt();
    });
  }
});

// Expose to global scope for HTML onclick usage
window.Auth           = Auth;
window.Jobs           = Jobs;
window.Applications   = Applications;
window.Users          = Users;
window.Companies      = Companies;
window.Messages       = Messages;
window.Notifications  = Notifications;
window.UI             = UI;
window.Feed           = Feed;
window.SocketService  = SocketService;
window.handleApply    = handleApply;
window.handleSaveJob  = handleSaveJob;
window.handleWithdraw = handleWithdraw;
window.handleStatusUpdate   = handleStatusUpdate;
window.handleFollowCompany  = handleFollowCompany;
window.handleProfileUpdate  = handleProfileUpdate;
window.handleSearch         = handleSearch;
window.handleForgotPassword = handleForgotPassword;
window.handleSignIn         = handleSignIn;
window.handleRegister       = handleRegister;
window.loadDashboard        = loadDashboard;
window.loadJobApplications  = loadJobApplications;
window.toggleJobStatus      = toggleJobStatus;
window.loadProfile          = loadProfile;
