/* Methodz Meeting Manager v1.6 cryptographic package release bridge. */
(function initializeMethodzCryptographicReleaseV16(global) {
  "use strict";

  function exposeReleaseApi() {
    if (global.MethodzCryptoPackageV15) {
      global.MethodzCryptoPackageV16 = {
        ...global.MethodzCryptoPackageV15,
        releaseVersion: "1.6.0"
      };
    }
    if (global.MethodzCryptographicSigningV15) {
      global.MethodzCryptographicSigningV16 = {
        ...global.MethodzCryptographicSigningV15,
        releaseVersion: "1.6.0"
      };
    }
    if (global.MethodzKeySafetyV15) {
      global.MethodzKeySafetyV16 = {
        ...global.MethodzKeySafetyV15,
        releaseVersion: "1.6.0"
      };
    }

    const panel = document.getElementById("cryptoSigningPanelV15");
    if (panel) {
      panel.dataset.release = "1.6.0";
      panel.querySelectorAll(".release-badge-v15").forEach((badge) => {
        badge.textContent = "v1.6";
        badge.setAttribute("aria-label", "Version 1.6 cryptographic package tools");
      });
    }
  }

  global.addEventListener("DOMContentLoaded", exposeReleaseApi);

  global.MethodzCryptographicReleaseV16 = {
    version: "1.6.0",
    exposeReleaseApi
  };
})(window);
