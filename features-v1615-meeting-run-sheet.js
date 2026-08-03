/* Explicit, read-only meeting run-sheet preview for the Preparation Brief. */
(function initializeMeetingRunSheetFeature(global) {
  "use strict";

  const VERSION = "1.0.0";
  const ACTION_CLASS = "meeting-run-sheet-action-v1615";
  const DIALOG_ID = "meetingRunSheetDialogV1615";
  const CONTENT_ID = "meetingRunSheetContentV1615";
  const STATUS_ID = "meetingRunSheetStatusV1615";
  const PRINT_CLASS = "printing-meeting-run-sheet-v1615";
  const RECORDS_KEY = () => global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";

  const text = (value) => String(value ?? "").trim();

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function readRecordsFailClosed() {
    if (global.MethodzMeetingData && typeof global.MethodzMeetingData.listRecords === "function") {
      const adapterId = typeof global.MethodzMeetingData.getAdapterInfo === "function"
        ? global.MethodzMeetingData.getAdapterInfo().id
        : "local-storage";
      if (adapterId !== "local-storage") {
        const records = global.MethodzMeetingData.listRecords();
        if (!Array.isArray(records)) throw new TypeError("Meeting data adapter did not return an array.");
        return records;
      }
    }
    const raw = global.localStorage.getItem(RECORDS_KEY());
    if (raw === null || raw === "") return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) throw new TypeError("Saved meeting storage is not an array.");
    return records;
  }

  function setStatus(message, tone = "neutral") {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function listSection(title, items, emptyMessage, renderItem) {
    const section = element("section", "meeting-run-sheet-section-v1615");
    section.append(element("h3", "", title));
    if (!items.length) {
      section.append(element("p", "helper-text", emptyMessage));
      return section;
    }
    const list = element("ul", "meeting-run-sheet-list-v1615");
    items.forEach((item, index) => list.append(renderItem(item, index)));
    section.append(list);
    return section;
  }

  function renderSheet(sheet) {
    const container = document.getElementById(CONTENT_ID);
    if (!container) return false;

    const header = element("header", "meeting-run-sheet-header-v1615");
    header.append(element("p", "eyebrow", "Protected meeting run sheet"));
    header.append(element("h2", "", `${sheet.meeting.meetingNumber ? `Meeting #${sheet.meeting.meetingNumber}: ` : ""}${sheet.meeting.title}`));
    header.append(element("p", "helper-text", [
      sheet.meeting.date || "Date not entered",
      sheet.meeting.location || "Location not entered",
      sheet.meeting.facilitator ? `Facilitator: ${sheet.meeting.facilitator}` : "Facilitator not entered",
      `Status: ${sheet.meeting.status}`
    ].join(" · ")));

    const readiness = element("section", "meeting-run-sheet-readiness-v1615");
    readiness.append(element("h3", "", `Preparation readiness: ${sheet.readiness.percent}%`));
    if (sheet.readiness.missing.length) {
      readiness.append(element("p", "helper-text", "Complete these setup items before the meeting:"));
      const list = element("ul", "meeting-run-sheet-list-v1615");
      sheet.readiness.missing.forEach((label) => list.append(element("li", "needs-work", label)));
      readiness.append(list);
    } else {
      readiness.append(element("p", "meeting-run-sheet-ready-v1615", "All seven preparation requirements are present."));
    }

    const organizations = listSection(
      `Organizations (${sheet.organizations.length})`,
      sheet.organizations,
      "No organization is selected.",
      (organization) => element("li", "", organization)
    );
    if (sheet.truncation.organizations) organizations.append(element("p", "helper-text", "Organization list is bounded; additional entries are not shown."));

    const attendees = listSection(
      `Attendee setup (${sheet.attendees.length})`,
      sheet.attendees,
      "No attendee names are prepared.",
      (attendee) => {
        const item = element("li", "");
        item.append(element("strong", "", attendee.name));
        if (attendee.organizationRole) item.append(element("span", "", attendee.organizationRole));
        return item;
      }
    );
    if (sheet.truncation.attendees) attendees.append(element("p", "helper-text", "Attendee list is bounded; additional entries are not shown."));

    const agenda = listSection(
      `Agenda (${sheet.agenda.length})`,
      sheet.agenda,
      "No agenda items are prepared.",
      (item) => {
        const row = element("li", item.prepared ? "is-ready" : "needs-work");
        row.append(element("strong", "", `${item.sequence}. ${item.item}`));
        row.append(element("span", "", [item.group, item.prepared ? "Checked" : "Review"].filter(Boolean).join(" · ")));
        return row;
      }
    );
    if (sheet.truncation.agenda) agenda.append(element("p", "helper-text", "Agenda list is bounded; additional entries are not shown."));

    const carryovers = listSection(
      `Earlier unresolved work (${sheet.carryovers.total})`,
      sheet.carryovers.items,
      "No earlier unresolved tasks are due by this meeting.",
      (item) => {
        const row = element("li", "");
        row.append(element("strong", "", item.task));
        row.append(element("span", "", [
          item.assignedTo ? `Assigned To: ${item.assignedTo}` : "Assigned To missing",
          item.due ? `Due: ${item.due}` : item.dueState === "invalid" ? "Due date invalid" : "Due date missing",
          `From: ${item.sourceMeetingTitle}`
        ].join(" · ")));
        return row;
      }
    );
    if (sheet.carryovers.truncated) carryovers.append(element("p", "helper-text", "Carryover output is bounded; additional tasks are not shown."));

    const grid = element("div", "meeting-run-sheet-grid-v1615");
    grid.append(organizations, attendees, agenda, carryovers);

    const boundary = element("p", "meeting-run-sheet-boundary-v1615");
    boundary.textContent = "Protected business data. This run sheet excludes notes, decisions, summaries, consent values, typed signatures, attachments, credentials, private keys, provider secrets, queue payloads, and hidden governance metadata.";

    container.replaceChildren(header, readiness, grid, boundary);
    return true;
  }

  function openDialog() {
    const dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return false;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    document.getElementById("closeMeetingRunSheetV1615")?.focus();
    return true;
  }

  function closeDialog() {
    const dialog = document.getElementById(DIALOG_ID);
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function previewRecord(recordId) {
    const runSheetCore = global.MethodzMeetingRunSheetCore;
    const preparationCore = global.MethodzMeetingPreparationCore;
    if (!runSheetCore || !preparationCore) {
      setStatus("Run-sheet components are unavailable. No meeting record was changed.", "error");
      return false;
    }

    try {
      const records = readRecordsFailClosed();
      const record = records.find((item) => text(item?.id) === text(recordId));
      if (!record) {
        setStatus("The selected saved meeting is no longer present. No meeting record was changed.", "error");
        closeDialog();
        return false;
      }

      const horizonDays = Number(document.getElementById("preparationHorizon")?.value) || 14;
      const report = preparationCore.buildMeetingPreparationBrief(records, {
        horizonDays,
        maximumMeetings: 40,
        maximumCarryovers: 20
      });
      const meeting = report.meetings.find((item) => item.recordId === text(recordId));
      const sheet = runSheetCore.buildMeetingRunSheet(record, {
        carryovers: meeting?.carryovers,
        maximumOrganizations: 20,
        maximumAttendees: 40,
        maximumAgendaItems: 40,
        maximumCarryovers: 20
      });

      renderSheet(sheet);
      openDialog();
      setStatus(`Run sheet prepared for ${sheet.meeting.title}. Nothing was saved automatically.`, "success");
      return true;
    } catch (error) {
      console.error("Unable to prepare meeting run sheet", error);
      closeDialog();
      setStatus("Saved meeting records could not be read. No meeting record was changed.", "error");
      return false;
    }
  }

  function decoratePreparationCards() {
    const preparationCore = global.MethodzMeetingPreparationCore;
    const container = document.getElementById("preparationMeetings");
    const horizon = document.getElementById("preparationHorizon");
    if (!container || !horizon || !preparationCore) return false;

    let report;
    try {
      report = preparationCore.buildMeetingPreparationBrief(readRecordsFailClosed(), {
        horizonDays: Number(horizon.value) || 14,
        maximumMeetings: 40,
        maximumCarryovers: 20
      });
    } catch (_error) {
      return false;
    }

    Array.from(container.querySelectorAll(".preparation-card")).forEach((card, index) => {
      if (card.querySelector(`.${ACTION_CLASS}`)) return;
      const meeting = report.meetings[index];
      if (!meeting?.recordId) return;
      const actions = element("div", `meeting-run-sheet-actions-v1615 ${ACTION_CLASS}`);
      const button = element("button", "", "Preview Run Sheet");
      button.type = "button";
      button.dataset.recordId = meeting.recordId;
      button.setAttribute("aria-label", `Preview run sheet for ${meeting.title}`);
      actions.append(button);
      card.append(actions);
    });
    return true;
  }

  function printCurrentSheet() {
    const dialog = document.getElementById(DIALOG_ID);
    if (!dialog?.hasAttribute("open")) return;
    document.body.classList.add(PRINT_CLASS);
    setStatus("Print dialog opened for the current run sheet.", "success");
    global.print();
  }

  function initialize() {
    const container = document.getElementById("preparationMeetings");
    if (!container) return;

    decoratePreparationCards();
    const observer = new MutationObserver(() => decoratePreparationCards());
    observer.observe(container, { childList: true });

    container.addEventListener("click", (event) => {
      const button = event.target.closest(`.${ACTION_CLASS} button[data-record-id]`);
      if (button) previewRecord(button.dataset.recordId);
    });
    document.getElementById("closeMeetingRunSheetV1615")?.addEventListener("click", closeDialog);
    document.getElementById("printMeetingRunSheetV1615")?.addEventListener("click", printCurrentSheet);
    document.getElementById(DIALOG_ID)?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeDialog();
    });
    global.addEventListener("afterprint", () => document.body.classList.remove(PRINT_CLASS));
  }

  global.MethodzMeetingRunSheetV1615 = Object.freeze({
    version: VERSION,
    decoratePreparationCards,
    previewRecord,
    closeDialog
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else global.queueMicrotask(initialize);
})(window);
