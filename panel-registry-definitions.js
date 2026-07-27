/* Methodz Meeting Manager v1.6.10 static panel metadata. */
(function registerMethodzPanelsV1610(global) {
  "use strict";

  const registry = global.MethodzPanelRegistryV1610;
  const settings = global.METHODZ_MEETING_CONFIG?.panelRegistry || {};
  if (!registry) throw new Error("panel-registry-core.js must load before panel-registry-definitions.js.");

  const panel = (id, label, group, selector, order, extra = {}) => ({
    id,
    label,
    group,
    selector,
    order,
    insertionAnchor: "#mainContent",
    defaultVisibility: extra.defaultVisibility || "visible",
    printBehavior: extra.printBehavior || "include",
    required: extra.required === true,
    meetingDayPriority: extra.meetingDayPriority ?? null,
    meetingDayLabel: extra.meetingDayLabel || label,
    compatibilityHeading: extra.compatibilityHeading || ""
  });

  registry.registerMany([
    panel("meeting-hero", "Meeting workspace summary", "shell", "#meetingHeroPanelV1610", 10, { required: true, printBehavior: "summary" }),
    panel("quick-actions", "Meeting quick actions", "shell", "#meetingQuickActionsPanelV1610", 20, { required: true, printBehavior: "exclude" }),
    panel("meeting-information", "Meeting Information", "capture", "#meetingInformationPanelV1610", 100, { required: true, meetingDayPriority: 10, meetingDayLabel: "Info", compatibilityHeading: "Meeting Information" }),
    panel("organizations-present", "Organizations / Representatives Present", "capture", "#organizationsPresentPanelV1610", 110, { required: true, meetingDayPriority: 20, meetingDayLabel: "Organizations", compatibilityHeading: "Organizations / Representatives Present" }),
    panel("attendance-sign-on", "Attendance Sign-On", "capture", "#attendanceSignOnPanelV1610", 120, { required: true, meetingDayPriority: 30, meetingDayLabel: "Attendance", compatibilityHeading: "Attendance Sign-On" }),
    panel("agenda-checklist", "Agenda Checklist", "capture", "#agendaChecklistPanelV1610", 130, { required: true, meetingDayPriority: 40, meetingDayLabel: "Agenda", compatibilityHeading: "Agenda Checklist" }),
    panel("discussion-notes", "Discussion Notes", "capture", "#discussionNotesPanelV1610", 140, { required: true, meetingDayPriority: 50, meetingDayLabel: "Notes", compatibilityHeading: "Discussion Notes" }),
    panel("decisions-made", "Decisions Made", "capture", "#decisionsMadePanelV1610", 150, { required: true, meetingDayPriority: 60, meetingDayLabel: "Decisions", compatibilityHeading: "Decisions Made" }),
    panel("follow-up-tasks", "Follow-Up Tasks", "capture", "#followUpTasksPanelV1610", 160, { required: true, meetingDayPriority: 70, meetingDayLabel: "Tasks", compatibilityHeading: "Follow-Up Tasks" }),
    panel("meeting-summary", "Meeting Summary", "capture", "#meetingSummaryPanelV1610", 170, { required: true, meetingDayPriority: 80, meetingDayLabel: "Summary", compatibilityHeading: "Meeting Summary" }),
    panel("end-of-meeting", "End of Meeting", "capture", "#endOfMeetingPanelV1610", 180, { required: true, meetingDayPriority: 90, meetingDayLabel: "Save", compatibilityHeading: "End of Meeting" }),
    panel("saved-records", "Saved Meeting Records", "records", "#savedRecordsPanelV1610", 190),
    panel("archive-vault", "Archive Vault", "archive", "#archiveVaultV08", 400, { defaultVisibility: "collapsed" }),
    panel("record-governance", "Record Roles & Policy", "governance", "#recordGovernancePanelV10", 500, { defaultVisibility: "collapsed", printBehavior: "summary" }),
    panel("data-adapter", "Data Adapter", "provider", "#dataAdapterPanelV07", 600, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("workspace-recovery", "Recovery Readiness", "recovery", "#workspaceRecoveryPanelV16", 700, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("synchronization-rehearsal", "Synchronization Rehearsal", "synchronization", "#syncRehearsalPanelV165", 800, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("device-readiness", "Device Readiness", "diagnostics", "#deviceReadinessV167", 900, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("cross-device-transfer", "Cross-Device Transfer Rehearsal", "transfer", "#crossDeviceTransferPanelV168", 1000, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("transfer-acceptance", "Transfer Acceptance & Rollback", "acceptance", "#transferAcceptancePanelV169", 1010, { defaultVisibility: "collapsed", printBehavior: "exclude" }),
    panel("meeting-day-control", "Meeting-Day Mode", "shell", "#meetingDayControlV169", 1020, { printBehavior: "exclude" }),
    panel("panel-registry-diagnostics", "Application Shell Diagnostics", "diagnostics", "#panelRegistryDiagnosticsV1610", 1030, { defaultVisibility: "collapsed", printBehavior: "exclude" })
  ], {
    validGroups: settings.validGroups,
    validVisibility: settings.validVisibility,
    validPrintBehavior: settings.validPrintBehavior
  });
})(window);
