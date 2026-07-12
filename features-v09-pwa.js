/* Methodz Meeting Manager v0.9 optional PWA shell. Direct-file use remains supported. */
(function initializeV09Pwa(global) {
  "use strict";

  let deferredInstallPrompt = null;
  let registration = null;

  global.addEventListener("DOMContentLoaded", initializePwaV09);
  global.addEventListener("beforeinstallprompt", captureInstallPromptV09);
  global.addEventListener("appinstalled", handleInstalledV09);
  global.addEventListener("online", updatePwaStatusV09);
  global.addEventListener("offline", updatePwaStatusV09);

  function initializePwaV09() {
    installPwaPanelV09();
    updatePwaStatusV09();
    registerServiceWorkerV09();
  }

  function installPwaPanelV09() {
    const quickActions = document.querySelector(".quick-actions");
    if (!quickActions || document.getElementById("pwaPanelV09")) return;

    const panel = document.createElement("section");
    panel.id = "pwaPanelV09";
    panel.className = "card v09-card pwa-panel-v09";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>App Installation & Offline Shell</h2>
          <p class="helper-text">Direct-file mode remains available. When served over HTTPS or localhost, the optional service worker can cache the static app shell for offline reopening.</p>
        </div>
        <span id="pwaModeBadgeV09" class="workspace-badge-v09">Checking mode</span>
      </div>
      <div id="pwaStatusV09" class="pwa-status-v09" aria-live="polite"></div>
      <div class="button-row">
        <button id="installPwaButtonV09" type="button" onclick="installMethodzAppV09()" hidden>Install App</button>
        <button id="refreshPwaCacheButtonV09" type="button" onclick="refreshMethodzCacheV09()">Refresh Offline Cache</button>
      </div>
    `;
    quickActions.insertAdjacentElement("afterend", panel);
  }

  async function registerServiceWorkerV09() {
    const status = document.getElementById("pwaStatusV09");
    if (global.location.protocol === "file:") {
      if (status) status.innerHTML = "<strong>Direct-file mode:</strong> the app is running without a web server. Core meeting features remain available; service-worker caching and installation are intentionally disabled.";
      updatePwaControlsV09();
      return;
    }

    if (!("serviceWorker" in navigator)) {
      if (status) status.innerHTML = "<strong>Browser limitation:</strong> service workers are not supported here. The app can still run as a normal static site.";
      updatePwaControlsV09();
      return;
    }

    try {
      registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
      await navigator.serviceWorker.ready;
      if (status) status.innerHTML = "<strong>Offline shell ready:</strong> static application files are available through the Methodz service worker after the first successful visit.";
      registration.addEventListener("updatefound", () => announceV09("A Methodz Meeting Manager app-shell update is downloading."));
    } catch (error) {
      console.warn("Service worker registration failed", error);
      if (status) status.innerHTML = `<strong>Offline shell unavailable:</strong> ${escapeV09(error.message || error)}. Core static features are unaffected.`;
    }
    updatePwaControlsV09();
  }

  function captureInstallPromptV09(event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    updatePwaControlsV09();
    announceV09("Methodz Meeting Manager can be installed on this device.");
  }

  async function installMethodzAppV09() {
    if (!deferredInstallPrompt) return alert("The browser has not offered installation. Use the browser install or Add to Home Screen option when available.");
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updatePwaControlsV09();
  }

  function handleInstalledV09() {
    deferredInstallPrompt = null;
    updatePwaControlsV09();
    announceV09("Methodz Meeting Manager installed.");
  }

  async function refreshMethodzCacheV09() {
    if (global.location.protocol === "file:") return alert("Offline-shell caching requires HTTPS or localhost. Direct-file meeting features already work without installation.");
    if (!("serviceWorker" in navigator)) return alert("Service workers are not supported in this browser.");
    try {
      registration = registration || await navigator.serviceWorker.getRegistration("./");
      if (!registration) return alert("No Methodz service worker registration was found.");
      await registration.update();
      if (registration.active) registration.active.postMessage({ type: "METHODZ_REFRESH_CACHE" });
      announceV09("Offline cache refresh requested.");
    } catch (error) {
      alert(`Unable to refresh the offline cache: ${error.message || error}`);
    }
  }

  function updatePwaStatusV09() {
    const badge = document.getElementById("pwaModeBadgeV09");
    if (!badge) return;
    const mode = global.matchMedia?.("(display-mode: standalone)").matches ? "Installed app" : global.location.protocol === "file:" ? "Direct-file mode" : "Hosted static app";
    badge.textContent = `${mode} • ${navigator.onLine ? "Online" : "Offline"}`;
    updatePwaControlsV09();
  }

  function updatePwaControlsV09() {
    const installButton = document.getElementById("installPwaButtonV09");
    const refreshButton = document.getElementById("refreshPwaCacheButtonV09");
    if (installButton) installButton.hidden = !deferredInstallPrompt;
    if (refreshButton) refreshButton.disabled = global.location.protocol === "file:" || !("serviceWorker" in navigator);
  }

  function escapeV09(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function announceV09(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.installMethodzAppV09 = installMethodzAppV09;
  global.refreshMethodzCacheV09 = refreshMethodzCacheV09;
})(window);
