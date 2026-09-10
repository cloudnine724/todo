(() => {
  const STORAGE_KEY = 'todo-app-items-v1';
  const THEME_KEY = 'todo-app-theme';

  const form = document.getElementById('add-form');
  const input = document.getElementById('new-todo');
  const prioritySelect = document.getElementById('new-priority');
  const dueInput = document.getElementById('new-due');
  const list = document.getElementById('todo-list');
  const emptyState = document.getElementById('empty-state');
  const itemsLeft = document.getElementById('items-left');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search');
  const themeToggle = document.getElementById('theme-toggle');

  let todos = loadTodos();
  let filter = 'all';
  let search = '';
  let draggingId = null;

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function addTodo(text, priority, due) {
    todos.unshift({
      id: uid(),
      text: text.trim(),
      completed: false,
      priority: priority || 'medium',
      due: due || null,
      createdAt: Date.now(),
    });
    saveTodos();
    render();
  }

  function toggleTodo(id) {
    const t = todos.find(t => t.id === id);
    if (t) { t.completed = !t.completed; saveTodos(); render(); }
  }

  function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    render();
  }

  function editTodo(id, newText) {
    const t = todos.find(t => t.id === id);
    if (!t) return;
    const trimmed = newText.trim();
    if (!trimmed) { deleteTodo(id); return; }
    t.text = trimmed;
    saveTodos();
    render();
  }

  function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    saveTodos();
    render();
  }

  function reorder(fromId, toId) {
    const fromIndex = todos.findIndex(t => t.id === fromId);
    const toIndex = todos.findIndex(t => t.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, moved);
    saveTodos();
    render();
  }

  function formatDue(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffDays = Math.round((d - today) / 86400000);
    const label = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    return { label, overdue: diffDays < 0 };
  }

  function getFiltered() {
    return todos.filter(t => {
      if (filter === 'active' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }

  function render() {
    const filtered = getFiltered();
    list.innerHTML = '';

    filtered.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.completed ? ' completed' : '');
      li.draggable = true;
      li.dataset.id = todo.id;

      const dot = document.createElement('span');
      dot.className = 'priority-dot ' + todo.priority;
      dot.title = { low: '낮음', medium: '보통', high: '높음' }[todo.priority];

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => toggleTodo(todo.id));

      const content = document.createElement('div');
      content.className = 'todo-content';

      const text = document.createElement('div');
      text.className = 'todo-text';
      text.contentEditable = 'true';
      text.spellcheck = false;
      text.textContent = todo.text;
      text.addEventListener('blur', () => editTodo(todo.id, text.textContent));
      text.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
        if (e.key === 'Escape') { text.textContent = todo.text; text.blur(); }
      });

      content.appendChild(text);

      if (todo.due) {
        const meta = document.createElement('div');
        meta.className = 'todo-meta';
        const { label, overdue } = formatDue(todo.due);
        const badge = document.createElement('span');
        badge.className = 'due-badge' + (overdue && !todo.completed ? ' overdue' : '');
        badge.textContent = '📅 ' + label;
        meta.appendChild(badge);
        content.appendChild(meta);
      }

      const actions = document.createElement('div');
      actions.className = 'todo-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn delete';
      deleteBtn.title = '삭제';
      deleteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

      actions.appendChild(deleteBtn);

      li.appendChild(dot);
      li.appendChild(checkbox);
      li.appendChild(content);
      li.appendChild(actions);

      li.addEventListener('dragstart', () => {
        draggingId = todo.id;
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => {
        draggingId = null;
        li.classList.remove('dragging');
      });
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggingId && draggingId !== todo.id) reorder(draggingId, todo.id);
      });

      list.appendChild(li);
    });

    emptyState.hidden = filtered.length !== 0;
    const activeCount = todos.filter(t => !t.completed).length;
    itemsLeft.textContent = `${activeCount}개 남음`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    addTodo(input.value, prioritySelect.value, dueInput.value);
    input.value = '';
    dueInput.value = '';
    prioritySelect.value = 'medium';
    input.focus();
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter = btn.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener('input', (e) => {
    search = e.target.value;
    render();
  });

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  initTheme();
  render();
})();
