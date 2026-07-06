/*
  Methodz Meeting Manager configuration.
  Keep this file simple so the app can still run by opening meeting.html directly.
*/

window.METHODZ_MEETING_CONFIG = {
  schemaVersion: "0.3.0",
  storageKeys: {
    records: "methodzMeetingRecords",
    draft: "methodzMeetingDraft"
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
  attendanceTypes: ["In Person", "Remote", "Phone"],
  priorities: ["Normal", "Low", "High", "Critical"],
  taskStatuses: ["Pending", "In Progress", "Completed"],
  meetingStatuses: ["Scheduled", "In Progress", "Completed", "Archived"],
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
