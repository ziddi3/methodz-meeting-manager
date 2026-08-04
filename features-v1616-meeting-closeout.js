/* Explicit, read-only meeting closeout review for the current form. */
(function initializeMeetingCloseoutFeature(global) {
  "use strict";

  const VERSION = "1.0.0";
  const PANEL_ID = "meetingCloseoutPanelV1616";
  const STATUS_ID = "meetingCloseoutStatusV1616";
  const RESULTS_ID = "meetingCloseoutResultsV1616";
  const FOCUS_CLASS = "methodz-closeout-target-v1616";
  const TARGETS = Object.freeze({
    status: Object.freeze({ panelId: "meetingInformationPanelV1610", selector: "#meetingStatus" }),
    attendance: Object.freeze({ panelId: "attendanceSignOnPanelV1610", selector: ".attendee-name" }),
    agenda: Object.freeze({ panelId: "agendaChecklistPanelV1610", selector: "#agendaList input[type='checkbox']" }),
    notes: Object.freeze({ panelId: "discussionNotesPanelV1610", selector: "#notes" }),
    decisions: Object.freeze({ panelId: "decisionsMadePanelV1610", selector: "#decisions" }),
    tasks: Object.freeze({ panelId: "followUpTasksPanelV1610", selector: ".task-name" }),
    summary: Object.freeze({ panelId: "meetingSummaryPanelV1610", selector: "#summary" })
  });

  let currentReview = null;

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function setStatus(message, tone = "neutral") {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function clearFocusHighlight() {
    document.querySelectorAll(`.${FOCUS_CLASS}`).forEach((node) => node.classList.remove(FOCUS_CLASS));
  }

  function collectCurrentMeeting() {
    if (typeof global.collectMeetingData !== "function") {
      throw new Error("Meeting form collector is unavailable.");
    }
    return global.collectMeetingData({ keepEmptyRows: true });
  }

  function renderReview(review) {
    const results = document.getElementById(RESULTS_ID);
    if (!results) return false;

    const summary = element("div", "meeting-closeout-summary-v1616");
    const score = element("div", "meeting-closeout-score-v1616");
    score.append(element("strong", "", `${review.percent}%`));
    score.append(element("span", "", `${review.completed} of ${review.total} checkpoints`));
    const state = element("div", `meeting-closeout-state-v1616 is-${review.state}`);
    state.append(element("strong", "", review.ready ? "Ready for operator closeout" : "Review still required"));
    state.append(element("span", "", review.ready
      ? "All closeout checkpoints are present. Saving or changing status remains an explicit operator action."
      : "Use Focus Next Review Item to move to the first incomplete capture section."));
    summary.append(score, state);

    const list = element("ol", "meeting-closeout-checkpoints-v1616");
    review.checkpoints.forEach((checkpoint) => {
      const item = element("li", checkpoint.complete ? "is-complete" : "needs-review");
      const heading = element("div", "meeting-closeout-checkpoint-heading-v1616");
      heading.append(element("strong", "", checkpoint.label));
      heading.append(element("span", "", checkpoint.complete ? "Complete" : "Review"));
      item.append(heading, element("p", "helper-text", checkpoint.detail));
      list.append(item);
    });

    const counts = element("div", "meeting-closeout-counts-v1616");
    counts.append(
      element("p", "", `Attendance: ${review.counts.attendees.named} named of ${review.counts.attendees.total} captured rows`),
      element("p", "", `Agenda: ${review.counts.agenda.reviewed} reviewed of ${review.counts.agenda.total}`),
      element("p", "", `Tasks: ${review.counts.tasks.ready} ready of ${review.counts.tasks.total}`)
    );

    if (Object.values(review.truncation).some(Boolean)) {
      counts.append(element("p", "meeting-closeout-warning-v1616", "One or more row collections exceeded the bounded review limit. Affected checkpoints fail closed and require manual review."));
    }

    results.replaceChildren(summary, list, counts);
    return true;
  }

  function reviewCurrentMeeting() {
    const core = global.MethodzMeetingCloseoutCore;
    if (!core || typeof core.buildMeetingCloseoutReview !== "function") {
      setStatus("Closeout review components are unavailable. Nothing was saved or changed.", "error");
      return false;
    }

    try {
      currentReview = core.buildMeetingCloseoutReview(collectCurrentMeeting(), {
        maximumAttendees: 250,
        maximumAgendaItems: 500,
        maximumTasks: 250
      });
      renderReview(currentReview);
      document.getElementById("focusMeetingCloseoutV1616").disabled = currentReview.ready;
      document.getElementById("downloadMeetingCloseoutV1616").disabled = false;
      setStatus(currentReview.ready
        ? "Closeout review is ready. No meeting record was saved or changed."
        : `Closeout review found ${currentReview.total - currentReview.completed} checkpoint${currentReview.total - currentReview.completed === 1 ? "" : "s"} requiring attention. Nothing was saved automatically.`,
      currentReview.ready ? "success" : "warning");
      return true;
    } catch (error) {
      console.error("Unable to build meeting closeout review", error);
      currentReview = null;
      setStatus("The current meeting form could not be reviewed. Nothing was saved or changed.", "error");
      return false;
    }
  }

  function focusCheckpoint(key) {
    const target = TARGETS[key];
    if (!target) return false;
    clearFocusHighlight();
    const panel = document.getElementById(target.panelId);
    if (!panel) {
      setStatus("The next review section is unavailable. Nothing was saved or changed.", "error");
      return false;
    }

    panel.hidden = false;
    panel.classList.add(FOCUS_CLASS);
    const reduceMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    const control = panel.querySelector(target.selector) || document.querySelector(target.selector);
    if (control && typeof control.focus === "function" && !control.disabled) {
      global.setTimeout(() => {
        try { control.focus({ preventScroll: true }); }
        catch (_error) { control.focus(); }
      }, reduceMotion ? 0 : 250);
    }
    return true;
  }

  function focusNextCheckpoint() {
    if (!currentReview && !reviewCurrentMeeting()) return false;
    if (!currentReview?.nextFocus) {
      setStatus("All closeout checkpoints are present. Saving or changing status remains an explicit operator action.", "success");
      return false;
    }
    const checkpoint = currentReview.checkpoints.find((item) => item.key === currentReview.nextFocus);
    const focused = focusCheckpoint(currentReview.nextFocus);
    if (focused) setStatus(`${checkpoint?.label || "The next checkpoint"} is ready for operator review. Nothing was saved automatically.`, "warning");
    return focused;
  }

  function downloadMetadataReport() {
    if (!currentReview && !reviewCurrentMeeting()) return false;
    const payload = JSON.stringify(currentReview, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `methodz-meeting-closeout-review-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("Metadata-only closeout report downloaded. It contains checkpoint states and counts, not meeting content or record identifiers.", "success");
    return true;
  }

  function initialize() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    document.getElementById("reviewMeetingCloseoutV1616")?.addEventListener("click", reviewCurrentMeeting);
    document.getElementById("focusMeetingCloseoutV1616")?.addEventListener("click", focusNextCheckpoint);
    document.getElementById("downloadMeetingCloseoutV1616")?.addEventListener("click", downloadMetadataReport);
  }

  global.MethodzMeetingCloseoutV1616 = Object.freeze({
    version: VERSION,
    reviewCurrentMeeting,
    focusNextCheckpoint,
    downloadMetadataReport
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else global.queueMicrotask(initialize);
})(window);
