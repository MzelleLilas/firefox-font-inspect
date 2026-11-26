// Garder synchronisé avec content.js.
const DEFAULT_SETTINGS = {
  displayMode: "full",
  rows: {
    preview: true,
    fontFamily: true,
    fontSize: true,
    fontWeight: true,
    lineHeight: true,
    letterSpacing: true,
    color: true,
  },
};

// Textes traduits via _locales.
document.documentElement.lang = browser.i18n.getUILanguage();
for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = browser.i18n.getMessage(el.dataset.i18n);
}

const radios = [...document.querySelectorAll('input[name="displayMode"]')];
const checkboxes = [...document.querySelectorAll('input[name="row"]')];
const status = document.querySelector(".status");
let statusTimer;

function showMode(mode) {
  for (const r of radios) r.checked = r.value === mode;
}

function showRows(rows) {
  const merged = { ...DEFAULT_SETTINGS.rows, ...rows };
  for (const c of checkboxes) c.checked = merged[c.value] !== false;
}

async function save(values) {
  await browser.storage.sync.set(values);
  status.textContent = browser.i18n.getMessage("optionsSaved");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ""), 1500);
}

browser.storage.sync.get(DEFAULT_SETTINGS).then((s) => {
  showMode(s.displayMode);
  showRows(s.rows);
});

// Enregistrement immédiat à chaque changement.
for (const r of radios) {
  r.addEventListener("change", () => save({ displayMode: r.value }));
}
for (const c of checkboxes) {
  c.addEventListener("change", () => {
    save({ rows: Object.fromEntries(checkboxes.map((box) => [box.value, box.checked])) });
  });
}

// Reflète un changement fait depuis le panneau pendant que la page est ouverte.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.displayMode) showMode(changes.displayMode.newValue);
  if (changes.rows) showRows(changes.rows.newValue);
});
