const API_BASE_URL = 'https://taskflow-2ouk.onrender.com/api';
const state = {
  token: localStorage.getItem('taskflow_token') || '',
  user: JSON.parse(localStorage.getItem('taskflow_user') || 'null'),
  tasks: [],
  filters: {
    search: '',
    status: 'all',
    priority: 'all'
  }
};

const elements = {
  authCard: document.getElementById('authCard'),
  appCard: document.getElementById('appCard'),
  userPanel: document.getElementById('userPanel'),
  welcomeUser: document.getElementById('welcomeUser'),
  authMessage: document.getElementById('authMessage'),
  taskMessage: document.getElementById('taskMessage'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  taskForm: document.getElementById('taskForm'),
  taskModal: document.getElementById('taskModal'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskList: document.getElementById('taskList'),
  stats: document.getElementById('stats'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  logoutBtn: document.getElementById('logoutBtn'),
  newTaskBtn: document.getElementById('newTaskBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn')
};

function showMessage(target, message, isError = false) {
  target.textContent = message;
  target.style.color = isError ? '#ff8fa3' : '#ffd166';
}

function saveSession() {
  localStorage.setItem('taskflow_token', state.token);
  localStorage.setItem('taskflow_user', JSON.stringify(state.user));
}

function clearSession() {
  state.token = '';
  state.user = null;
  state.tasks = [];
  localStorage.removeItem('taskflow_token');
  localStorage.removeItem('taskflow_user');
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }

  return data;
}

function toggleView() {
  const isLoggedIn = Boolean(state.token && state.user);
  elements.authCard.classList.toggle('hidden', isLoggedIn);
  elements.appCard.classList.toggle('hidden', !isLoggedIn);
  elements.userPanel.classList.toggle('hidden', !isLoggedIn);
  elements.welcomeUser.textContent = isLoggedIn ? `Hi, ${state.user.name}` : '';

  if (isLoggedIn) {
    renderTasks();
  }
}

function renderStats() {
  const total = state.tasks.length;
  const todo = state.tasks.filter(task => task.status === 'todo').length;
  const inProgress = state.tasks.filter(task => task.status === 'in_progress').length;
  const done = state.tasks.filter(task => task.status === 'done').length;

  elements.stats.innerHTML = `
    <div class="stat"><span>Total</span><strong>${total}</strong></div>
    <div class="stat"><span>To do</span><strong>${todo}</strong></div>
    <div class="stat"><span>In progress</span><strong>${inProgress}</strong></div>
    <div class="stat"><span>Done</span><strong>${done}</strong></div>
  `;
}

function formatLabel(value) {
  return value.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function renderTasks() {
  renderStats();

  if (!state.tasks.length) {
    elements.taskList.innerHTML = '<div class="task-item"><p>No tasks yet. Create your first one and start the momentum machine.</p></div>';
    return;
  }

  elements.taskList.innerHTML = state.tasks.map(task => `
    <article class="task-item">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p>${escapeHtml(task.description || 'No description provided.')}</p>
        </div>
        <div class="task-actions">
          <button class="small-btn" data-action="edit" data-id="${task.id}">Edit</button>
          <button class="small-btn danger" data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </div>
      <div class="tag-row">
        <span class="badge ${task.priority}">${formatLabel(task.priority)}</span>
        <span class="badge ${task.status}">${formatLabel(task.status)}</span>
        <span class="badge">Due: ${task.due_date ? task.due_date : 'Not set'}</span>
      </div>
      <div class="task-actions">
        <button class="small-btn" data-action="status" data-status="todo" data-id="${task.id}">To do</button>
        <button class="small-btn" data-action="status" data-status="in_progress" data-id="${task.id}">In progress</button>
        <button class="small-btn" data-action="status" data-status="done" data-id="${task.id}">Done</button>
      </div>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadTasks() {
  const params = new URLSearchParams();
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.set(key, value);
    }
  });

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await api(`/tasks${query}`);
  state.tasks = data.tasks;
  renderTasks();
}

async function handleAuthSubmit(event, mode) {
  event.preventDefault();
  showMessage(elements.authMessage, '');
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());

  try {
    const data = await api(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    state.token = data.token;
    state.user = data.user;
    saveSession();
    toggleView();
    await loadTasks();
    event.currentTarget.reset();
  } catch (error) {
    showMessage(elements.authMessage, error.message, true);
  }
}

function openTaskModal(task = null) {
  elements.taskForm.reset();
  elements.taskForm.id.value = task?.id || '';
  elements.taskForm.title.value = task?.title || '';
  elements.taskForm.description.value = task?.description || '';
  elements.taskForm.status.value = task?.status || 'todo';
  elements.taskForm.priority.value = task?.priority || 'medium';
  elements.taskForm.due_date.value = task?.due_date || '';
  elements.taskModalTitle.textContent = task ? 'Edit task' : 'New task';
  elements.taskModal.showModal();
}

async function handleTaskSubmit(event) {
  event.preventDefault();
  showMessage(elements.taskMessage, '');
  const formData = new FormData(elements.taskForm);
  const payload = Object.fromEntries(formData.entries());
  const taskId = payload.id;
  delete payload.id;

  try {
    if (taskId) {
      await api(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showMessage(elements.taskMessage, 'Task updated successfully.');
    } else {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showMessage(elements.taskMessage, 'Task created successfully.');
    }

    elements.taskModal.close();
    await loadTasks();
  } catch (error) {
    showMessage(elements.taskMessage, error.message, true);
  }
}

async function handleTaskListClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id, status } = button.dataset;
  const task = state.tasks.find(item => String(item.id) === id);
  if (!task) return;

  try {
    if (action === 'edit') {
      openTaskModal(task);
      return;
    }

    if (action === 'delete') {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      showMessage(elements.taskMessage, 'Task deleted.');
    }

    if (action === 'status') {
      await api(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      showMessage(elements.taskMessage, `Task moved to ${formatLabel(status)}.`);
    }

    await loadTasks();
  } catch (error) {
    showMessage(elements.taskMessage, error.message, true);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
      showMessage(elements.authMessage, '');
    });
  });
}

function setupFilters() {
  elements.searchInput.addEventListener('input', async event => {
    state.filters.search = event.target.value.trim();
    await loadTasks();
  });

  elements.statusFilter.addEventListener('change', async event => {
    state.filters.status = event.target.value;
    await loadTasks();
  });

  elements.priorityFilter.addEventListener('change', async event => {
    state.filters.priority = event.target.value;
    await loadTasks();
  });
}

function setupEvents() {
  setupTabs();
  setupFilters();

  elements.loginForm.addEventListener('submit', event => handleAuthSubmit(event, 'login'));
  elements.registerForm.addEventListener('submit', event => handleAuthSubmit(event, 'register'));
  elements.taskForm.addEventListener('submit', handleTaskSubmit);
  elements.taskList.addEventListener('click', handleTaskListClick);
  elements.newTaskBtn.addEventListener('click', () => openTaskModal());
  elements.closeModalBtn.addEventListener('click', () => elements.taskModal.close());
  elements.cancelModalBtn.addEventListener('click', () => elements.taskModal.close());
  elements.logoutBtn.addEventListener('click', () => {
    clearSession();
    toggleView();
    showMessage(elements.authMessage, 'Logged out successfully.');
  });
}

async function init() {
  setupEvents();
  toggleView();

  if (state.token) {
    try {
      const data = await api('/auth/me');
      state.user = data.user;
      saveSession();
      toggleView();
      await loadTasks();
    } catch {
      clearSession();
      toggleView();
    }
  }
}

init();
