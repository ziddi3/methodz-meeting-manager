/* Methodz Meeting Manager v1.2 release-audit refresh after export controls. */
(function initializeMethodzReleaseAuditV12(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    if (global.__methodzV12ReleaseAuditPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;

    global.collectMeetingData = function collectMeetingDataReleaseAuditV12(...args) {
      const meeting = original.apply(this, args);
      if (global.MethodzReleaseV10?.validateRecord) {
        meeting.schemaAudit = global.MethodzReleaseV10.validateRecord(meeting);
        meeting.releaseMetadata = {
          ...(meeting.releaseMetadata || {}),
          release: "1.2.0",
          appShellVersion: config.appShellVersion || "1.2.0",
          auditedAt: meeting.schemaAudit.checkedAt
        };
      }
      return meeting;
    };

    global.__methodzV12ReleaseAuditPatched = true;
  }
})(window);
