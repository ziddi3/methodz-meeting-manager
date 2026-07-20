/* Methodz Meeting Manager optional static app-shell service worker. */
const CACHE_NAME = "methodz-meeting-manager-v1.6.1";
const APP_SHELL = [
  "./",
  "./meeting.html",
  "./archive.html",
  "./verify.html",
  "./style.css",
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
  "./config.js",
  "./config-v11.js",
  "./config-v12.js",
  "./config-v13.js",
  "./config-v14.js",
  "./config-v15.js",
  "./config-v16.js",
  "./migrations.js",
  "./migrations-v10.js",
  "./migrations-v11.js",
  "./migrations-v12.js",
  "./migrations-v13.js",
  "./migrations-v14.js",
  "./migrations-v15.js",
  "./migrations-v16.js",
  "./data-adapter.js",
  "./async-data-adapter.js",
  "./attachment-adapter.js",
  "./crypto-package-core.js",
  "./workspace-package-core.js",
  "./app.js",
  "./archive.js",
  "./archive-v10.js",
  "./archive-v11.js",
  "./archive-v13.js",
  "./verify.js",
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
  "./features-v16-recovery.js",
  "./features-v16-recovery-guards.js",
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

    if (request.mode === "navigate") {
      return caches.match("./meeting.html");
    }

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
