/* Methodz Meeting Manager v1.6.2 startup synchronization for key custody controls. */
(function initializeMethodzKeyCustodyStartupV162(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    wrapKeyProducer("generateCryptoKeyV16");
    wrapKeyProducer("importPrivateKeyV16");
    wrapKeyProducer("importPublicKeyV16");
    global.addEventListener("storage", handleStorageChange);
  });

  function registryKey() {
    return global.METHODZ_MEETING_CONFIG?.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  }

  function wrapKeyProducer(name) {
    const original = global[name];
    if (typeof original !== "function" || original.__methodzCustodyWrapped) return;
    const wrapped = async function methodzCustodyAwareKeyProducer(...args) {
      const result = await original.apply(this, args);
      refreshCustodyWorkspace();
      return result;
    };
    wrapped.__methodzCustodyWrapped = true;
    global[name] = wrapped;
  }

  function handleStorageChange(event) {
    if (event.key === registryKey()) refreshCustodyWorkspace();
  }

  function refreshCustodyWorkspace() {
    // The v1.6.2 feature intentionally exposes no mutable private-key state.
    // A lightweight page event lets UI adapters refresh without reloading the app.
    global.dispatchEvent(new CustomEvent("methodz:key-custody-registry-changed"));
    const panel = document.getElementById("keyCustodyPanelV162");
    if (!panel) return;

    // Re-run the module's public initialization-safe render path by dispatching
    // a synthetic change after rebuilding options from the browser-local registry.
    const key = registryKey();
    let entries = [];
    try {
      const parsed = JSON.parse(global.localStorage.getItem(key) || "[]");
      entries = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Unable to refresh public-key custody selectors.", error);
    }

    [
      ["custodyKeySelectV162", entries, "No public keys registered"],
      ["rotationPredecessorV162", entries.filter((entry) => entry.status !== "Revoked"), "Select active predecessor"],
      ["rotationSuccessorV162", entries.filter((entry) => entry.status !== "Revoked"), "Select active successor"]
    ].forEach(([id, values, empty]) => {
      const select = document.getElementById(id);
      if (!select) return;
      const previous = select.value;
      select.innerHTML = `<option value="">${escapeHtml(empty)}</option>${values.map((entry) => (
        `<option value="${escapeHtml(entry.id || "")}">${escapeHtml(entry.status || "Active")} • ${escapeHtml(entry.keyLabel || "Verification key")} • ${escapeHtml(entry.id || "")}</option>`
      )).join("")}`;
      if (values.some((entry) => entry.id === previous)) select.value = previous;
    });

    document.getElementById("custodyKeySelectV162")?.dispatchEvent(new Event("change"));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})(window);
