# Release Checklist

## Code

- [ ] Every JavaScript file passes `node --check`.
- [ ] Both HTML entry points load all required v1.0 modules.
- [ ] Service-worker cache includes all v1.0 assets.
- [ ] Direct-file mode remains operational.
- [ ] Localhost hosted mode remains operational.

## Data

- [ ] v0.1 through v0.9 sample records migrate.
- [ ] Unknown fields survive migration.
- [ ] Existing signatures are not silently marked consented.
- [ ] Workspace backup includes new storage keys.
- [ ] Restore and merge preserve v1.0 fields.
- [ ] Archive and revision snapshots preserve v1.0 fields.

## Workflow

- [ ] Required title/date validation passes.
- [ ] Signature consent blocking works.
- [ ] Declined signatures cannot be saved.
- [ ] Role-aware edit and export controls work.
- [ ] Consolidated workspace filters work.
- [ ] Release audit export is valid JSON.

## Accessibility

- [ ] All new controls have labels.
- [ ] Keyboard focus is visible.
- [ ] Tables remain horizontally scrollable on small screens.
- [ ] Live regions announce important status changes.
- [ ] Reduced-motion preference is respected by existing navigation.

## Privacy

- [ ] No meeting data is added to the service-worker asset cache.
- [ ] No remote endpoint is configured by default.
- [ ] Attachment records contain metadata only.
- [ ] Role controls are documented as non-authenticated workflow controls.
- [ ] Export privacy warning remains documented.

## Release Decision

- [ ] GitHub Actions static checks pass.
- [ ] Playwright smoke tests pass.
- [ ] Manual checklist passes on mobile and desktop.
- [ ] Workspace backup has been tested before production use.
