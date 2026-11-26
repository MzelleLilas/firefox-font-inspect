// Clic sur l'icône (ou raccourci) : injecte le content script, qui bascule
// lui-même entre actif / inactif s'il est déjà présent dans l'onglet.
browser.action.onClicked.addListener(async (tab) => {
  try {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (err) {
    // Pages protégées (about:, addons.mozilla.org, PDF viewer…)
    console.warn("[Font Inspect] Cannot inject script:", err);
  }
});

browser.runtime.onMessage.addListener((msg, sender) => {
  // Bouton ⚙ du panneau : ouvre la page d'options.
  if (msg?.type === "font-inspect:open-options") {
    browser.runtime.openOptionsPage();
    return;
  }

  // Le content script signale son état pour afficher un badge sur l'icône.
  if (msg?.type !== "font-inspect:state" || !sender.tab) return;
  const tabId = sender.tab.id;
  browser.action.setBadgeText({ tabId, text: msg.active ? "ON" : "" });
  browser.action.setBadgeBackgroundColor({ tabId, color: "#6d4aff" });
});
