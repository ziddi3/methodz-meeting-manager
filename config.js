/*
  Methodz Meeting Manager configuration.
  Keep this file simple so the app can still run by opening meeting.html directly.
*/

window.METHODZ_MEETING_CONFIG = {
  schemaVersion: "0.6.0",
  storageKeys: {
    records: "methodzMeetingRecords",
    draft: "methodzMeetingDraft",
    templates: "methodzMeetingTemplates",
    directory: "methodzMeetingDirectory",
    numbering: "methodzMeetingNumbering",
    organizationPresets: "methodzOrganizationPresets",
    syncQueue: "methodzSyncQueue",
    syncLastExport: "methodzSyncLastExport"
  },
  brand: {
    appName: "Methodz Meeting Manager",
    subtitle: "Canadian Soft Water Corporation × Method HVAC Inc. Partnership Records",
    note: "Methodz is used here as a shared brand identity and operating ecosystem."
  },
  logos: [
    {
      id: "cswLogo",
      path: "assets/logos/csw-logo.png",
      alt: "Canadian Soft Water logo placeholder",
      fallback: "Canadian Soft Water"
    },
    {
      id: "methodHvacLogo",
      path: "assets/logos/method-hvac-logo.png",
      alt: "Method HVAC logo placeholder",
      fallback: "Method HVAC"
    },
    {
      id: "methodzBrandLogo",
      path: "assets/logos/methodz-brand.png",
      alt: "Methodz brand mark placeholder",
      fallback: "Methodz Brand Mark"
    }
  ],
  organizations: [
    "Canadian Soft Water Corporation",
    "Method HVAC Inc.",
    "Sole Proprietor / Partner",
    "Guest / Other"
  ],
  organizationPresets: [
    {
      id: "csw-method-hvac",
      label: "CSW + Method HVAC",
      organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."]
    },
    {
      id: "csw-only",
      label: "Canadian Soft Water Only",
      organizations: ["Canadian Soft Water Corporation"]
    },
    {
      id: "method-hvac-only",
      label: "Method HVAC Only",
      organizations: ["Method HVAC Inc."]
    },
    {
      id: "partner-guest-review",
      label: "Partner / Guest Review",
      organizations: ["Sole Proprietor / Partner", "Guest / Other"]
    }
  ],
  attendanceTypes: ["In Person", "Remote", "Phone"],
  priorities: ["Normal", "Low", "High", "Critical"],
  taskStatuses: ["Pending", "In Progress", "Completed"],
  meetingStatuses: ["Scheduled", "In Progress", "Completed", "Archived"],
  meetingNumbering: {
    prefix: "",
    padding: 3,
    nextNumber: null,
    includeYear: false
  },
  attachmentTypes: [
    "Photo",
    "Quote",
    "Invoice",
    "Drawing",
    "Logo / Brand Asset",
    "Install Note",
    "Customer Communication",
    "CRM Reference",
    "Other"
  ],
  meetingTemplates: [
    {
      id: "operations-review",
      label: "Operations Review",
      title: "Operations Review Meeting",
      status: "Scheduled",
      organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."],
      notesPrompt: "Operations focus: scheduling, workload, travel, compensation, installer support, and follow-up accountability.",
      summaryPrompt: "Summarize operational decisions, unresolved constraints, and the next scheduling actions.",
      starterTasks: [
        {
          task: "Confirm next scheduling changes and responsible person",
          assignedTo: "",
          priority: "High",
          due: "",
          status: "Pending"
        },
        {
          task: "Review open workload or travel concerns before next meeting",
          assignedTo: "",
          priority: "Normal",
          due: "",
          status: "Pending"
        }
      ]
    },
    {
      id: "marketing-branding",
      label: "Marketing & Branding Review",
      title: "Marketing and Branding Review",
      status: "Scheduled",
      organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."],
      notesPrompt: "Marketing focus: logo status, franchise separation, Method HVAC inclusion, vehicle decals, uniforms, print materials, and shared Methodz brand alignment.",
      summaryPrompt: "Summarize brand decisions, required assets, and next marketing deliverables.",
      starterTasks: [
        {
          task: "List marketing assets that need approval or replacement",
          assignedTo: "",
          priority: "High",
          due: "",
          status: "Pending"
        }
      ]
    },
    {
      id: "crm-workflow",
      label: "CRM & Workflow Build",
      title: "CRM and Workflow Build Meeting",
      status: "Scheduled",
      organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."],
      notesPrompt: "Workflow focus: customer capture, CRM stages, installer scheduling, meeting archive process, lead source tracking, and follow-up automations.",
      summaryPrompt: "Summarize workflow changes, CRM tasks, blockers, and launch-readiness status.",
      starterTasks: [
        {
          task: "Confirm which customer fields must be captured before install scheduling",
          assignedTo: "",
          priority: "Critical",
          due: "",
          status: "Pending"
        },
        {
          task: "Check that saved meeting records can be exported before workflow changes go live",
          assignedTo: "",
          priority: "Normal",
          due: "",
          status: "Pending"
        }
      ]
    }
  ],
  agendaGroups: [
    {
      name: "Operations",
      items: [
        "Scheduling and advance notice",
        "Childcare support for last-minute jobs",
        "Compensation and workload review",
        "Travel, meals, and weekend policy",
        "Employee retention and workload sustainability"
      ]
    },
    {
      name: "Marketing & Branding",
      items: [
        "Current marketing channels",
        "Method HVAC marketing inclusion",
        "Canadian Soft Water logo decision",
        "Old franchise logo removal",
        "New merchandise and branded materials",
        "Vehicle decals, uniforms, hats, business cards, and print materials",
        "Brand relationship between CSW, Method HVAC, and the Methodz brand identity",
        "Visual separation versus shared brand alignment"
      ]
    },
    {
      name: "Technology & Workflow",
      items: [
        "CRM and workflow improvements",
        "Meeting records app proposal",
        "Customer communication process",
        "Installer scheduling workflow",
        "Records, signatures, and meeting archive process"
      ]
    }
  ]
};
