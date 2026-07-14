/* Methodz Meeting Manager v1.2 compatibility repairs for layered feature dispatch. */
(function initializeMethodzCompatibilityV12(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    patchRevisionHistoryButtons();
  }

  function patchRevisionHistoryButtons() {
    if (global.__methodzV12RevisionButtonPatched || typeof global.createRecordCard !== "function") return;
    const originalCreateRecordCard = global.createRecordCard;

    global.createRecordCard = function createRecordCardCompatibilityV12(record) {
      const card = originalCreateRecordCard(record);
      const button = card?.querySelector(".revision-history-button-v08");
      if (!button) return card;

      const replacement = button.cloneNode(true);
      button.replaceWith(replacement);
      replacement.addEventListener("click", () => {
        if (typeof global.openRevisionHistoryV08 === "function") {
          global.openRevisionHistoryV08(record.id);
        }
      });
      return card;
    };

    global.__methodzV12RevisionButtonPatched = true;
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
  }
})(window);
