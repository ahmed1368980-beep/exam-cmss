const { PRIMARY_API, SECONDARY_API, TIMEOUT_MS } = window.APP_CONFIG;
const BASES = [PRIMARY_API, SECONDARY_API];

const form = document.getElementById("item-form");
const list = document.getElementById("items");
const errorBox = document.getElementById("error");
const sourceEl = document.getElementById("source");
const submitBtn = document.getElementById("submit-btn");

// Appel d'une seule URL avec delai maximal et verification de response.ok
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.error || `Erreur HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Essaie le backend principal puis le secours (reseau, timeout ou HTTP non reussi)
async function apiRequest(path, options = {}) {
  let lastError;
  for (const base of BASES) {
    try {
      const response = await fetchWithTimeout(base + path, options);
      sourceEl.textContent = `Backend utilisé : ${base}`;
      return await response.json();
    } catch (err) {
      lastError = err;
      // Une erreur 4xx de validation ne sera pas corrigee par l'autre backend
      if (err.status && err.status >= 400 && err.status < 500) throw err;
      console.warn(`Echec sur ${base} :`, err.message);
    }
  }
  throw new Error("Les deux serveurs sont indisponibles. Réessayez dans un instant.");
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function render(items) {
  list.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = item.name; // textContent : pas d'injection HTML
    const desc = document.createElement("span");
    desc.textContent = item.description || "";
    li.append(title, desc);
    list.appendChild(li);
  }
}

async function loadItems() {
  try {
    showError("");
    render(await apiRequest("/api/items"));
  } catch (err) {
    showError(err.message);
  }
}

// Cle d'idempotence : generee une fois par soumission, reutilisee aux nouvelles tentatives
let pendingClientId = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const description = form.description.value.trim();
  if (!name) return showError("Le nom est obligatoire.");

  if (!pendingClientId) pendingClientId = crypto.randomUUID();
  submitBtn.disabled = true;
  try {
    showError("");
    await apiRequest("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, clientId: pendingClientId }),
    });
    pendingClientId = null; // succes : la prochaine soumission aura un nouvel identifiant
    form.reset();
    await loadItems();
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

loadItems();
