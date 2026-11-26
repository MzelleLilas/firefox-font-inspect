const DEFAULT_SETTINGS = { displayMode: "full" };

// Textes traduits via _locales.
document.documentElement.lang = browser.i18n.getUILanguage();
for (const el of document.querySelectorAll("[data-i18n]")) {
  el.textContent = browser.i18n.getMessage(el.dataset.i18n);
}

const radios = [...document.querySelectorAll('input[name="displayMode"]')];
const status = document.querySelector(".status");
let statusTimer;

function check(mode) {
  for (const r of radios) r.checked = r.value === mode;
}

browser.storage.sync.get(DEFAULT_SETTINGS).then((s) => check(s.displayMode));

// Enregistrement immédiat à chaque changement.
for (const r of radios) {
  r.addEventListener("change", async () => {
    await browser.storage.sync.set({ displayMode: r.value });
    status.textContent = browser.i18n.getMessage("optionsSaved");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status.textContent = ""), 1500);
  });
}

// Reflète un changement fait depuis le panneau pendant que la page est ouverte.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.displayMode) check(changes.displayMode.newValue);
});
