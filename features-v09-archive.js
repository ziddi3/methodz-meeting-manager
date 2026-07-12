/* Methodz Meeting Manager v0.9 archive search, filters, selection, and bulk export. */
(function initializeV09Archive(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const selectedArchiveIds = new Set();
  let observer = null;

  global.addEventListener("DOMContentLoaded", initializeArchiveWorkspaceV09);

  function initializeArchiveWorkspaceV09() {
    installArchiveToolbarV09();
    patchArchiveRefreshV09();
    observeArchiveListV09();
    refreshArchiveWorkspaceV09();
  }

  function readArchivedV09() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(archiveKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Unable to read archived records", error);
      return [];
    }
  }

  function sortedArchivedV09() {
    return readArchivedV09()
      .slice()
      .sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));
  }

  function installArchiveToolbarV09() {
    const panel = document.getElementById("archiveVaultV08");
    const summary = document.getElementById("archiveVaultSummaryV08");
    if (!panel || !summary || document.getElementById("archiveToolbarV09")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "archiveToolbarV09";
    toolbar.className = "archive-toolbar-v09";
    toolbar.innerHTML = `
      <div class="archive-filter-grid-v09">
        <div>
          <label for="archiveSearchV09">Search Archive</label>
          <input id="archiveSearchV09" type="search" placeholder="Search title, notes, people, tasks..." autocomplete="off" />
        </div>
        <div>
          <label for="archiveStatusV09">Meeting Status</label>
          <select id="archiveStatusV09"><option value="">All statuses</option></select>
        </div>
        <div>
          <label for="archiveOrganizationV09">Organization / Representative</label>
          <select id="archiveOrganizationV09"><option value="">All organizations</option></select>
        </div>
      </div>
      <div class="button-row">
        <button type="button" onclick="selectFilteredArchiveV09()">Select Filtered</button>
        <button type="button" onclick="clearArchiveSelectionV09()">Clear Selection</button>
        <button type="button" onclick="exportSelectedArchiveV09()">Export Selected JSON</button>
        <button type="button" onclick="exportFilteredArchiveV09()">Export Filtered JSON</button>
      </div>
      <p id="archiveFilterSummaryV09" class="helper-text" aria-live="polite">Archive filters ready.</p>
    `;

    panel.insertBefore(toolbar, summary);
    document.getElementById("archiveSearchV09")?.addEventListener("input", applyArchiveFiltersV09);
    document.getElementById("archiveStatusV09")?.addEventListener("change", applyArchiveFiltersV09);
    document.getElementById("archiveOrganizationV09")?.addEventListener("change", applyArchiveFiltersV09);
  }

  function patchArchiveRefreshV09() {
    if (global.__methodzV09ArchiveRefreshPatched || typeof global.renderArchiveVaultV08 !== "function") return;
    const original = global.renderArchiveVaultV08;
    global.renderArchiveVaultV08 = function renderArchiveVaultV09(...args) {
      const result = original.apply(this, args);
      global.setTimeout(refreshArchiveWorkspaceV09, 0);
      return result;
    };
    global.__methodzV09ArchiveRefreshPatched = true;
  }

  function observeArchiveListV09() {
    const list = document.getElementById("archiveVaultListV08");
    if (!list || observer) return;
    observer = new MutationObserver(() => global.setTimeout(refreshArchiveWorkspaceV09, 0));
    observer.observe(list, { childList: true });
  }

  function populateArchiveFilterOptionsV09(entries) {
    const statusSelect = document.getElementById("archiveStatusV09");
    const organizationSelect = document.getElementById("archiveOrganizationV09");
    if (!statusSelect || !organizationSelect) return;

    const currentStatus = statusSelect.value;
    const currentOrganization = organizationSelect.value;
    const statuses = Array.from(new Set(entries.map((entry) => entry.record?.status).filter(Boolean))).sort();
    const organizations = Array.from(new Set(entries.flatMap((entry) => entry.record?.organizations || []).filter(Boolean))).sort();

    statusSelect.innerHTML = '<option value="">All statuses</option>' + statuses.map((status) => `<option value="${escapeV09(status)}">${escapeV09(status)}</option>`).join("");
    organizationSelect.innerHTML = '<option value="">All organizations</option>' + organizations.map((organization) => `<option value="${escapeV09(organization)}">${escapeV09(organization)}</option>`).join("");
    statusSelect.value = statuses.includes(currentStatus) ? currentStatus : "";
    organizationSelect.value = organizations.includes(currentOrganization) ? currentOrganization : "";
  }

  function decorateArchiveCardsV09(entries) {
    const cards = Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08"));
    cards.forEach((card, index) => {
      const entry = entries[index];
      if (!entry) return;
      card.dataset.archiveId = entry.archiveId || "";
      card.dataset.searchText = JSON.stringify(entry).toLowerCase();
      card.dataset.status = String(entry.record?.status || "");
      card.dataset.organizations = JSON.stringify(entry.record?.organizations || []);

      if (!card.querySelector(".archive-select-v09")) {
        const label = document.createElement("label");
        label.className = "archive-select-v09";
        label.innerHTML = `<input type="checkbox" aria-label="Select archived meeting ${escapeV09(entry.record?.meetingNumber || entry.record?.title || "record")}" /> Select`;
        const checkbox = label.querySelector("input");
        checkbox.checked = selectedArchiveIds.has(entry.archiveId);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) selectedArchiveIds.add(entry.archiveId);
          else selectedArchiveIds.delete(entry.archiveId);
          updateArchiveFilterSummaryV09();
        });
        card.insertBefore(label, card.firstChild);
      } else {
        card.querySelector(".archive-select-v09 input").checked = selectedArchiveIds.has(entry.archiveId);
      }
    });
  }

  function refreshArchiveWorkspaceV09() {
    installArchiveToolbarV09();
    const entries = sortedArchivedV09();
    const validIds = new Set(entries.map((entry) => entry.archiveId));
    Array.from(selectedArchiveIds).forEach((id) => {
      if (!validIds.has(id)) selectedArchiveIds.delete(id);
    });
    populateArchiveFilterOptionsV09(entries);
    decorateArchiveCardsV09(entries);
    applyArchiveFiltersV09();
  }

  function getArchiveFiltersV09() {
    return {
      query: String(document.getElementById("archiveSearchV09")?.value || "").trim().toLowerCase(),
      status: String(document.getElementById("archiveStatusV09")?.value || ""),
      organization: String(document.getElementById("archiveOrganizationV09")?.value || "")
    };
  }

  function entryMatchesV09(entry, filters) {
    const record = entry.record || {};
    if (filters.query && !JSON.stringify(entry).toLowerCase().includes(filters.query)) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.organization && !(record.organizations || []).includes(filters.organization)) return false;
    return true;
  }

  function filteredArchiveEntriesV09() {
    const filters = getArchiveFiltersV09();
    return sortedArchivedV09().filter((entry) => entryMatchesV09(entry, filters));
  }

  function applyArchiveFiltersV09() {
    const filters = getArchiveFiltersV09();
    const entries = sortedArchivedV09();
    const byId = new Map(entries.map((entry) => [entry.archiveId, entry]));

    document.querySelectorAll("#archiveVaultListV08 .archived-record-v08").forEach((card) => {
      const entry = byId.get(card.dataset.archiveId);
      card.hidden = !entry || !entryMatchesV09(entry, filters);
    });
    updateArchiveFilterSummaryV09();
  }

  function updateArchiveFilterSummaryV09() {
    const summary = document.getElementById("archiveFilterSummaryV09");
    if (!summary) return;
    const total = sortedArchivedV09().length;
    const visible = filteredArchiveEntriesV09().length;
    summary.textContent = `${visible} of ${total} archived record${total === 1 ? "" : "s"} visible. ${selectedArchiveIds.size} selected.`;
  }

  function selectFilteredArchiveV09() {
    filteredArchiveEntriesV09().forEach((entry) => selectedArchiveIds.add(entry.archiveId));
    refreshArchiveWorkspaceV09();
    announceV09(`${selectedArchiveIds.size} archived record${selectedArchiveIds.size === 1 ? "" : "s"} selected.`);
  }

  function clearArchiveSelectionV09() {
    selectedArchiveIds.clear();
    refreshArchiveWorkspaceV09();
  }

  function exportArchiveEntriesV09(entries, label) {
    if (!entries.length) return alert(`No archived records are available for ${label}.`);
    if (typeof global.downloadBlob !== "function") return alert("Download support is unavailable.");
    const payload = {
      packageType: "methodz-meeting-manager-archive",
      packageVersion: 1,
      schemaVersion: config.schemaVersion || "0.9.0",
      exportedAt: new Date().toISOString(),
      selection: label,
      count: entries.length,
      archivedRecords: entries
    };
    global.downloadBlob(JSON.stringify(payload, null, 2), `methodz-archive-${label}-${todayV09()}.json`, "application/json");
    announceV09(`${entries.length} archived record${entries.length === 1 ? "" : "s"} exported.`);
  }

  function exportSelectedArchiveV09() {
    const entries = sortedArchivedV09().filter((entry) => selectedArchiveIds.has(entry.archiveId));
    exportArchiveEntriesV09(entries, "selected");
  }

  function exportFilteredArchiveV09() {
    exportArchiveEntriesV09(filteredArchiveEntriesV09(), "filtered");
  }

  function todayV09() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeV09(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV09(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.refreshArchiveWorkspaceV09 = refreshArchiveWorkspaceV09;
  global.applyArchiveFiltersV09 = applyArchiveFiltersV09;
  global.selectFilteredArchiveV09 = selectFilteredArchiveV09;
  global.clearArchiveSelectionV09 = clearArchiveSelectionV09;
  global.exportSelectedArchiveV09 = exportSelectedArchiveV09;
  global.exportFilteredArchiveV09 = exportFilteredArchiveV09;
})(window);
