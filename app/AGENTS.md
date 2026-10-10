# Loading and data UI conventions

- Tasks opens in Kanban view by default. Keep archived tasks in a separate server-filtered list. Status moves and lane ordering use revision-checked writes, retain permission checks, and provide keyboard/touch alternatives to dragging. Persist card order and admin-only global lane order on the server. Show a lane for each active status option, and load cards continuously with bounded requests and no pagination controls. Keep the toolbar padded, let lanes fill the page and grow with their cards, and provide visible lane/card insertion indicators while dragging.
- Populated reference values remain links to their known record routes in read-only views, with readable labels, accessible new-tab cues, and noopener/noreferrer. Preserve empty and unavailable labels.

- Shared tables provide a column-settings gear to show, hide, and reorder data columns. Selection and Open Record are fixed leading columns and cannot be hidden or reordered. Preserve title links and use explicit, known detail routes for launch links; do not fabricate record pages for data-only rows.

- Form Builder opens in read-only mode. Edit enables field creation, reordering, and permitted custom-field changes. Show Cancel immediately before Save; Cancel discards the draft and returns to saved configuration. Do not add a separate Reload Saved Form action.

- Delete confirmations identify records by their title, name, or email, never by internal IDs. Use a neutral “Selected record” fallback when no readable label is available; keep explicit confirmation for every deletion.

- Use title case for built-in page and section titles, navigation and breadcrumb labels, and action labels (for example, “Service Status”, “Create Incident”, and “Private Account Settings”). Keep short connecting words lowercase unless first or last. Preserve user-entered record titles, custom field labels, API values, and normal sentence case in help text, validation, and notifications.

- Use section-local skeletons for initial dynamic table and form loads. Match real columns, row counts, field heights, and spacing; keep titles, navigation, and existing data visible. Never replace cached content with skeletons during background refreshes. Respect reduced motion; do not add artificial delays.
- Do not fade in pages or content. Keep navigation, titles, and existing data visible during loading and refresh. Respect reduced motion and avoid layout animations.
- Use `useResource` for API reads and `writeApi` for writes. Share query keys. Never add artificial delays or persist private responses to browser storage.
- Cancel private reads and clear private caches on session changes. Gate private reads on authentication readiness. Never replace the entire application shell during session loading.
- Preserve form inputs during background refreshes. Keep refresh feedback local, disable duplicate actions, and show refresh errors alongside cached data.
- Record creation and editing use dedicated routes. The explicit exception is on-call calendar quick-add, which opens the shared Modal prefilled with the clicked UTC date. Dialogs use fixed headers/footers and a scrolling body, with keyboard focus, Escape, and inline errors.
- Keep table filter padding and the divider above column headers in the shared `DataTable` component; filter content must not add its own outer padding or divider.
- Use `DataTable` for every table. Every DataTable must supply a server source or remote paging. Never filter, sort, or paginate table datasets in the browser. Server exports use the same filters and workspace/role restrictions as list routes. Use `shared/csv.js` to escape values and neutralize spreadsheet formulas.
- Show built-in enum values in normal case with `displayValue`, retaining machine values in API payloads. Preserve user-defined select option labels exactly.
- Use ReferenceField for relationships to users, groups, services, and other records. Use the shared Toggle switch for enable/disable settings. Keep table selection and schema-defined checkbox fields as checkboxes. Preserve saved unavailable references and enforce workspace validation in the API.
- Use RecordTabs for related record sections; preserve draft input while switching tabs and support keyboard navigation.
- System Field labels and option labels can be edited, and additional select choices can be added with a canonical workflow mapping. Preserve existing option IDs, mappings, and visibility; never remove existing System Field choices. Custom select options remain configurable.
- Keep native scrolling and shared theme-aware scrollbar styles. Do not hide scrollbars or intercept wheel/touch scrolling.

- Keep Form builder links on create/edit forms only, not table-list views.
- Knowledge content uses a validated JSON rich-text document. Never render user HTML directly or accept external image sources. Upload files through the shared attachment API and retain parent-record authorization for every download.
- Main list routes use DataTable fullPage with actions and optional toolbar. Keep the header and pagination outside the scrolling row area; related tables use the compact default.
- Service records use lazy related-data tabs with Incidents initially selected; other panels mount on first selection and retain state. Collection references offer creation in a new tab; saved service views expose monitor creation. Preserve existing role permissions.
- Keep primary actions visible. Use ActionMenu for secondary table and record actions; DataTable accepts actions (primary) and secondaryActions. Keep Cancel and confirmation controls directly accessible inside forms/dialogs.

- Sort tables through column headers only; do not add a separate sort selector.
- Service and collection create/edit saves navigate to /services/:id or /collections/:id. Record details are pages, not list-view modals.

- Record views use RecordWorkspace: read-only record details on the left with a visible pencil Edit button for authorized roles to open editable fields and a fixed full-height right rail with a left border on desktop. Stack the rail on narrow screens. Viewers and other roles without edit permission stay read-only. Preserve drafts during refresh; Save and Cancel return existing records to read-only mode without navigating away. Cancel discards unsaved edits. Creation forms return to their owning list; quick-add dialogs close without navigation. Creation pages open directly as forms. Hide unavailable actions without reserving empty space.
- Keep list views flush with the viewport. The sidenav profile area and full-page table pagination share a fixed --app-footer-height across every route; never measure table content to resize the profile rail. The Create control stays outside the scrollable nav; the collapsed logo reveals the expand control on hover or focus.
- Global search focuses its input after the native dialog opens.
- Form builders show fields and order controls on the left, selected field settings on the right. Use “System Field” for out-of-box fields in user-facing labels and messages. System Fields and custom fields can both be reordered. Allow System Field labels and additional select options; keep required flags, types, visibility, existing option IDs, and workflow meanings fixed. Enforce this in shared API validation. Preserve existing saved configuration; custom fields remain configurable and saved custom types remain immutable.
- Embedded rich-text images remain protected record files but are excluded from visible attachment lists. Ordinary image attachments remain visible.
- Describe supported checks accurately: HTTP/HTTPS endpoints using HEAD and GET. Do not imply arbitrary queries or network scanning.

- Reference fields show a single selected label in the input, or multiple removable pills inside the input alongside an ongoing search. Results appear below the control with keyboard navigation. Use explicit referenceType for permission-aware create links that open in a new tab; refresh choices on focus.

- Use shared account layout preferences for both sidebar toggles. Cache only non-sensitive layout values for first paint; never remount forms when collapsing a rail. Record pages scroll their main content, not the document, with a separate scrolling right rail on desktop.
- Audit metadata is an explicit allowlist. Show UTC dates and never invent missing historical authors or timestamps. New monitor forms require a service; preserve legacy unassigned records on edit.

- Keep table filters collapsed for new users; persist the Filters button visibility through the shared filtersOpen user preference across list views and refreshes. Preserve active filters when hiding them; share visibility only, not filter values.
- The status page is a flat service-only list. Do not expose individual monitor details there.
- Use the tagline “Know the impact · Own the response” and ServiceTrident branding.

- Read-only record details use `record-details`: muted labels, readable values, subtle dividers, and a subtle theme-aware background on values. Use background styling for non-editable fields; do not add “Read only” badges or labels.

- Record toolbars show stable type-prefixed identifiers via recordNumber. Use record titles in truncated breadcrumbs instead of generic detail headings. RecordActions places Save/Cancel in the Edit toolbar slot and associates submit controls with their form. Label every value in read and edit modes, including long-form descriptions.

- Use StateBadge for record states in toolbars, read-only fields, and tables. Colors follow canonical workflow values while custom labels remain visible; always retain text alongside color.

- Populated reference fields include an accessible info link for each selected record, opening its known application route in a new tab with noopener/noreferrer. Keep navigation independent of selecting or removing values.

- Table headers and values stay on one line, including custom cell renderers. Use the shared horizontal scroll container rather than wrapping table content.

- Shared tables provide explicit current-page row selection, selected-row CSV export, and confirmed admin-only deletion for supported mutable records. Keep audit/history rows read-only. Refresh is an icon outside the secondary menu; Filters is icon-only with an accessible label.

- Navigation order starts Dashboard, Incidents, Services. The compact desktop rail shows core operational links without scrolling; only the explicit toggle expands or collapses it. Do not auto-expand on hover. Explicit toggles animate width and content spacing, respecting reduced motion. Keep all authorized links reachable in expanded and mobile navigation.
- Use Heroicons outline for interface actions, blue for primary actions/information, emerald for operational/success states, amber for pending/warnings, rose for failures/critical states, and slate for unknown/paused states. Retain visible state labels; charts must agree with badges and history indicators. Purple is reserved for maintenance or categorical chart series.

- ReferenceField queries the authorized reference endpoint for paged search results and selected labels. Never download an unbounded dataset to implement a search dropdown.

- Related lists use `RecordTabs related`; tab labels replace visible table titles while table actions stay available. Keep conversation composers and messages padded inside the tab panel border.

- Every user-triggered deletion or destructive removal must require an explicit confirmation before mutating local form data or sending an API request. This includes single and bulk record deletion, attachments, custom status icons, integration removal, invitation revocation, demo cleanup, and form-builder custom options/fields. Use `ConfirmDeleteButton` or the existing shared Modal confirmation flow; name the target and consequences, focus Cancel initially, disable duplicate submissions, and preserve errors. Never delete on initial click, dropdown selection, dialog opening, or GET requests. Do not stack a second confirmation on an action already guarded by a confirmation dialog. Removing a selected reference pill only changes the reference and does not delete the referenced record.
- Profile email values use the same labeled read-only input spacing as other fields. Offer built-in IANA timezone choices (including UTC), preserve saved aliases, and validate timezone values server-side. Use the shared reactive date formatter for personal timestamps; keep explicitly UTC schedules, date filters, exports, and status-history day buckets in UTC. Respect daylight-saving offsets for each timestamp and refresh displays when the viewer changes their saved timezone.

- Show accessible, dismissible success/error toasts for explicit user mutations, retaining inline validation errors. Do not toast background reads, polling, automatic layout saves, or aborted requests. Shared `api` mutation feedback avoids per-form duplication. Keep errors until dismissed and never include credentials or whole response payloads in notifications.
- Attachment selection and drag/drop use the shared AttachmentDropzone, validate file count/type/size, upload sequentially, and preserve existing authorization and embedded-image separation. Keep keyboard file selection and visible busy/error feedback.
- Sidebar links use 4px corners in normal, hover, and active states, matching buttons and fields. On-call shift removal always uses an explicit confirmation before saving the changed schedule.

- Use the shared Select without a search input for option dropdowns. Use ReferenceField for searchable record relationships and the on-call Service filter, with server-side searches.

- Form action rows are right-aligned with Cancel immediately before the primary Save/Create button. Keep destructive or auxiliary actions before that pair. Preserve the same DOM and keyboard order in record toolbars, page footers, and modal footers; do not reorder with CSS.

# Accessibility for every UI change

- Treat accessibility as an acceptance requirement for all new or changed HTML, JSX, components, styles, and interaction flows. Prefer semantic HTML and native controls; use ARIA only when native semantics do not express the interaction.
- Give every input a programmatically associated label and every icon-only button a meaningful accessible name. Preserve accessible labels when hiding visible text. Use buttons for actions and links for navigation.
- Support keyboard operation, visible focus, logical DOM/tab order, and predictable focus restoration. Dialogs must contain focus, support Escape when safe, and return focus to their trigger. Avoid keyboard traps and positive tabindex values.
- Associate validation and help text with controls, expose invalid states, and announce meaningful success and error changes without repeatedly announcing background polling.
- Maintain readable text and control contrast in both themes, useful pointer target sizes, and usable layouts with zoom and narrow screens. Never communicate state using color alone. Respect reduced-motion settings.
- Hide decorative icons from assistive technology; provide useful alternative text for informative images. Preserve headings, landmarks, table headers, and accessible names for tabs, menus, and related sections.
- Check affected keyboard flows and accessible names when practical, alongside automated validation. Report any unverified accessibility behavior; passing lint or a build does not establish accessibility compliance.

- Knowledge opens searchable knowledge-base cards, not a table. Knowledge-base association is optional for articles and runbooks; validate any selected base belongs to the workspace. All Articles includes unassigned records.

- Admins may add bounded plain-text Help Text to every System Field and custom field. Associate hints with the controls using aria-describedby and give controls stable, unique accessible labels independent of hints or selected values.
- Use breadcrumbs as the single page title across forms and lists. Keep record IDs and statuses in the form body, and align desktop record headers with the right information-panel header. Secondary toolbar controls precede primary actions in DOM and visual order.
- Reopening an incident requires confirmation, including changes from a resolved record's Edit form. Focus Cancel initially, prevent duplicate requests, and retain errors.
- AI controls require a configured workspace provider and an enabled user preference. Keys stay encrypted on the server. Send only authorized, bounded record text; render generated output as text and link to known source records. AI drafts remain unsaved and require confirmation before replacing form content.

- Do not display loading messages in the UI, including temporary permission or access warnings. Use skeleton placeholders, quiet pending states, and `aria-busy` where appropriate; preserve existing content during refresh. Show access-denied messages only after authentication and authorization have resolved. Keep meaningful errors and action confirmations visible.

- Keep list and form breadcrumbs and compact main actions in one row. Record, integration, and provider headers span the available content width with no outer top or side padding; keep create/edit actions visible while content scrolls. Preserve native form association for submit buttons rendered in the header. The dashboard has its picker on the left and a plain refresh icon on the right, aligned with card edges.
- Apply subtle theme-aware borders to inputs, selects, text areas, and editor surfaces across sections. Composite reference controls have a single outer border.
