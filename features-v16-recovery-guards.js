/* Methodz Meeting Manager v1.6.1 strict validation guards for legacy restore and merge controls. */
(function installRecoveryValidationGuardsV16(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    guardApplyFunction("applyWorkspaceRestoreV08", "workspaceRestoreFileV08", "restore");
    guardApplyFunction("applyWorkspaceMergeV09", "workspaceMergeFileV09", "merge");
  });

  function guardApplyFunction(functionName, inputId, operationLabel) {
    const original = global[functionName];
    if (typeof original !== "function" || original.__methodzRecoveryGuarded) return;

    async function guardedApply() {
      const file = document.getElementById(inputId)?.files?.[0];
      if (!file) return original.apply(this, arguments);

      try {
        const payload = JSON.parse(await file.text());
        getCore().assertValidWorkspacePackage(payload, validationOptions());
        return original.apply(this, arguments);
      } catch (error) {
        console.error(`Workspace ${operationLabel} blocked`, error);
        const details = Array.isArray(error?.report?.errors) && error.report.errors.length
          ? `\n\n${error.report.errors.join("\n")}`
          : "";
        alert(`Workspace ${operationLabel} blocked: ${error.message || error}${details}`);
        if (typeof global.announceMethodzStatus === "function") {
          global.announceMethodzStatus(`Workspace ${operationLabel} blocked by package validation.`);
        }
      }
    }

    guardedApply.__methodzRecoveryGuarded = true;
    guardedApply.__methodzOriginal = original;
    global[functionName] = guardedApply;
  }

  function validationOptions() {
    const config = global.METHODZ_MEETING_CONFIG || {};
    const recovery = config.workspaceRecovery || {};
    return {
      preRestoreKey: config.storageKeys?.preRestoreBackup || "methodzPreRestoreBackup",
      storageKeys: config.storageKeys || {},
      limits: getCore().normalizeLimits({
        maxEntries: recovery.maximumEntries,
        maxEntryBytes: recovery.maximumEntryBytes,
        maxTotalBytes: recovery.maximumPackageBytes
      })
    };
  }

  function getCore() {
    const core = global.MethodzWorkspacePackageCore;
    if (!core) throw new Error("Workspace package validation core is unavailable.");
    return core;
  }
})(window);
