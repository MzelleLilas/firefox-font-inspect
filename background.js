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

// Le content script signale son état pour afficher un badge sur l'icône.
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "font-inspect:state" || !sender.tab) return;
  const tabId = sender.tab.id;
  browser.action.setBadgeText({ tabId, text: msg.active ? "ON" : "" });
  browser.action.setBadgeBackgroundColor({ tabId, color: "#6d4aff" });
});
