# Methodz Meeting Manager

A professional, offline-first business meeting management application for **Method HVAC Inc.**, **Canadian Soft Water Corporation**, and future partner organizations.

## Features

| Feature | Status |
|---|---|
| Meeting planning (create, edit, delete) | ✅ |
| Attendance tracking | ✅ |
| Digital signatures (canvas-based) | ✅ |
| Meeting minutes editor | ✅ |
| Action items (with priority, assignee, due date) | ✅ |
| Decision tracking | ✅ |
| Meeting archive with pagination | ✅ |
| Full-text search | ✅ |
| PDF / print export | ✅ |
| Offline-first (localStorage) | ✅ |
| Responsive, mobile-friendly UI | ✅ |
| Web App Manifest (PWA-ready) | ✅ |

## Getting Started

Open `index.html` in any modern browser — no build step required.

For local development with ES modules, serve from a local HTTP server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Project Structure

```
index.html          App shell
manifest.json       Web App Manifest
css/
  styles.css        All styles (variables, layout, components, responsive, print)
js/
  utils.js          UUID generation, date helpers, debounce, escapeHtml
  db.js             LocalStorage data layer
  meetings.js       Meeting CRUD and filtering
  attendance.js     Attendee management helpers
  actions.js        Action item helpers
  decisions.js      Decision tracking helpers
  minutes.js        Minutes utilities
  signatures.js     Canvas-based digital signature widget
  search.js         Full-text search across all meeting fields
  pdf.js            PDF / print export (browser print dialog)
  ui.js             DOM rendering helpers, view and component builders
  app.js            App initialisation, routing, event coordination
```

## Technology

- **HTML5** — semantic markup, ARIA accessibility
- **CSS3** — custom properties, CSS Grid, Flexbox, responsive design
- **Vanilla JavaScript** — ES modules, no frameworks
- **localStorage** — offline-first data persistence

## Future Features

- Firebase synchronization between users
- Audio recording
- Video meetings
- AI-generated summaries
- Calendar integration
- CRM integration
- Multi-company support
- Push notifications
- Cloud document signing
