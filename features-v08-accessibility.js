/* Methodz Meeting Manager v0.8 accessibility and keyboard navigation. */
(function initializeAccessibility(global) {
  "use strict";

  let fieldSequence = 0;

  global.addEventListener("DOMContentLoaded", initializeV08Accessibility);

  function initializeV08Accessibility() {
    installSkipLinkV08();
    installLiveRegionV08();
    installKeyboardHelpV08();
    improveLandmarksV08();
    patchDynamicFormBuildersV08();
    patchStatusActionsV08();
    applyDynamicLabelsV08(document);
    bindKeyboardShortcutsV08();
  }

  function installSkipLinkV08() {
    if (document.querySelector(".skip-link-v08")) return;
    const link = document.createElement("a");
    link.className = "skip-link-v08";
    link.href = "#mainContent";
    link.textContent = "Skip to meeting workspace";
    document.body.prepend(link);
  }

  function installLiveRegionV08() {
    if (document.getElementById("methodzStatusRegionV08")) return;
    const region = document.createElement("div");
    region.id = "methodzStatusRegionV08";
    region.className = "visually-hidden-v08";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    document.body.appendChild(region);
  }

  function installKeyboardHelpV08() {
    const header = document.querySelector(".app-header");
    if (!header || document.getElementById("keyboardHelpV08")) return;

    const panel = document.createElement("section");
    panel.id = "keyboardHelpV08";
    panel.className = "keyboard-help-v08 is-hidden";
    panel.setAttribute("aria-labelledby", "keyboardHelpTitleV08");
    panel.innerHTML = `
      <div>
        <h2 id="keyboardHelpTitleV08">Keyboard Shortcuts</h2>
        <button type="button" class="keyboard-help-close-v08" aria-label="Close keyboard shortcuts">Close</button>
      </div>
      <dl>
        <div><dt>Ctrl / Command + S</dt><dd>Save the current meeting</dd></div>
        <div><dt>Ctrl / Command + Shift + N</dt><dd>Start a new meeting</dd></div>
        <div><dt>Alt + R</dt><dd>Focus saved-record search</dd></div>
        <div><dt>Alt + A</dt><dd>Jump to Archive Vault</dd></div>
        <div><dt>Alt + H</dt><dd>Show or hide this shortcut guide</dd></div>
        <div><dt>Escape</dt><dd>Close the shortcut guide or revision history</dd></div>
      </dl>
    `;

    header.insertAdjacentElement("afterend", panel);
    panel.querySelector("button")?.addEventListener("click", closeKeyboardHelpV08);
  }

  function improveLandmarksV08() {
    const main = document.querySelector("main.app-shell");
    if (main) {
      main.id = main.id || "mainContent";
      main.tabIndex = -1;
    }

    const quickActions = document.querySelector(".quick-actions");
    if (quickActions) quickActions.setAttribute("aria-label", "Meeting quick actions");

    document.querySelectorAll("section.card").forEach((section, index) => {
      const heading = section.querySelector("h2");
      if (!heading) return;
      if (!heading.id) heading.id = `section-heading-v08-${index + 1}`;
      section.setAttribute("aria-labelledby", heading.id);
    });

    const signatureHelp = document.createElement("p");
    signatureHelp.id = "signatureHelpV08";
    signatureHelp.className = "visually-hidden-v08";
    signatureHelp.textContent = "Typing a full name records a meeting-specific digital signature. Signatures are not stored in reusable directories.";
    document.body.appendChild(signatureHelp);
  }

  function patchDynamicFormBuildersV08() {
    patchBuilderV08("addAttendee", ".attendee", true);
    patchBuilderV08("addTask", ".task", true);
    patchBuilderV08("addStructuredDecision", ".decision-item", true);
    patchBuilderV08("addAttachmentReferenceV05", ".attachment-reference-item", true);
  }

  function patchBuilderV08(functionName, itemSelector, focusFirstInput) {
    const original = global[functionName];
    if (typeof original !== "function" || original.__methodzAccessibilityPatched) return;

    const wrapped = function accessibleBuilderV08(...args) {
      const before = document.querySelectorAll(itemSelector).length;
      const result = original.apply(this, args);
      const items = document.querySelectorAll(itemSelector);
      const item = items[items.length - 1];
      if (item && items.length >= before) {
        applyDynamicLabelsV08(item);
        if (focusFirstInput && args.length === 0) {
          const field = item.querySelector("input:not([type='hidden']), select, textarea");
          field?.focus({ preventScroll: false });
        }
      }
      return result;
    };

    wrapped.__methodzAccessibilityPatched = true;
    global[functionName] = wrapped;
  }

  function patchStatusActionsV08() {
    patchActionV08("saveMeeting", "Meeting save completed.");
    patchActionV08("startNewMeeting", "New meeting workspace opened.");
    patchActionV08("clearMeeting", "Meeting form cleared.");
  }

  function patchActionV08(functionName, message) {
    const original = global[functionName];
    if (typeof original !== "function" || original.__methodzStatusPatched) return;

    const wrapped = function statusActionV08(...args) {
      const result = original.apply(this, args);
      announceMethodzStatus(message);
      return result;
    };
    wrapped.__methodzStatusPatched = true;
    global[functionName] = wrapped;
  }

  function applyDynamicLabelsV08(root) {
    const containers = root.matches?.(".attendee, .task, .decision-item, .attachment-reference-item")
      ? [root]
      : Array.from(root.querySelectorAll?.(".attendee, .task, .decision-item, .attachment-reference-item") || []);

    containers.forEach((container) => {
      container.querySelectorAll("label").forEach((label) => {
        let field = label.querySelector("input, select, textarea");
        if (!field) {
          let candidate = label.nextElementSibling;
          while (candidate && !candidate.matches("input, select, textarea")) {
            if (candidate.querySelector?.("input, select, textarea")) {
              field = candidate.querySelector("input, select, textarea");
              break;
            }
            candidate = candidate.nextElementSibling;
          }
          if (!field && candidate?.matches("input, select, textarea")) field = candidate;
        }
        if (!field) return;

        if (!field.id) field.id = `methodz-field-v08-${++fieldSequence}`;
        if (!label.contains(field)) label.htmlFor = field.id;
        if (field.classList.contains("attendee-signature")) field.setAttribute("aria-describedby", "signatureHelpV08");
      });

      const heading = container.querySelector("h3");
      if (heading) {
        if (!heading.id) heading.id = `methodz-item-heading-v08-${++fieldSequence}`;
        container.setAttribute("aria-labelledby", heading.id);
      }
    });
  }

  function bindKeyboardShortcutsV08() {
    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && !event.altKey && key === "s") {
        event.preventDefault();
        global.saveMeeting?.();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && key === "n") {
        event.preventDefault();
        global.startNewMeeting?.();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && key === "r") {
        event.preventDefault();
        const search = document.getElementById("recordSearch");
        search?.focus();
        search?.scrollIntoView({ block: "center", behavior: reducedMotionV08() ? "auto" : "smooth" });
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && key === "a") {
        event.preventDefault();
        const vault = document.getElementById("archiveVaultV08");
        vault?.focus();
        vault?.scrollIntoView({ block: "start", behavior: reducedMotionV08() ? "auto" : "smooth" });
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey && key === "h") {
        event.preventDefault();
        toggleKeyboardHelpV08();
        return;
      }

      if (event.key === "Escape") {
        closeKeyboardHelpV08();
        global.closeRevisionHistoryV08?.();
      }
    });
  }

  function toggleKeyboardHelpV08() {
    const panel = document.getElementById("keyboardHelpV08");
    if (!panel) return;
    const opening = panel.classList.contains("is-hidden");
    panel.classList.toggle("is-hidden");
    if (opening) {
      panel.tabIndex = -1;
      panel.focus();
      announceMethodzStatus("Keyboard shortcut guide opened.");
    }
  }

  function closeKeyboardHelpV08() {
    const panel = document.getElementById("keyboardHelpV08");
    if (!panel || panel.classList.contains("is-hidden")) return;
    panel.classList.add("is-hidden");
    announceMethodzStatus("Keyboard shortcut guide closed.");
  }

  function announceMethodzStatus(message) {
    const region = document.getElementById("methodzStatusRegionV08");
    if (!region) return;
    region.textContent = "";
    global.setTimeout(() => {
      region.textContent = String(message || "");
    }, 20);
  }

  function reducedMotionV08() {
    return global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  global.announceMethodzStatus = announceMethodzStatus;
  global.toggleKeyboardHelpV08 = toggleKeyboardHelpV08;
  global.closeKeyboardHelpV08 = closeKeyboardHelpV08;
  global.applyDynamicLabelsV08 = applyDynamicLabelsV08;
})(window);
