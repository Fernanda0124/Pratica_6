// BASE API - ajuste se necessário
const API_BASE = 'https://proweb.leoproti.com.br';
const ALUNOS_ENDPOINT = `${API_BASE}/alunos`;

document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  loadAlunos();
  setupForm();
  document.getElementById('btn-refresh').addEventListener('click', loadAlunos);
}

// ---------- Alerts ----------
function showAlert(message, type = 'success', timeout = 4500) {
  const alerts = document.getElementById('alerts');
  const id = 'a' + Date.now();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  alerts.appendChild(wrapper);
  if (timeout) setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, timeout);
}

function escapeHtml(unsafe) {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ---------- Fetch helpers ----------
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} - ${res.statusText}`);
  return res.json();
}
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Erro ${res.status} - ${res.statusText}`);
  return res.json();
}
async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Erro ${res.status} - ${res.statusText}`);
  return res.json();
}
async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Erro ${res.status} - ${res.statusText}`);
  return res;
}

// ---------- CRUD ----------
async function loadAlunos() {
  try {
    const data = await apiGet(ALUNOS_ENDPOINT);
    renderTable(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error(err);
    showAlert('Falha ao carregar alunos. Verifique a API / CORS. ' + err.message, 'danger', 7000);
  }
}

function renderTable(alunos) {
  const tbody = document.getElementById('alunosBody');
  tbody.innerHTML = '';
  if (alunos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Nenhum aluno encontrado.</td></tr>`;
    return;
  }
  for (const a of alunos) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${a.id ?? ''}</td>
      <td>${escapeHtml(a.nome ?? '')}</td>
      <td>${escapeHtml(a.turma ?? '')}</td>
      <td>${escapeHtml(a.curso ?? '')}</td>
      <td>${escapeHtml(a.matricula ?? '')}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${a.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${a.id}">Excluir</button>
      </td>`;
    tbody.appendChild(tr);
  }

  // delegate action clicks
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const id = ev.currentTarget.getAttribute('data-id');
      const action = ev.currentTarget.getAttribute('data-action');
      if (action === 'edit') openEditModal(id);
      if (action === 'delete') confirmDelete(id);
    });
  });
}

// ---------- Form / Modal ----------
const alunoModalEl = document.getElementById('alunoModal');
const alunoModal = new bootstrap.Modal(alunoModalEl, { backdrop: 'static', keyboard: false });

function setupForm() {
  const form = document.getElementById('alunoForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }
    // collect
    const id = document.getElementById('alunoId').value;
    const payload = {
      nome: document.getElementById('nome').value.trim(),
      turma: document.getElementById('turma').value.trim(),
      curso: document.getElementById('curso').value.trim(),
      matricula: document.getElementById('matricula').value.trim()
    };

    try {
      if (id) {
        // update
        await apiPut(`${ALUNOS_ENDPOINT}/${id}`, payload);
        showAlert('Aluno atualizado com sucesso.', 'success');
      } else {
        // create
        await apiPost(ALUNOS_ENDPOINT, payload);
        showAlert('Aluno cadastrado com sucesso.', 'success');
      }
      alunoModal.hide();
      form.reset();
      form.classList.remove('was-validated');
      loadAlunos();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao salvar aluno: ' + err.message, 'danger', 7000);
    }
  });

  // when opening new, clear form
  document.getElementById('btn-new').addEventListener('click', () => {
    resetForm();
    document.getElementById('alunoModalLabel').textContent = 'Novo Aluno';
  });

  // clear hidden id when modal hidden
  alunoModalEl.addEventListener('hidden.bs.modal', resetForm);
}

function resetForm() {
  const form = document.getElementById('alunoForm');
  form.reset();
  form.classList.remove('was-validated');
  document.getElementById('alunoId').value = '';
}

// ---------- Edit ----------
async function openEditModal(id) {
  try {
    const aluno = await apiGet(`${ALUNOS_ENDPOINT}/${id}`);
    document.getElementById('alunoId').value = aluno.id ?? '';
    document.getElementById('nome').value = aluno.nome ?? '';
    document.getElementById('turma').value = aluno.turma ?? '';
    document.getElementById('curso').value = aluno.curso ?? '';
    document.getElementById('matricula').value = aluno.matricula ?? '';
    document.getElementById('alunoModalLabel').textContent = `Editar Aluno #${aluno.id}`;
    alunoModal.show();
  } catch (err) {
    console.error(err);
    showAlert('Erro ao carregar dados do aluno: ' + err.message, 'danger');
  }
}

// ---------- Delete ----------
function confirmDelete(id) {
  if (!confirm(`Deseja realmente excluir o aluno ID ${id}? Esta ação é irreversível.`)) return;
  doDelete(id);
}
async function doDelete(id) {
  try {
    await apiDelete(`${ALUNOS_ENDPOINT}/${id}`);
    showAlert('Aluno excluído com sucesso.', 'success');
    loadAlunos();
  } catch (err) {
    console.error(err);
    showAlert('Erro ao excluir aluno: ' + err.message, 'danger', 7000);
  }
}
