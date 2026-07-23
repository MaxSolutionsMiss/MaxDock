# DB71 audit-repair map

DB70 / PR #59 at `4fb1a5f3611fdab91f42eee43dff41011e617724`
remains the production reference. DB71 is an isolated review candidate.

## Implemented

| Audit area | DB71 response |
|---|---|
| 33 CSS layers and 22 sequential patch scripts | Folded into `maxdock.css` and one `maxdock-layout-discipline.js` load. |
| 16 competing MutationObservers | Routed through one shared, requestAnimationFrame-batched observer hub. |
| Broken line icons and duplicated gear markup | Added shared `MAXDOCK_ICONS` plus explicit `data-icon="line"` / `"solid"` rendering. |
| Inconsistent document actions | Retained DB70's two-icon Export/Print strip directly below Sign Out and removed page-toolbar copies. |
| Header/location drift | Standardized `#locationSelect`; System Admin selects, operational site roles see a fixed location, external roles retain placeholder geometry. |
| Missing dialog semantics and focus handling | Added dialog names/semantics, focus containment, Escape handling, and focus restoration. |
| Orphaned form labels | Associated audited labels with their controls and replaced the nested account-status label with a caption. |
| Dashboard loading/reflow and mobile table | Added loading row, stable KPI skeletons, empty state, explicit refresh, and narrow-screen card layout. |
| Duplicate report selector / incomplete tab pattern | Removed the duplicate selector; the report rail is the single view control with keyboard and ARIA state. |
| Report cards, Update alignment, and analysis gaps | Corrected card geometry, 44px Update alignment, heatmap scale, previous-period deltas, and AI brief copying. |
| Queue preference collision and excessive setup | Gave priority metric a unique key and added three operational presets. |
| My Appointments native dialogs and permission race | Uses shared toast/confirm UI and owns one booking handler after permissions load. |
| Settings loss/reset risk | Added a persistent unsaved bar, unload guard, impact preview, and named reset confirmation. |
| Admin semantics and missing workflows | Converted fake tabs to pressed filters, prioritized Copy Details, raised temporary password minimum, added bulk status and audit history. |
| Data Integration unfinished appearance | Puts working CSV imports first and collapses planned integrations under Roadmap. |
| Login usability/security feedback | Uses the common brand lockup, password visibility, Caps Lock status, and client-side failure cooldown. |
| Missing global accessibility utilities | Added skip links, disclosure-state sync, tab helper, 44px coarse-pointer targets, and reduced-motion handling. |
| Native browser dialogs | Removed remaining application `alert`, `confirm`, and `prompt` calls. |
| Three-minute refresh drift | Declared the interval at its source and reconciled UI strings and handoff documentation. |
| Layer recurrence | Added `scripts/verify-no-ui-patch-assets.sh` and a no-new-patch rule to `CLAUDE.md`. |
| Database advisories | Added a reviewed, unapplied forward-only security/index migration candidate. |

## Deliberately gated

- No DB71 source, SQL, Edge Function, Auth setting, or static site has been
  deployed.
- The RLS policy advisories are documented but not mechanically rewritten. A
  policy rewrite without inspecting each live definition could change access.
- Leaked-password protection and the Auth minimum are release-gated settings.
- The invite Edge Function source is updated but remains undeployed.
- The duplicated booking markup is preserved for this candidate because removing
  it changes boot order on the two most critical booking surfaces. Its controls,
  behavior, validation, semantics, and visual contract are synchronized. A
  single-source extraction should be a separately screenshot-tested refactor.
- The former layer declarations are preserved in their reviewed cascade order
  inside one stylesheet, so DB71 removes the network waterfall and load-order
  race without claiming a zero-`!important` semantic rewrite. Renaming legacy
  release-scoped selectors requires an authenticated screenshot baseline.
- Inline booking handlers and a CSP migration are also separate hardening work;
  changing that event architecture in the same candidate would expand the
  booking-regression surface.

## Product rules preserved

- Routed internal movements reserve real configured docks at both sites.
- No generic linked-movement lane is introduced.
- External users do not receive internal dock or other-company data.
- Return-load matching stays advisory only.
- Authorized after-hours scheduling stays audited.
- Cancelled appointments and audit history are retained.
- VIP remains excluded.
- Root and `db04/` remain byte-identical.
- No framework, bundler, or build step is introduced.
- No PR is merged automatically.
