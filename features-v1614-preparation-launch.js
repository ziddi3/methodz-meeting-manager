/* Explicit, no-write handoff between the Meeting Preparation Brief and a saved meeting. */
(function initializePreparationLaunchBridge(global) {
  "use strict";

  const VERSION = "1.0.0";
  const STATUS_ID = "preparationLaunchStatusV1614";
  const TARGET_CLASS = "methodz-preparation-target-v1614";
  const ACTION_CLASS = "preparation-launch-action-v1614";
  const RECORDS_KEY = () => global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";

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

  function cleanLaunchFragment() {
    try {
      global.history.replaceState(global.history.state, "", `${global.location.pathname}${global.location.search}`);
    } catch (_error) {
      global.location.hash = "";
    }
  }

  function clearTargetHighlight() {
    document.querySelectorAll(`.${TARGET_CLASS}`).forEach((node) => node.classList.remove(TARGET_CLASS));
  }

  function renderStatus(title, message, tone) {
    const existing = document.getElementById(STATUS_ID);
    const section = existing || document.createElement("section");
    section.id = STATUS_ID;
    section.className = `card methodz-preparation-launch-v1614 is-${tone}`;
    section.setAttribute("role", "status");
    section.setAttribute("aria-live", "polite");

    const copy = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Preparation handoff";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const detail = document.createElement("p");
    detail.className = "helper-text";
    detail.textContent = message;
    copy.append(eyebrow, heading, detail);

    const back = document.createElement("a");
    back.className = "button-like";
    back.href = "preparation.html";
    back.textContent = "Back to Preparation Brief";
    section.replaceChildren(copy, back);

    if (!existing) {
      const hero = document.getElementById("meetingHeroPanelV1610");
      const shell = document.getElementById("mainContent");
      if (hero?.parentNode) hero.insertAdjacentElement("afterend", section);
      else shell?.prepend(section);
    }
    return section;
  }

  function focusTarget(target) {
    clearTargetHighlight();
    const panel = document.getElementById(target.panelId);
    if (!panel) return false;
    panel.classList.add(TARGET_CLASS);

    const reduceMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    const control = document.querySelector(target.selector);
    if (control && typeof control.focus === "function" && !control.disabled) {
      try {
        control.focus({ preventScroll: true });
      } catch (_error) {
        control.focus();
      }
    }
    return true;
  }

  function consumeLaunchContext() {
    const core = global.MethodzMeetingPreparationLaunchCore;
    if (!core || typeof core.parsePreparationLaunchHash !== "function") return false;

    const launch = core.parsePreparationLaunchHash(global.location.hash);
    if (!launch.isPreparationLaunch) return false;

    cleanLaunchFragment();
    if (!launch.valid) {
      renderStatus("Preparation link could not be opened", "The launch reference was incomplete or unsupported. No meeting record was changed.", "error");
      return false;
    }

    let records;
    try {
      records = typeof global.getRecords === "function" ? global.getRecords() : readRecordsFailClosed();
    } catch (_error) {
      records = [];
    }
    const record = (Array.isArray(records) ? records : []).find((item) => String(item?.id ?? "") === launch.recordId);
    if (!record) {
      renderStatus("Saved meeting was not found", "The selected record is not present in this browser-local workspace. No meeting record was changed.", "error");
      return false;
    }
    if (typeof global.loadRecordForEditing !== "function") {
      renderStatus("Meeting editor is unavailable", "The saved record remains unchanged. Return to the Preparation Brief or reload the Meeting Manager.", "error");
      return false;
    }

    global.loadRecordForEditing(launch.recordId);
    const loadedId = document.getElementById("editingRecordId")?.value || "";
    if (loadedId !== launch.recordId) {
      renderStatus("Saved meeting could not be loaded", "The selected record remains unchanged. Return to the Preparation Brief and try again.", "error");
      return false;
    }

    renderStatus("Meeting opened for preparation", `${launch.target.label} is the first incomplete preparation item from the brief. Nothing was saved automatically.`, "success");
    global.requestAnimationFrame(() => focusTarget(launch.target));
    return true;
  }

  function firstMissingFocus(meeting) {
    return Object.entries(meeting?.readiness?.state || {}).find(([, complete]) => !complete)?.[0] || "title";
  }

  function decoratePreparationCards() {
    const reportCore = global.MethodzMeetingPreparationCore;
    const launchCore = global.MethodzMeetingPreparationLaunchCore;
    const container = document.getElementById("preparationMeetings");
    const horizon = document.getElementById("preparationHorizon");
    if (!container || !horizon || !reportCore || !launchCore) return false;

    let report;
    try {
      report = reportCore.buildMeetingPreparationBrief(readRecordsFailClosed(), {
        horizonDays: Number(horizon.value) || 14,
        maximumMeetings: 40,
        maximumCarryovers: 20
      });
    } catch (_error) {
      return false;
    }

    const cards = Array.from(container.querySelectorAll(".preparation-card"));
    cards.forEach((card, index) => {
      if (card.querySelector(`.${ACTION_CLASS}`)) return;
      const meeting = report.meetings[index];
      if (!meeting?.recordId) return;

      const actions = document.createElement("div");
      actions.className = `preparation-card-actions-v1614 ${ACTION_CLASS}`;
      const link = document.createElement("a");
      link.className = "button-like";
      link.href = `meeting.html${launchCore.createPreparationLaunchHash(meeting.recordId, firstMissingFocus(meeting))}`;
      link.textContent = "Open Meeting to Prepare";
      link.setAttribute("aria-label", `Open ${meeting.title} to prepare`);
      actions.append(link);
      card.append(actions);
    });
    return true;
  }

  function initialize() {
    consumeLaunchContext();

    const preparationContainer = document.getElementById("preparationMeetings");
    if (!preparationContainer) return;
    decoratePreparationCards();
    const observer = new MutationObserver(() => decoratePreparationCards());
    observer.observe(preparationContainer, { childList: true });
  }

  global.MethodzPreparationLaunchV1614 = Object.freeze({
    version: VERSION,
    consumeLaunchContext,
    decoratePreparationCards
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    global.queueMicrotask(initialize);
  }
})(window);
