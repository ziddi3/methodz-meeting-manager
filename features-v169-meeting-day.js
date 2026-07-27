/* Methodz Meeting Manager v1.6.9 compact meeting-day workflow. */
(function initializeMeetingDayV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.meetingDay || {};
  const preferenceKey = config.storageKeys?.meetingDayPreferences || "methodzMeetingDayPreferencesV169";
  const sectionDefinitions = [
    ["Meeting Information", "meeting-day-info-v169", "Info"],
    ["Organizations / Representatives Present", "meeting-day-organizations-v169", "Organizations"],
    ["Attendance Sign-On", "meeting-day-attendance-v169", "Attendance"],
    ["Agenda Checklist", "meeting-day-agenda-v169", "Agenda"],
    ["Discussion Notes", "meeting-day-notes-v169", "Notes"],
    ["Decisions Made", "meeting-day-decisions-v169", "Decisions"],
    ["Follow-Up Tasks", "meeting-day-tasks-v169", "Tasks"],
    ["Meeting Summary", "meeting-day-summary-v169", "Summary"],
    ["End of Meeting", "meeting-day-save-v169", "Save"]
  ];

  function parsePreferences() {
    try {
      const value = JSON.parse(global.localStorage.getItem(preferenceKey) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (error) {
      return {};
    }
  }

  function savePreferences(patch) {
    const next = { ...parsePreferences(), ...patch, updatedAt: new Date().toISOString() };
    global.localStorage.setItem(preferenceKey, JSON.stringify(next));
    return next;
  }

  function sectionByHeading(label) {
    return [...document.querySelectorAll("#mainContent > section.card")]
      .find((section) => section.querySelector(":scope > h2")?.textContent.trim() === label
        || section.querySelector(":scope > .section-subheader h2")?.textContent.trim() === label);
  }

  function classifySections() {
    const core = new Set();
    sectionDefinitions.forEach(([label, id]) => {
      const section = sectionByHeading(label);
      if (!section) return;
      section.id = section.id || id;
      section.classList.add("meeting-day-core-v169");
      core.add(section);
    });
    document.querySelector(".hero-card")?.classList.add("meeting-day-core-v169");
    document.querySelector(".quick-actions")?.classList.add("meeting-day-core-v169");
    document.querySelectorAll("#mainContent > section.card").forEach((section) => {
      if (!core.has(section) && !section.classList.contains("meeting-day-controls-v169")) section.classList.add("meeting-day-supporting-v169");
    });
  }

  function installControls() {
    if (document.getElementById("meetingDayControlsV169")) return;
    const quickActions = document.querySelector(".quick-actions");
    const main = document.getElementById("mainContent");
    if (!main) return;

    const quickButton = document.createElement("button");
    quickButton.type = "button";
    quickButton.id = "meetingDayToggleQuickV169";
    quickButton.textContent = "Meeting-Day Mode";
    quickButton.addEventListener("click", toggleMeetingDayV169);
    quickActions?.appendChild(quickButton);

    const panel = document.createElement("section");
    panel.id = "meetingDayControlsV169";
    panel.className = "card meeting-day-controls-v169 meeting-day-core-v169";
    panel.innerHTML = `
      <div class="meeting-day-toolbar-v169">
        <div><p class="eyebrow">Live Meeting Workspace</p><h2>Meeting-Day Mode</h2></div>
        <div class="button-row">
          <button id="meetingDayToggleV169" type="button" onclick="toggleMeetingDayV169()">Enter Meeting-Day Mode</button>
          <button id="meetingDaySupportingToggleV169" type="button" onclick="toggleMeetingDaySupportingV169()">Show Supporting Panels</button>
        </div>
      </div>
      <p class="helper-text">Prioritizes the live meeting path while keeping governance, recovery, synchronization, and transfer tools one explicit tap away.</p>
      <nav id="meetingDayNavV169" class="meeting-day-nav-v169" aria-label="Meeting section navigation"></nav>`;
    const hero = document.querySelector(".hero-card");
    if (hero) hero.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
  }

  function buildNavigation() {
    const nav = document.getElementById("meetingDayNavV169");
    if (!nav) return;
    nav.innerHTML = "";
    sectionDefinitions.forEach(([label, id, shortLabel]) => {
      const section = document.getElementById(id) || sectionByHeading(label);
      if (!section) return;
      if (!section.id) section.id = id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "meeting-day-nav-button-v169";
      button.textContent = shortLabel;
      button.setAttribute("aria-controls", section.id);
      button.addEventListener("click", () => navigateToSection(section.id));
      nav.appendChild(button);
    });
  }

  function navigateToSection(id) {
    const section = document.getElementById(id);
    if (!section) return;
    savePreferences({ lastSectionId: id });
    section.scrollIntoView({ behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth", block: "start" });
    section.focus?.({ preventScroll: true });
    updateActiveNavigation(id);
  }

  function updateActiveNavigation(id) {
    document.querySelectorAll(".meeting-day-nav-button-v169").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("aria-controls") === id);
    });
  }

  function setMeetingDayMode(enabled, options = {}) {
    document.body.classList.toggle("is-meeting-day-v169", enabled);
    const preferences = savePreferences({ enabled });
    const toggle = document.getElementById("meetingDayToggleV169");
    const quick = document.getElementById("meetingDayToggleQuickV169");
    if (toggle) toggle.textContent = enabled ? "Exit Meeting-Day Mode" : "Enter Meeting-Day Mode";
    if (quick) {
      quick.textContent = enabled ? "Exit Meeting-Day Mode" : "Meeting-Day Mode";
      quick.setAttribute("aria-pressed", String(enabled));
    }
    if (enabled && options.restore !== false && settings.restoreLastSection !== false && preferences.lastSectionId) {
      global.setTimeout(() => navigateToSection(preferences.lastSectionId), 50);
    }
    global.announceMethodzStatus?.(enabled ? "Meeting-Day Mode enabled." : "Meeting-Day Mode disabled.");
  }

  function toggleMeetingDayV169() {
    setMeetingDayMode(!document.body.classList.contains("is-meeting-day-v169"), { restore: true });
  }

  function toggleMeetingDaySupportingV169() {
    const shown = document.body.classList.toggle("meeting-day-supporting-visible-v169");
    savePreferences({ supportingVisible: shown });
    const button = document.getElementById("meetingDaySupportingToggleV169");
    if (button) button.textContent = shown ? "Hide Supporting Panels" : "Show Supporting Panels";
    global.announceMethodzStatus?.(shown ? "Supporting panels expanded." : "Supporting panels collapsed.");
  }

  function installSectionObserver() {
    if (!("IntersectionObserver" in global)) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible?.target?.id) return;
      updateActiveNavigation(visible.target.id);
      if (document.body.classList.contains("is-meeting-day-v169")) savePreferences({ lastSectionId: visible.target.id });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.35, 0.65] });
    sectionDefinitions.forEach(([, id]) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function restorePreferences() {
    const preferences = parsePreferences();
    if (preferences.supportingVisible) {
      document.body.classList.add("meeting-day-supporting-visible-v169");
      const button = document.getElementById("meetingDaySupportingToggleV169");
      if (button) button.textContent = "Hide Supporting Panels";
    }
    setMeetingDayMode(preferences.enabled === true, { restore: true });
  }

  function installKeyboardShortcut() {
    global.addEventListener("keydown", (event) => {
      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleMeetingDayV169();
      }
    });
  }

  function start() {
    if (settings.enabled === false) return;
    classifySections();
    installControls();
    classifySections();
    buildNavigation();
    installSectionObserver();
    installKeyboardShortcut();
    restorePreferences();
  }

  global.toggleMeetingDayV169 = toggleMeetingDayV169;
  global.toggleMeetingDaySupportingV169 = toggleMeetingDaySupportingV169;
  global.navigateMeetingDaySectionV169 = navigateToSection;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
