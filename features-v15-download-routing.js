/* Methodz Meeting Manager v1.5 routes every external-download control through the approved receipt-producing path. */
(function routeMethodzExternalDownloadsV15(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    if (global.__methodzV15DownloadRoutingPatched || typeof global.downloadApprovedExternalV12 !== "function") return;

    global.downloadExternalJsonV11 = function downloadExternalJsonWithReceiptV15() {
      return global.downloadApprovedExternalV12("json");
    };
    global.downloadExternalHtmlV11 = function downloadExternalHtmlWithReceiptV15() {
      return global.downloadApprovedExternalV12("html");
    };

    global.__methodzV15DownloadRoutingPatched = true;
  });
})(window);
