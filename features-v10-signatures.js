/* Methodz Meeting Manager v1.0 signature consent and verification controls. */
(function initializeMethodzSignaturesV10(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const consentConfig = config.signatureConsent || {
    version: "1.0",
    statement: "I consent to use my typed full name as an electronic signature for this meeting record."
  };

  global.addEventListener("DOMContentLoaded", initializeSignaturesV10);

  function initializeSignaturesV10() {
    installSignatureToolbarV10();
    patchAttendeeBuilderV10();
    patchRemoveBlockV10();
    document.querySelectorAll(".attendee").forEach((row) => enhanceAttendeeRowV10(row, {}));
    patchSignatureDataFlowV10();
    restoreSignatureDraftV10();
    refreshSignatureReviewV10();
  }

  function restoreSignatureDraftV10() {
    try {
      const draftKey = config.storageKeys?.draft || "methodzMeetingDraft";
      const draft = JSON.parse(global.localStorage.getItem(draftKey));
      if (!Array.isArray(draft?.attendees)) return;
      document.querySelectorAll(".attendee").forEach((row, index) => applySignatureDataV10(row, draft.attendees[index] || {}));
    } catch (error) {
      console.warn("Unable to restore v1.0 signature draft data", error);
    }
  }

  function installSignatureToolbarV10() {
    const attendanceCard = document.getElementById("attendeeList")?.closest(".card");
    if (!attendanceCard || document.getElementById("signatureReviewV10")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "signatureReviewV10";
    toolbar.className = "signature-review-v10";
    toolbar.innerHTML = `
      <div>
        <strong>Signature Consent Review</strong>
        <p class="helper-text">A typed signature cannot be saved unless the attendee consent box is recorded. “Name Match” only confirms that the typed signature text matches the attendee name; it does not prove legal identity.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="refreshSignatureReviewV10()">Review Signatures</button>
        <button type="button" onclick="markMatchingSignaturesV10()">Mark Exact Name Matches</button>
      </div>
      <div id="signatureReviewSummaryV10" aria-live="polite"></div>
    `;
    attendanceCard.querySelector("#attendeeList").insertAdjacentElement("beforebegin", toolbar);
  }

  function patchAttendeeBuilderV10() {
    if (global.__methodzV10AttendeeBuilderPatched || typeof global.addAttendee !== "function") return;
    const original = global.addAttendee;
    global.addAttendee = function addAttendeeSignaturesV10(data = {}) {
      const result = original(data);
      const rows = document.querySelectorAll(".attendee");
      const row = rows[rows.length - 1];
      if (row) enhanceAttendeeRowV10(row, data);
      refreshSignatureReviewV10();
      return result;
    };
    global.__methodzV10AttendeeBuilderPatched = true;
  }

  function patchRemoveBlockV10() {
    if (global.__methodzV10RemoveBlockPatched || typeof global.removeBlock !== "function") return;
    const original = global.removeBlock;
    global.removeBlock = function removeBlockSignaturesV10(button) {
      const result = original(button);
      refreshSignatureReviewV10();
      return result;
    };
    global.__methodzV10RemoveBlockPatched = true;
  }

  function enhanceAttendeeRowV10(row, data = {}) {
    if (!row || row.querySelector(".signature-controls-v10")) return;
    const index = Array.from(document.querySelectorAll(".attendee")).indexOf(row) + 1;
    const consent = data.signatureConsent || {};
    const verification = data.signatureVerification || {};
    const controls = document.createElement("div");
    controls.className = "signature-controls-v10";
    controls.innerHTML = `
      <fieldset>
        <legend>Electronic Signature Consent</legend>
        <label class="consent-label-v10">
          <input type="checkbox" class="signature-consent-accepted-v10" ${consent.accepted ? "checked" : ""} />
          ${escapeSignatureV10(consentConfig.statement)}
        </label>
        <div class="form-grid">
          <div>
            <label for="signatureConsentVersionV10-${index}">Consent Statement Version</label>
            <input id="signatureConsentVersionV10-${index}" class="signature-consent-version-v10" type="text" value="${escapeSignatureV10(consent.statementVersion || consentConfig.version || "1.0")}" readonly />
          </div>
          <div>
            <label for="signatureConsentAtV10-${index}">Consent Recorded At</label>
            <input id="signatureConsentAtV10-${index}" class="signature-consent-at-v10" type="text" value="${escapeSignatureV10(consent.acceptedAt || "")}" readonly />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Signature Verification</legend>
        <div class="form-grid">
          <div>
            <label for="signatureVerificationStatusV10-${index}">Verification Status</label>
            <select id="signatureVerificationStatusV10-${index}" class="signature-verification-status-v10">
              ${["Unverified", "Name Match", "Confirmed In Person", "Confirmed Remotely", "Declined"].map((status) => `<option value="${escapeSignatureV10(status)}"${status === (verification.status || "Unverified") ? " selected" : ""}>${escapeSignatureV10(status)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="signatureVerifiedByV10-${index}">Verified By</label>
            <input id="signatureVerifiedByV10-${index}" class="signature-verified-by-v10" type="text" value="${escapeSignatureV10(verification.verifiedBy || "")}" placeholder="Person confirming the signature" />
          </div>
        </div>
        <label for="signatureVerificationNoteV10-${index}">Verification Note</label>
        <input id="signatureVerificationNoteV10-${index}" class="signature-verification-note-v10" type="text" value="${escapeSignatureV10(verification.note || "")}" placeholder="How was the signature confirmed?" />
        <input class="signature-verified-at-v10" type="hidden" value="${escapeSignatureV10(verification.verifiedAt || "")}" />
      </fieldset>
    `;

    row.appendChild(controls);
    controls.querySelector(".signature-consent-accepted-v10")?.addEventListener("change", (event) => {
      const acceptedAt = controls.querySelector(".signature-consent-at-v10");
      if (acceptedAt) acceptedAt.value = event.target.checked ? new Date().toISOString() : "";
      refreshSignatureReviewV10();
      scheduleSignatureDraftV10();
    });
    controls.querySelector(".signature-verification-status-v10")?.addEventListener("change", (event) => {
      const verifiedAt = controls.querySelector(".signature-verified-at-v10");
      if (verifiedAt) verifiedAt.value = event.target.value === "Unverified" ? "" : new Date().toISOString();
      refreshSignatureReviewV10();
      scheduleSignatureDraftV10();
    });
    controls.addEventListener("input", scheduleSignatureDraftV10);
    controls.addEventListener("change", scheduleSignatureDraftV10);
  }

  function patchSignatureDataFlowV10() {
    if (!global.__methodzV10SignatureCollectPatched && typeof global.collectMeetingData === "function") {
      const original = global.collectMeetingData;
      global.collectMeetingData = function collectMeetingDataSignaturesV10(options = {}) {
        const meeting = original(options);
        const meaningfulRows = Array.from(document.querySelectorAll(".attendee")).filter((row) => {
          const name = row.querySelector(".attendee-name")?.value.trim();
          const role = row.querySelector(".attendee-role")?.value.trim();
          const signature = row.querySelector(".attendee-signature")?.value.trim();
          return options.keepEmptyRows || name || role || signature;
        });

        meeting.attendees = (meeting.attendees || []).map((person, index) => {
          const row = meaningfulRows[index];
          const accepted = Boolean(row?.querySelector(".signature-consent-accepted-v10")?.checked);
          const verificationStatus = row?.querySelector(".signature-verification-status-v10")?.value || "Unverified";
          return {
            ...person,
            signatureConsent: {
              accepted,
              statementVersion: row?.querySelector(".signature-consent-version-v10")?.value || consentConfig.version || "1.0",
              method: "typed-name",
              acceptedAt: accepted ? (row?.querySelector(".signature-consent-at-v10")?.value || new Date().toISOString()) : ""
            },
            signatureVerification: {
              status: verificationStatus,
              verifiedBy: row?.querySelector(".signature-verified-by-v10")?.value.trim() || "",
              verifiedAt: verificationStatus === "Unverified" ? "" : (row?.querySelector(".signature-verified-at-v10")?.value || new Date().toISOString()),
              note: row?.querySelector(".signature-verification-note-v10")?.value.trim() || ""
            }
          };
        });

        meeting.signatureAudit = buildSignatureAuditV10(meeting.attendees);
        return meeting;
      };
      global.__methodzV10SignatureCollectPatched = true;
    }

    if (!global.__methodzV10SignaturePopulatePatched && typeof global.populateForm === "function") {
      const original = global.populateForm;
      global.populateForm = function populateFormSignaturesV10(record, options = {}) {
        original(record, options);
        document.querySelectorAll(".attendee").forEach((row, index) => {
          if (!row.querySelector(".signature-controls-v10")) enhanceAttendeeRowV10(row, record.attendees?.[index] || {});
          applySignatureDataV10(row, record.attendees?.[index] || {});
        });
        refreshSignatureReviewV10();
      };
      global.__methodzV10SignaturePopulatePatched = true;
    }

    if (!global.__methodzV10SignatureResetPatched && typeof global.resetForm === "function") {
      const original = global.resetForm;
      global.resetForm = function resetFormSignaturesV10() {
        original();
        document.querySelectorAll(".attendee").forEach((row) => {
          if (!row.querySelector(".signature-controls-v10")) enhanceAttendeeRowV10(row, {});
        });
        refreshSignatureReviewV10();
      };
      global.__methodzV10SignatureResetPatched = true;
    }

    if (!global.__methodzV10SignatureValidationPatched && typeof global.validateMeeting === "function") {
      const original = global.validateMeeting;
      global.validateMeeting = function validateMeetingSignaturesV10(meeting) {
        const baseError = original(meeting);
        if (baseError) return baseError;
        const unsignedConsent = (meeting.attendees || []).find((person) => person.signature && !person.signatureConsent?.accepted);
        if (unsignedConsent) return `Signature consent is required for ${unsignedConsent.name || "each attendee"} before saving a typed signature.`;
        const declined = (meeting.attendees || []).find((person) => person.signatureVerification?.status === "Declined" && person.signature);
        if (declined) return `Remove the declined signature for ${declined.name || "the attendee"} or update its verification status before saving.`;
        return null;
      };
      global.__methodzV10SignatureValidationPatched = true;
    }

    if (!global.__methodzV10SignatureTextPatched && typeof global.createPlainTextMeeting === "function") {
      const original = global.createPlainTextMeeting;
      global.createPlainTextMeeting = function createPlainTextMeetingSignaturesV10(meeting) {
        const audit = meeting.signatureAudit || buildSignatureAuditV10(meeting.attendees || []);
        return `${original(meeting)}\nSIGNATURE CONSENT & VERIFICATION\nSigned: ${audit.signedCount || 0}\nConsent Recorded: ${audit.consentCount || 0}\nVerified: ${audit.verifiedCount || 0}\nConsent Statement Version: ${audit.consentStatementVersion || consentConfig.version || "1.0"}\n`;
      };
      global.__methodzV10SignatureTextPatched = true;
    }
  }

  function applySignatureDataV10(row, person = {}) {
    const consent = person.signatureConsent || {};
    const verification = person.signatureVerification || {};
    const accepted = row.querySelector(".signature-consent-accepted-v10");
    if (accepted) accepted.checked = Boolean(consent.accepted);
    const version = row.querySelector(".signature-consent-version-v10");
    if (version) version.value = consent.statementVersion || consentConfig.version || "1.0";
    const acceptedAt = row.querySelector(".signature-consent-at-v10");
    if (acceptedAt) acceptedAt.value = consent.acceptedAt || "";
    const status = row.querySelector(".signature-verification-status-v10");
    if (status) status.value = verification.status || "Unverified";
    const verifiedBy = row.querySelector(".signature-verified-by-v10");
    if (verifiedBy) verifiedBy.value = verification.verifiedBy || "";
    const note = row.querySelector(".signature-verification-note-v10");
    if (note) note.value = verification.note || "";
    const verifiedAt = row.querySelector(".signature-verified-at-v10");
    if (verifiedAt) verifiedAt.value = verification.verifiedAt || "";
  }

  function buildSignatureAuditV10(attendees) {
    const people = Array.isArray(attendees) ? attendees : [];
    const signed = people.filter((person) => Boolean(person.signature));
    return {
      attendeeCount: people.length,
      signedCount: signed.length,
      consentCount: signed.filter((person) => person.signatureConsent?.accepted).length,
      verifiedCount: signed.filter((person) => person.signatureVerification?.status && person.signatureVerification.status !== "Unverified").length,
      consentMissingCount: signed.filter((person) => !person.signatureConsent?.accepted).length,
      consentStatementVersion: consentConfig.version || "1.0",
      reviewedAt: new Date().toISOString()
    };
  }

  function refreshSignatureReviewV10() {
    const body = document.getElementById("signatureReviewSummaryV10");
    if (!body) return;
    const rows = Array.from(document.querySelectorAll(".attendee"));
    const signed = rows.filter((row) => row.querySelector(".attendee-signature")?.value.trim());
    const consented = signed.filter((row) => row.querySelector(".signature-consent-accepted-v10")?.checked);
    const verified = signed.filter((row) => {
      const status = row.querySelector(".signature-verification-status-v10")?.value || "Unverified";
      return status !== "Unverified" && status !== "Declined";
    });
    body.innerHTML = `
      <span><strong>${signed.length}</strong> signed</span>
      <span><strong>${consented.length}</strong> consented</span>
      <span><strong>${verified.length}</strong> verified</span>
      <span class="${signed.length === consented.length ? "is-ready-v10" : "has-issue-v10"}"><strong>${signed.length - consented.length}</strong> consent issue${signed.length - consented.length === 1 ? "" : "s"}</span>
    `;
  }

  function markMatchingSignaturesV10() {
    const draft = typeof global.collectMeetingData === "function" ? global.collectMeetingData({ keepEmptyRows: true, forceNewId: true }) : null;
    if (global.MethodzGovernanceV10 && !global.MethodzGovernanceV10.canRolePerform(draft, "verifySignatures")) {
      alert(`The ${global.MethodzGovernanceV10.getCurrentRole()} role is not allowed to verify signatures under this record policy.`);
      return;
    }

    let matched = 0;
    document.querySelectorAll(".attendee").forEach((row) => {
      const name = normalizeSignatureV10(row.querySelector(".attendee-name")?.value);
      const signature = normalizeSignatureV10(row.querySelector(".attendee-signature")?.value);
      const consent = row.querySelector(".signature-consent-accepted-v10")?.checked;
      if (!name || !signature || !consent || name !== signature) return;
      const status = row.querySelector(".signature-verification-status-v10");
      const verifiedAt = row.querySelector(".signature-verified-at-v10");
      const verifiedBy = row.querySelector(".signature-verified-by-v10");
      const note = row.querySelector(".signature-verification-note-v10");
      if (status) status.value = "Name Match";
      if (verifiedAt) verifiedAt.value = new Date().toISOString();
      if (verifiedBy && !verifiedBy.value.trim()) verifiedBy.value = document.getElementById("meetingChair")?.value.trim() || global.MethodzGovernanceV10?.getCurrentRole() || "";
      if (note && !note.value.trim()) note.value = "Typed signature text exactly matches the attendee name.";
      matched += 1;
    });
    refreshSignatureReviewV10();
    scheduleSignatureDraftV10();
    alert(matched ? `Marked ${matched} exact typed-name match${matched === 1 ? "" : "es"}.` : "No signed and consented attendee names exactly matched their typed signatures.");
  }

  function normalizeSignatureV10(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function scheduleSignatureDraftV10() {
    if (typeof global.scheduleDraftSave === "function") global.scheduleDraftSave();
  }

  function escapeSignatureV10(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  global.refreshSignatureReviewV10 = refreshSignatureReviewV10;
  global.markMatchingSignaturesV10 = markMatchingSignaturesV10;
  global.MethodzSignaturesV10 = {
    version: "1.0.0",
    consentVersion: consentConfig.version || "1.0",
    buildAudit: buildSignatureAuditV10,
    refresh: refreshSignatureReviewV10
  };
})(window);
