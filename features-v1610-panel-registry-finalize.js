/* Methodz Meeting Manager v1.6.10 late panel-registry binding. */
(function finalizePanelRegistryV1610(global) {
  "use strict";

  function finalize() {
    global.refreshPanelRegistryV1610?.({ announce: false });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", finalize, { once: true });
  else finalize();
})(window);
