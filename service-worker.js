/* Methodz Meeting Manager optional static app-shell service worker. */
const CACHE_NAME = "methodz-meeting-manager-v1.6.12";
const PREVIOUS_CACHE_NAME = "methodz-meeting-manager-v1.6.11";
const HISTORICAL_CACHE_NAMES = Object.freeze([
  "methodz-meeting-manager-v1.6.10",
  "methodz-meeting-manager-v1.6.9",
  "methodz-meeting-manager-v1.6.8",
  "methodz-meeting-manager-v1.6.7",
  "methodz-meeting-manager-v1.6.6",
  "methodz-meeting-manager-v1.6.5",
  "methodz-meeting-manager-v1.6.4",
  "methodz-meeting-manager-v1.6.3",
  "methodz-meeting-manager-v1.6.2",
  "methodz-meeting-manager-v1.6.1",
  "methodz-meeting-manager-v1.6.0"
]);
const APP_SHELL = [
  "./",
  "./meeting.html",
  "./archive.html",
  "./verify.html",
  "./preparation.html",
  "./style.css",
  "./meeting-preparation.css",
  "./features-v04.css",
  "./features-v05.css",
  "./features-v06.css",
  "./features-v07.css",
  "./features-v08.css",
  "./features-v09.css",
  "./features-v10.css",
  "./features-v11.css",
  "./features-v12.css",
  "./features-v13.css",
  "./features-v14.css",
  "./features-v15.css",
  "./features-v16.css",
  "./features-v16-recovery.css",
  "./features-v162.css",
  "./features-v165.css",
  "./features-v166.css",
  "./features-v167.css",
  "./features-v168.css",
  "./features-v169.css",
  "./features-v1610.css",
  "./features-v1611.css",
  "./features-v1612.css",
  "./features-v1613.css",
  "./features-v1614-preparation-launch.css",
  "./features-v1615-meeting-run-sheet.css",
  "./config.js",
  "./config-v11.js",
  "./config-v12.js",
  "./config-v13.js",
  "./config-v14.js",
  "./config-v15.js",
  "./config-v16.js",
  "./config-v162.js",
  "./config-v163.js",
  "./config-v164.js",
  "./config-v165.js",
  "./config-v166.js",
  "./config-v167.js",
  "./config-v168.js",
  "./config-v169.js",
  "./config-v1610.js",
  "./config-v1611.js",
  "./config-v1612.js",
  "./migrations.js",
  "./migrations-v10.js",
  "./migrations-v11.js",
  "./migrations-v12.js",
  "./migrations-v13.js",
  "./migrations-v14.js",
  "./migrations-v15.js",
  "./migrations-v16.js",
  "./provider-contract.js",
  "./hosted-provider-adapters.js",
  "./http-provider-pilot.js",
  "./sync-rehearsal-core.js",
  "./sync-rehearsal-hardening.js",
  "./sync-queue-portability.js",
  "./data-adapter.js",
  "./async-data-adapter.js",
  "./attachment-adapter.js",
  "./crypto-package-core.js",
  "./key-custody-core.js",
  "./workspace-package-core.js",
  "./cross-device-transfer-core.js",
  "./transfer-acceptance-core.js",
  "./transfer-acceptance-summary-filter.js",
  "./panel-registry-core.js",
  "./panel-registry-definitions.js",
  "./meeting-review-core.js",
  "./follow-up-planning-core.js",
  "./workspace-capacity-core.js",
  "./meeting-preparation-core.js",
  "./meeting-preparation-launch-core.js",
  "./meeting-run-sheet-core.js",
  "./app.js",
  "./archive.js",
  "./archive-v10.js",
  "./archive-v11.js",
  "./archive-v13.js",
  "./verify.js",
  "./meeting-preparation.js",
  "./features-v03.js",
  "./features-v03-startup.js",
  "./features-v04-templates.js",
  "./features-v04-records.js",
  "./features-v05-attachments.js",
  "./features-v05-directory.js",
  "./features-v05-startup.js",
  "./features-v06-settings.js",
  "./features-v06-governance.js",
  "./features-v07-organizations.js",
  "./features-v07-navigation.js",
  "./features-v08-history.js",
  "./features-v08-workspace.js",
  "./adapter-contract-tests.js",
  "./features-v08-accessibility.js",
  "./features-v09-archive.js",
  "./features-v09-revisions.js",
  "./features-v09-workspace-merge.js",
  "./features-v09-pwa.js",
  "./features-v10-governance.js",
  "./features-v10-signatures.js",
  "./features-v10-release.js",
  "./features-v11-retention.js",
  "./features-v11-redaction.js",
  "./features-v11-redaction-policy.js",
  "./features-v12-export-approval.js",
  "./features-v12-fingerprint-policy.js",
  "./features-v12-release-audit.js",
  "./features-v12-compatibility.js",
  "./features-v13-disposition.js",
  "./features-v14-recipient-policy.js",
  "./features-v14-policy-hardening.js",
  "./features-v15-policy-operations.js",
  "./features-v15-download-routing.js",
  "./features-v16-crypto.js",
  "./features-v16-record-metadata.js",
  "./features-v162-custody.js",
  "./features-v16-recovery.js",
  "./features-v16-recovery-guards.js",
  "./features-v165-sync-rehearsal.js",
  "./features-v166-sync-portability.js",
  "./features-v167-device-readiness.js",
  "./features-v168-transfer-rehearsal.js",
  "./features-v169-transfer-acceptance.js",
  "./features-v169-rollback-stability.js",
  "./features-v1611-follow-up-review.js",
  "./features-v1612-workspace-capacity.js",
  "./features-v1613-follow-up-planning.js",
  "./features-v1610-panel-registry.js",
  "./features-v169-meeting-day.js",
  "./features-v1614-preparation-launch.js",
  "./features-v1615-meeting-run-sheet.js",
  "./manifest.webmanifest",
  "./assets/icons/methodz-meeting.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith("methodz-meeting-manager-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const networkPromise = fetch(request)
      .then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }

    const network = await networkPromise;
    if (network) return network;

    if (request.mode === "navigate") return caches.match("./meeting.html");

    return new Response("Offline resource unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "METHODZ_REFRESH_CACHE") return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset)));
  })());
});

// Historical workflow contract: no background-sync, transfer-import, queue-processing, capacity-cleanup, planning-delivery, preparation-launch, run-sheet-delivery, or review-mutation handler.
// The service worker never reads meeting, task, review, planning, preparation, run-sheet, registry, capacity, transfer, acceptance, rollback, or browser-local business values.
void PREVIOUS_CACHE_NAME;
void HISTORICAL_CACHE_NAMES;
