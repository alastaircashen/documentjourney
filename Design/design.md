# Document Journey - Design Document

## Context

Building "Document Journey" from scratch in an empty repo. This is an SPFx (SharePoint Framework) document workflow product that enables users to initiate structured workflows ("journeys") on documents from SharePoint document libraries. The repo currently contains only a placeholder `hello` file.

The product has two SPFx components:

1. **ListView Command Set extension** - triggers from document library, opens a React panel
2. **My Journeys web part** - dashboard showing journey status

Both use @pnp/sp for SharePoint operations, Fluent UI React v9 for UI, and interact with SharePoint lists (DJ_Journeys, DJ_Steps, DJ_History, DJ_StepHistory, DJ_Config). App-level configuration (gallery URL, flow trigger URLs) uses **SPFx Tenant Properties (StorageEntity)** — the native SPFx pattern for app config stored via the App Catalog.

---

## Project Structure

```
documentjourney/
├── .gitignore
├── .npmignore
├── .yo-rc.json
├── gulpfile.js
├── package.json
├── tsconfig.json
├── config/
│   ├── config.json
│   ├── deploy-azure-storage.json
│   ├── package-solution.json
│   └── serve.json
├── teams/                          # Teams manifest icons
├── flows/                          # Power Automate flow templates
│   ├── DJ_Flow_Notification.json
│   ├── DJ_Flow_Approval.json
│   ├── DJ_Flow_Signature.json
│   ├── DJ_Flow_Task.json
│   ├── DJ_Flow_Feedback.json
│   └── DJ_Flow_StuckStepMonitor.json  # Scheduled: detects stalled journeys
└── src/
    ├── index.ts                    # Entry point
    ├── common/                     # Shared utilities used by both components
    │   ├── FluentThemeProvider.tsx  # SPFx → Fluent UI v9 theme bridge
    │   └── DocumentJourneyContext.tsx # React context: sp instance + services
    ├── extensions/
    │   ├── documentJourney/
    │   │   ├── DocumentJourneyCommandSet.ts
    │   │   ├── DocumentJourneyCommandSet.manifest.json
    │   │   └── components/
    │   │       ├── DocumentJourneyPanel.tsx
    │   │       ├── DocumentSelector.tsx
    │   │       ├── JourneyPicker.tsx
    │   │       ├── JourneySummary.tsx
    │   │       └── JourneyViewPanel.tsx    # View-only panel for journey history
    │   └── journeyStatus/
    │       ├── JourneyStatusFieldCustomizer.ts
    │       ├── JourneyStatusFieldCustomizer.manifest.json
    │       └── components/
    │           └── JourneyStatusCell.tsx    # Clickable badge rendered in library column
    ├── webparts/
    │   └── myJourneys/
    │       ├── MyJourneysWebPart.ts
    │       ├── MyJourneysWebPart.manifest.json
    │       └── components/
    │           ├── MyJourneys.tsx
    │           ├── WaitingOnMe.tsx
    │           ├── StartedByMe.tsx
    │           ├── AllActive.tsx
    │           ├── JourneyHistoryView.tsx
    │           └── ActionButtons.tsx
    ├── models/
    │   ├── IJourney.ts
    │   ├── IStep.ts
    │   ├── IHistory.ts
    │   ├── IStepHistory.ts
    │   └── IConfig.ts
    ├── services/
    │   ├── ListService.ts          # Core CRUD abstraction over @pnp/sp
    │   ├── JourneyService.ts       # Journey-specific business logic
    │   ├── SchemaService.ts        # List provisioning + migrations
    │   ├── TenantPropertyService.ts # StorageEntity config reader
    │   ├── GalleryService.ts       # Cross-site gallery operations
    │   └── FlowTriggerService.ts   # Power Automate HTTP trigger
    └── constants.ts
```

---

## User Experience & Design

### Command Set Extension — Document Journey Panel

The panel slides in from the right side of the page (standard SPFx panel overlay pattern), ~480px wide.

**Step 1 — Document Selection**

- Header: "Start a Journey" with a subtle Document Journey icon
- Selected documents shown as a horizontal row of Fluent UI `Tag` components (pill-shaped chips), each showing the file icon + filename. Users can click the dismiss "x" on any tag to remove a document from the selection.
- If no documents remain, a disabled state with "Select documents from the library" message
- **Active journey check**: before proceeding, the panel queries DJ_History for any active journeys on the selected documents. If found, a warning banner is shown: "1 of 3 selected documents already has an active journey." The user can choose to proceed (excluding the conflicting document) or cancel.

**Step 2 — Choose Journey**

- Section header: "Choose a journey"
- **Default journeys** shown as prominent cards at the top — each card has: journey title, short description, and a right-arrow icon. Cards use `tokens.colorBrandBackground` subtle tint for emphasis.
- **Custom journeys** listed below defaults in a simpler list format (title + description), filtered to the current library (via LibraryScope column)
- **Gallery section** (only if gallery URL configured): expandable "Browse gallery" accordion at the bottom. Shows org-wide journeys with an "Import" button next to each. Clicking "Import" shows an inline `Spinner` on that button until the cross-site copy completes, then replaces the button with a checkmark and adds the journey to the custom journeys list above.
- Clicking a journey card/row advances to the summary step

**Step 3 — Journey Summary & Confirm**

- Shows the journey name as a large heading
- **Multi-document mode**: if multiple documents are selected, a notice is displayed: "This journey will be started independently for each of the N selected documents. Each document will have its own journey instance."
- Steps rendered as a vertical **timeline/stepper** using Fluent UI's visual pattern:
  - Each step shows: step number (circled), step name, step type badge (e.g. "Approval" in a colored `Badge`), assigned to (people avatars or group name), completion rule, due date offset if set
  - Connected by a vertical line between step circles
  - If a step has `AllowDelegate` enabled, a small "delegatable" icon/tooltip is shown next to the assignee
- **Flow configuration warning**: if any step type's corresponding flow URL is not configured in Tenant Properties, a yellow `MessageBar` is shown: "Warning: [Approval] notifications are not configured. Assignees will not be automatically notified for [Step Name]. Contact your admin to set up Power Automate flows."
- Below the stepper: two buttons — "Start Journey" (primary, `appearance="primary"`) and "Back" (secondary)
- Documents listed again as compact tags below the heading for confirmation

**Step 4 — Submitting**

- Fluent UI `Spinner` with "Starting journey..." message
- On success: green checkmark icon + "Journey started successfully" + "View in My Journeys" link
- On error: red error banner with retry option

**First-time setup / non-admin flow**: if `SchemaService.ensureSchema()` detects that DJ lists don't exist and the current user is not a site admin, the panel shows an informational state: "Document Journey hasn't been set up on this site yet. A site administrator needs to open this panel first to initialize the required lists." with a "Copy setup instructions" link.

### My Journeys Web Part — Dashboard

Full-width web part with a tabbed interface at the top.

**Tab bar** (Fluent UI `TabList`):

- "Waiting on me" (with count badge)
- "Started by me"
- "All active" (only visible to site admins)

**Toolbar** (shared across all tabs):

- **Search box**: Fluent UI `SearchBox` — filters displayed rows by document name or journey name (client-side filter on loaded data)
- **Status filter**: Fluent UI `Dropdown` — filter by Active/Completed/Rejected/Cancelled (default: Active). Available on "Started by me" and "All active" tabs.
- **Refresh button**: `Button` with `ArrowClockwise` icon — manually re-fetches data from SharePoint lists. A subtle "Last updated: 2 min ago" timestamp is shown next to it.

**Waiting on Me tab:**

- Fluent UI `DataGrid` with columns: Document | Journey | Current Step | Step Type | Due Date | Actions
- **Sortable columns**: Document, Journey, Due Date (default sort: Due Date ascending, nulls last)
- Document column: file icon + linked filename (opens document)
- Step Type shown as a colored `Badge` (e.g. orange for Approval, blue for Feedback, green for Task)
- **Bulk selection**: checkbox column on the left. When items are selected, a bulk action toolbar appears above the grid:
  - "Approve selected (N)" — only enabled when all selected items are Approval type
  - "Complete selected (N)" — only enabled when all selected items are Task type
  - Bulk actions open a single confirmation `Dialog` with optional comment field
- Actions column: contextual buttons based on step type:
  - Approval → "Approve" (primary) + "Reject" (subtle/danger) buttons
  - Task → "Mark Complete" button
  - Feedback → "Add Feedback" button
  - Signature → "Sign" button (links to Adobe Sign)
  - All step types with `AllowDelegate` → "Delegate" overflow menu item (opens a People Picker dialog to reassign)
- Clicking action opens a small `Dialog` for comments if RequireComments is true
- Empty state: friendly illustration + "No items waiting for your action"

**Started by me tab:**

- DataGrid: Document | Journey | Status | Current Step | Started | Progress
- **Sortable columns**: Document, Journey, Status, Started (default sort: Started descending)
- Status shown as colored Badge: Active (blue), Completed (green), Rejected (red), Cancelled (grey)
- Progress: "Step 2 of 4" text
- Row click opens the **Journey History View** dialog
- **Cancel action**: Active journeys show a "Cancel" button (subtle/danger) in an Actions column. Clicking opens a confirmation dialog: "Cancel this journey? This cannot be undone." with an optional reason field. On confirm, sets DJ_History.Status to Cancelled and marks all pending DJ_StepHistory records as Skipped.

**All Active tab (admin):**

- Same as "Started by me" but shows all journeys on the site, with an additional "Initiated By" column
- Admin can also cancel any journey (same cancel flow as above)

**Journey History View** (Dialog):

- Opens in a **new browser window** (compact, ~700x900px) rather than a Dialog overlay, ensuring `window.print()` only captures the journey history content without SharePoint page chrome
- Header: Journey name + document name
- Full audit trail as a vertical timeline:
  - Each entry: step name, action taken (badge), user who acted, timestamp, comments (if any)
  - Visual distinction between completed steps (solid line/green check) and pending steps (dashed line/grey circle)
  - Delegated steps show: "Delegated from [Original] to [New assignee] by [Delegator]"
- Current status prominently displayed
- "Print" button in the header (triggers `window.print()` — works cleanly since this is a standalone window with print-friendly CSS)
- "Close" button

### Visual Design Tokens

All custom styling uses Fluent UI v9 design tokens for theme responsiveness:

- Primary actions: `tokens.colorBrandBackground`
- Danger/reject: `tokens.colorPaletteRedBackground3`
- Success states: `tokens.colorPaletteGreenBackground3`
- Step type badges: each type gets a semantic color from the token palette
- Card hover: `tokens.colorNeutralBackground1Hover`
- Borders: `tokens.colorNeutralStroke1`
- Text: `tokens.colorNeutralForeground1` (primary), `tokens.colorNeutralForeground2` (secondary)

---

## Phase 1: Project Scaffolding

Create the SPFx project skeleton with all required config files. No `npm install` needed in this environment (won't have SharePoint build toolchain), but the files must be structurally correct for a real SPFx 1.20 project.

### Files to create:

1. **package.json** - SPFx 1.20 deps: @microsoft/sp-core-library, @microsoft/sp-listview-extensibility, @microsoft/sp-webpart-base, @pnp/sp, @pnp/logging, @fluentui/react-components, @fluentui/react-migration-v8-v9, react 17, typescript
2. **tsconfig.json** - SPFx-compatible TypeScript config (ES2017 target, ESNext modules, strict mode)
3. **gulpfile.js** - Standard SPFx gulpfile using @microsoft/sp-build-web
4. **.gitignore** - node_modules, lib, dist, temp, *.sppkg, .yo-rc.json
5. **.yo-rc.json** - SPFx generator metadata
6. **config/config.json** - Bundle entries for both extension and web part
7. **config/package-solution.json** - Solution ID, name, features, version
8. **config/deploy-azure-storage.json** - CDN config placeholder
9. **config/serve.json** - Local workbench serve config

---

## Phase 2: Models & Constants

Define TypeScript interfaces and constants used across the solution.

### Files to create:

1. **src/constants.ts** - EXPECTED_SCHEMA_VERSION, LISTS map, TENANT_PROPERTY_KEYS map, step types enum, completion rules enum, status enum, action types enum
2. **src/models/IJourney.ts** - IJourney interface matching DJ_Journeys columns
3. **src/models/IStep.ts** - IStep interface matching DJ_Steps columns (includes snapshot fields for template versioning)
4. **src/models/IHistory.ts** - IHistory interface matching DJ_History columns (includes JourneyBatchId for multi-document grouping)
5. **src/models/IStepHistory.ts** - IStepHistory interface matching DJ_StepHistory columns (includes DelegatedFrom, DelegatedBy fields)
6. **src/models/IConfig.ts** - IConfig interface matching DJ_Config columns
7. **src/index.ts** - Barrel exports

---

## Phase 3: Services

Build the service layer that handles all SharePoint operations.

### Files to create:

1. **src/common/DocumentJourneyContext.tsx** - React context provider that holds the `sp` (pnp/sp) instance and service singletons (ListService, JourneyService, SchemaService, TenantPropertyService, GalleryService, FlowTriggerService). Both the command set extension and web part wrap their React tree with this provider, configured once from the SPFx context. Components consume services via `useDocumentJourney()` hook instead of instantiating services directly.

2. **src/common/FluentThemeProvider.tsx** - Wrapper that converts SPFx theme to Fluent UI v9 theme using createV9Theme, provides FluentProvider. Shared by both the extension and web part (avoids duplication).

3. **src/services/ListService.ts** - Generic CRUD using @pnp/sp: getItems, getItemById, addItem, updateItem, deleteItem, ensureList, ensureField. All list access goes through this. All query methods accept `$top`, `$skip`, `$orderby`, and `$filter` OData parameters. Default `$top` is 100 to avoid unbounded queries.

4. **src/services/SchemaService.ts** - List provisioning (create all 5 DJ_ lists with correct columns and indexed columns), schema version check, migration runner. Migrations map: `Record<number, () => Promise<void>>`. Idempotent. Seeds default journeys on fresh install. Indexes are created on: DJ_History.Status, DJ_History.InitiatedBy, DJ_StepHistory.HistoryId, DJ_StepHistory.AssignedTo, DJ_StepHistory.Status.

5. **src/services/JourneyService.ts**:
   - `getJourneys(libraryScope)` - filtered by library scope, paginated
   - `getSteps(journeyId)` - by journey ID, ordered by StepOrder
   - `checkActiveJourneys(documentUrls)` - returns any active DJ_History records for the given document URLs (used for conflict detection)
   - `startJourney(journeyId, documents[])` - creates DJ_History records for each selected document. Generates a shared `JourneyBatchId` (GUID) across all documents so they can be identified as a group. Snapshots journey step definitions into DJ_StepHistory at creation time (denormalizes step name, type, assignees, rules) to protect against template edits during active journeys. Uses ETag-based optimistic concurrency on DJ_History writes.
   - `getMyPendingSteps(userId, $top, $skip)` - paginated
   - `getJourneysStartedByMe(userId, statusFilter, $top, $skip)` - paginated, filterable by status
   - `getAllActiveJourneys(statusFilter, $top, $skip)` - admin, paginated, filterable
   - `completeStep(stepHistoryId, comments, etag)` - with ETag concurrency check
   - `rejectStep(stepHistoryId, comments, etag)` - with ETag concurrency check
   - `delegateStep(stepHistoryId, newAssignee, delegatedBy)` - reassigns a step, writes DelegatedFrom and DelegatedBy to DJ_StepHistory
   - `cancelJourney(historyId, reason)` - sets Status to Cancelled, marks all pending DJ_StepHistory as Skipped, records cancellation reason

6. **src/services/GalleryService.ts** - Cross-site read from central gallery, import journey + steps to local site, publish journey to gallery. Returns empty/no-ops if CENTRAL_GALLERY_SITE_URL not set.

7. **src/services/FlowTriggerService.ts** - HTTP POST to Power Automate trigger URL read from Tenant Properties (StorageEntity). Sends step type, assigned users, document info, journey instance ID. Includes `getConfiguredFlowTypes()` method that returns which step types have flow URLs configured (used by UI to show warnings on unconfigured types).

8. **src/services/TenantPropertyService.ts** - Reads app config from StorageEntity (`sp.web.getStorageEntity(key)`). Keys: DJ_GallerySiteUrl, DJ_FlowUrl_Notification, DJ_FlowUrl_Approval, DJ_FlowUrl_Signature, DJ_FlowUrl_Task, DJ_FlowUrl_Feedback. Caches values for session.

---

## Phase 4: Command Set Extension

The main entry point - ListView Command Set that opens the journey panel.

### Files to create:

1. **src/extensions/documentJourney/DocumentJourneyCommandSet.manifest.json** - Extension manifest with two command definitions: START_JOURNEY and VIEW_JOURNEY
2. **src/extensions/documentJourney/DocumentJourneyCommandSet.ts** - Extends BaseListViewCommandSet. On init: configure @pnp/sp with SPFx context, create service instances, listen for `dj:viewJourney` custom events from the Field Customizer. START_JOURNEY: render panel wrapped in `DocumentJourneyContext.Provider` and `FluentThemeProvider`. VIEW_JOURNEY: shown when exactly 1 item is selected and has a DJStatus value — opens JourneyViewPanel. On list view change: enable/disable commands based on selection and DJStatus column presence.
3. **src/extensions/documentJourney/components/DocumentJourneyPanel.tsx** - Main panel component. State machine: Loading → SchemaCheck → SelectJourney → ConfirmSummary → Submitting → Done/Error. Uses Overlay/Panel pattern. Calls SchemaService.ensureSchema() on mount. If schema doesn't exist and user is not admin, shows setup instructions state instead of proceeding. Calls `JourneyService.checkActiveJourneys()` on document selection to warn about conflicts. Calls `FlowTriggerService.getConfiguredFlowTypes()` to show warnings on unconfigured step types.
4. **src/extensions/documentJourney/components/DocumentSelector.tsx** - Shows selected documents as Fluent UI Tag components, allows removing. Shows warning badges on documents with active journeys.
5. **src/extensions/documentJourney/components/JourneyPicker.tsx** - Card list of available journeys. Defaults shown prominently, custom journeys below. Gallery imports section with inline loading spinners on import buttons (if configured).
6. **src/extensions/documentJourney/components/JourneySummary.tsx** - Shows journey name, steps in order, each step's type/assignee/rules/delegate status. Multi-document notice when applicable. Flow configuration warnings for unconfigured step types. Confirm/Cancel buttons. On confirm: calls JourneyService.startJourney().
7. **src/extensions/documentJourney/components/JourneyViewPanel.tsx** - Read-only slide-in panel displaying the full journey history timeline for a given historyId. Shows journey name, document name, overall status badge, step progress, and a vertical timeline identical to JourneyHistoryView. Includes Print and Close buttons.

---

## Phase 4b: Journey Status Field Customizer

A Field Customizer extension that renders the `DJStatus` column as a clickable status badge directly in the document library list view.

### How it works:

1. When a journey is started on a document, `JourneyService.startJourney()` adds a `DJStatus` column (Note field) to the target document library if it doesn't exist, then writes a pipe-delimited value: `"displayText|historyId|status"`
2. The Field Customizer is registered against the `DJStatus` field and renders each cell as a colored Fluent UI `Badge` with an icon
3. Clicking the badge dispatches a `dj:viewJourney` custom DOM event that the DocumentJourneyCommandSet listens for, opening the JourneyViewPanel
4. The column value is updated automatically by JourneyService on every lifecycle event: start, advance, complete, reject, cancel

### Column value format:

| Journey State | Column Value | Rendered As |
|---|---|---|
| Active (step 1) | `Simple Approval - Request Approval (Step 1 of 2)\|42\|Active` | Blue badge with arrow icon |
| Active (step 2) | `Simple Approval - Notify Initiator (Step 2 of 2)\|42\|Active` | Blue badge updated |
| Completed | `Simple Approval - Completed\|42\|Completed` | Green badge with checkmark |
| Rejected | `Simple Approval - Rejected\|42\|Rejected` | Red badge with X icon |
| Cancelled | `Simple Approval - Cancelled\|42\|Cancelled` | Grey badge |
| No journey | *(empty)* | Nothing rendered |

### Files to create:

1. **src/extensions/journeyStatus/JourneyStatusFieldCustomizer.manifest.json** - Field Customizer manifest
2. **src/extensions/journeyStatus/JourneyStatusFieldCustomizer.ts** - Extends BaseFieldCustomizer. Parses the pipe-delimited DJStatus value and renders JourneyStatusCell into each cell. Empty values render nothing.
3. **src/extensions/journeyStatus/components/JourneyStatusCell.tsx** - React component rendering a colored `Badge` (blue=Active, green=Completed, red=Rejected, grey=Cancelled) with status-appropriate icon. Wrapped in a `Link` that dispatches the `dj:viewJourney` custom event on click, which the CommandSet catches to open the view panel.

### Service changes:

- **ListService** gains `ensureFieldOnLibrary(libraryUrl, fieldXml)`, `updateLibraryItem(libraryUrl, itemId, props)`, and `getLibraryItemByUrl(libraryUrl, fileUrl)` methods for operating on document library items directly
- **JourneyService** gains a private `updateDJStatus(libraryUrl, documentUrl, statusValue)` method called from `startJourney()`, `advanceJourney()`, `rejectStep()`, and `cancelJourney()`. Failures are non-fatal (logged, not thrown) so a column write issue never blocks a journey operation.
- **constants.ts** exports `DJ_STATUS_FIELD_NAME` and `DJ_STATUS_FIELD_XML` for the column definition

### Edge cases:

- **Multiple journeys on same document**: the column shows the most recent journey. Starting a new journey overwrites the previous value.
- **Library column doesn't exist**: `ensureFieldOnLibrary()` is called idempotently before the first write in `startJourney()`.
- **Document moved/renamed**: the column value is a list item property and travels with the item. The historyId link remains valid.
- **Field Customizer not deployed**: the column still shows the raw pipe-delimited text as a readable fallback.

---

## Phase 5: My Journeys Web Part

Dashboard web part for viewing and acting on journeys.

### Files to create:

1. **src/webparts/myJourneys/MyJourneysWebPart.manifest.json** - Web part manifest
2. **src/webparts/myJourneys/MyJourneysWebPart.ts** - Extends BaseClientSideWebPart. Configures @pnp/sp, creates service instances, renders React root wrapped in `DocumentJourneyContext.Provider` and `FluentThemeProvider` (both from `src/common/`).
3. **src/webparts/myJourneys/components/MyJourneys.tsx** - Tab-based layout: "Waiting on me", "Started by me", "All active" (admin only). Uses Fluent UI TabList. Shared toolbar with SearchBox, status Dropdown filter, and Refresh button with "Last updated" timestamp. Manages refresh state passed down to tab components.
4. **src/webparts/myJourneys/components/WaitingOnMe.tsx** - DataGrid showing pending steps for current user. Sortable columns: Document, Journey, Due Date. Bulk selection with checkbox column. Bulk action toolbar for batch approve/complete. Row actions: Approve/Reject, Complete, Add Feedback, Sign, Delegate (when AllowDelegate is true). Paginated queries.
5. **src/webparts/myJourneys/components/StartedByMe.tsx** - DataGrid of journeys initiated by current user. Sortable columns: Document, Journey, Status, Started. Status filter from toolbar applied. Cancel action for active journeys with confirmation dialog. Paginated queries.
6. **src/webparts/myJourneys/components/AllActive.tsx** - Admin view of all active journeys on the site. Additional "Initiated By" column. Cancel action available for admins. Paginated queries.
7. **src/webparts/myJourneys/components/JourneyHistoryView.tsx** - Opens in a **standalone browser window** (not a Dialog) for clean printing. Full audit trail as vertical timeline with delegation entries. Print button triggers `window.print()` in the standalone window. Print-friendly CSS loaded in the window.
8. **src/webparts/myJourneys/components/ActionButtons.tsx** - Approve/Reject/Complete/Comment/Delegate action buttons with dialog for comments when required. Delegate action opens a People Picker dialog. All actions use ETag-based optimistic concurrency — if the step was already acted on, shows "This step has already been completed by another user" error instead of double-processing.

---

## Phase 6: Default Journey Seeding & Polish

1. Add default journey seeding in SchemaService (Simple Approval + Request Feedback)
2. Add schema upgrade prompt UI in DocumentJourneyPanel (shown when version mismatch detected, requires site admin)
3. Add error boundaries and loading states
4. **First-time non-admin experience**: if SchemaService detects lists don't exist and user lacks admin permissions, show an informational panel state with setup instructions and a "Copy instructions" button (not a broken error state)
5. **Permission checks**: graceful degradation when not site admin — hide "All active" tab, hide cancel on other users' journeys, disable schema management actions

---

## Phase 7: Power Automate Flow Templates

Create importable Power Automate flow definition JSON files for all 5 step types plus a monitoring flow. Each flow follows a common pattern: HTTP trigger → step-type-specific action → update DJ_StepHistory → advance to next step or complete journey.

### Files to create (in `flows/` directory):

1. **flows/DJ_Flow_Notification.json** - HTTP trigger → Send email + Teams message to assignees → Auto-write "Notified" to DJ_StepHistory → Trigger next step's flow (or mark journey complete)
2. **flows/DJ_Flow_Approval.json** - HTTP trigger → Send Adaptive Card (Approve/Reject buttons + optional comments) to assignees via Teams → Wait for responses → Check CompletionRule (All vs One) → Write to DJ_StepHistory → If rejected & AllowReject, move back; otherwise advance
3. **flows/DJ_Flow_Signature.json** - HTTP trigger → Send document to Adobe Sign → Poll/webhook for completion → Write to DJ_StepHistory → Advance
4. **flows/DJ_Flow_Task.json** - HTTP trigger → Send Adaptive Card (Mark Complete button) to assignees → Wait for completion → Check CompletionRule → Write to DJ_StepHistory → Advance
5. **flows/DJ_Flow_Feedback.json** - HTTP trigger → Send Adaptive Card (text input for comments) to assignees → Collect responses into DJ_StepHistory.Comments → Check CompletionRule → Advance
6. **flows/DJ_Flow_StuckStepMonitor.json** - **Scheduled flow** (runs daily). Queries DJ_StepHistory for steps with Status=Pending and DueDate < today. For each stuck step: sends a reminder notification to the assignee and an alert to the journey initiator. If a step is stuck more than 3x its DueDays, flags the journey in DJ_History with a "Stalled" status and notifies the site admin.

### Key design decisions:

- **Custom approvals, NOT native PA approvals** — native `createAnApproval` has a 30-day expiry that breaks long-running workflows
- Each flow calls the next step's flow via HTTP when advancing (sequential chain)
- **Retry policy on inter-flow HTTP calls**: 3 retries with exponential backoff (5s, 30s, 120s). If all retries fail, the flow writes a "FlowError" status to DJ_StepHistory and sends an error notification to the journey initiator and site admin. The stuck step monitor will also catch these.
- The SPFx code only triggers the first step; each subsequent step is triggered by the prior flow
- Flows use SharePoint HTTP connector to read/write DJ_StepHistory and DJ_History lists
- All flows are parameterized: SharePoint site URL and list names are set during import

---

## Key Implementation Details

### Shared React Context (DocumentJourneyContext)

Both the command set extension and web part need access to the same `sp` instance and services. A shared React context avoids duplicating initialization logic:

```tsx
// src/common/DocumentJourneyContext.tsx
interface IDocumentJourneyContext {
  sp: SPFI;
  listService: ListService;
  journeyService: JourneyService;
  schemaService: SchemaService;
  tenantPropertyService: TenantPropertyService;
  galleryService: GalleryService;
  flowTriggerService: FlowTriggerService;
}

const DocumentJourneyContext = React.createContext<IDocumentJourneyContext>(null);

export const useDocumentJourney = () => useContext(DocumentJourneyContext);

export const DocumentJourneyProvider: React.FC<{ context: BaseComponentContext }> = ({ context, children }) => {
  const value = useMemo(() => {
    const sp = spfi().using(SPFx(context));
    const listService = new ListService(sp);
    // ... create all services
    return { sp, listService, journeyService, ... };
  }, [context]);
  return <DocumentJourneyContext.Provider value={value}>{children}</DocumentJourneyContext.Provider>;
};
```

### @pnp/sp Configuration

```ts
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/fields";
// Initialize once via DocumentJourneyProvider, consumed via useDocumentJourney() hook
```

### Concurrency & Race Conditions

SharePoint lists don't have row-level locking. The design uses **ETag-based optimistic concurrency** to prevent conflicts:

1. **Step completion**: when loading a pending step, the component stores the item's ETag. When submitting an action (approve/reject/complete), the ETag is sent with the update. If another user acted on the same step in the meantime, the update fails with a 412 Precondition Failed, and the UI shows: "This step has already been acted on. Refreshing..." then reloads.

2. **Journey start conflict**: `JourneyService.checkActiveJourneys(documentUrls)` queries DJ_History before creating new records. If a race condition occurs and a duplicate is created, the stuck step monitor will flag the duplicate.

3. **Bulk actions**: processed sequentially (not in parallel) to avoid overwhelming SharePoint request throttling. Each item's ETag is checked individually; failures on individual items are reported without blocking the rest.

### Multi-Document Journey Model

When a user selects multiple documents and starts a journey, each document gets its own independent DJ_History record. All records in the batch share a `JourneyBatchId` (GUID) so they can be identified as a group. The UI shows a notice during confirmation: "This journey will be started independently for each of the N selected documents."

The batch ID enables:
- Grouping related journeys in the "Started by me" view
- Cancelling all journeys in a batch at once (optional)
- Reporting on batch completion

### Template Versioning (Step Snapshots)

When a journey is started, all step definitions are **snapshotted** into DJ_StepHistory records with Status=Pending. This means:
- Step name, type, assignees, completion rule, and other fields are copied from DJ_Steps into DJ_StepHistory at journey creation time
- If an admin later edits the journey template (adds/removes/reorders steps), active journey instances are unaffected
- The DJ_StepHistory records are the source of truth for active journeys, not the DJ_Steps template

### Pagination & List View Threshold

SharePoint Online has a 5,000 item list view threshold. The design prevents hitting it:

1. **Indexed columns** (created by SchemaService): DJ_History.Status, DJ_History.InitiatedBy, DJ_StepHistory.HistoryId, DJ_StepHistory.AssignedTo, DJ_StepHistory.Status
2. **All queries use `$top`**: default 100 items per page, with "Load more" in the DataGrid
3. **Filtered queries**: always filter by indexed columns first (e.g. Status eq 'Active' AND InitiatedBy eq currentUserId)
4. **Archive strategy** (future consideration): completed/cancelled journeys older than configurable threshold could be moved to a DJ_History_Archive list via a scheduled flow

### Schema Versioning Flow

1. `SchemaService.ensureSchema()` called on panel mount
2. Reads DJ_Config for SchemaVersion
3. If DJ_Config doesn't exist → check if user is site admin:
   - **Admin**: fresh install → create all lists with indexed columns, seed defaults, set version = EXPECTED_SCHEMA_VERSION
   - **Not admin**: show setup instructions UI — "Document Journey hasn't been set up on this site yet. Ask a site administrator to open the Document Journey panel to complete setup."
4. If version < EXPECTED_SCHEMA_VERSION → show upgrade UI → run migrations sequentially → update version
5. If version === EXPECTED_SCHEMA_VERSION → proceed normally

### Theme Integration

```tsx
// src/common/FluentThemeProvider.tsx — shared by both extension and web part
const spTheme = this.context.serviceScope.consume(ThemeProvider.serviceKey).tryGetTheme();
const fluentTheme = spTheme ? createV9Theme(spTheme) : webLightTheme;
<FluentProvider theme={fluentTheme}>{children}</FluentProvider>
```

### Tenant Properties (StorageEntity) for App Config

App-level config is stored as SPFx Tenant Properties, set via the App Catalog and read via `sp.web.getStorageEntity(key)`:

| Key | Purpose |
|-----|---------|
| DJ_GallerySiteUrl | Central gallery SharePoint site URL |
| DJ_FlowUrl_Notification | Power Automate HTTP trigger URL for Notification flow |
| DJ_FlowUrl_Approval | Power Automate HTTP trigger URL for Approval flow |
| DJ_FlowUrl_Signature | Power Automate HTTP trigger URL for Signature flow |
| DJ_FlowUrl_Task | Power Automate HTTP trigger URL for Task flow |
| DJ_FlowUrl_Feedback | Power Automate HTTP trigger URL for Feedback flow |

`FlowTriggerService.getConfiguredFlowTypes()` returns which step types have URLs configured. The UI uses this to warn users when starting a journey that includes steps with unconfigured flow types.

### SharePoint List Schema

**DJ_Journeys** - Journey templates

| Column | Type | Notes |
|--------|------|-------|
| Title | Text | Journey name |
| Description | Note | Journey description |
| IsDefault | Boolean | Show as default journey |
| LibraryScope | Text | Library-specific filter (empty = all libraries) |
| IsActive | Boolean | Active/inactive toggle |
| Category | Text | Optional categorization |
| Version | Number | Template version number, incremented on edit |

**DJ_Steps** - Steps within a journey template

| Column | Type | Notes |
|--------|------|-------|
| Title | Text | Step name |
| JourneyId | Lookup | Lookup to DJ_Journeys (with cascade delete behavior) |
| StepOrder | Number | Execution order |
| StepType | Choice | Notification/Approval/Signature/Task/Feedback |
| AssignedTo | Person or Group (multi) | Who performs this step |
| AssignToGroup | Text | Security group name (alternative to person) |
| CompletionRule | Choice | All/One (all must complete vs first response wins) |
| RequireComments | Boolean | Force comment on action |
| DueDays | Number | Days until due (from step activation) |
| AllowReject | Boolean | For Approval type — can reject |
| AllowDelegate | Boolean | Can reassign to someone else |

**DJ_History** - Active/completed journey instances

| Column | Type | Notes |
|--------|------|-------|
| Title | Text | Auto-generated reference |
| JourneyId | Number | Source journey template |
| JourneyName | Text | Denormalized journey name |
| JourneyVersion | Number | Template version at time of journey start |
| JourneyBatchId | Text | GUID grouping documents started together |
| DocumentUrl | Text | Full URL to document |
| DocumentName | Text | Filename |
| LibraryUrl | Text | Source library URL |
| Status | Choice | Active/Completed/Rejected/Cancelled/Stalled (indexed) |
| CurrentStepOrder | Number | Which step is active |
| TotalSteps | Number | Total steps in journey |
| InitiatedBy | Person | Who started it (indexed) |
| InitiatedDate | DateTime | When started |
| CompletedDate | DateTime | When finished |
| CancellationReason | Note | Why the journey was cancelled (if applicable) |

**DJ_StepHistory** - Per-step audit records

| Column | Type | Notes |
|--------|------|-------|
| Title | Text | Auto-generated |
| HistoryId | Number | Parent DJ_History item (indexed) |
| StepOrder | Number | Step number |
| StepName | Text | Denormalized (snapshotted from template) |
| StepType | Choice | Notification/Approval/Signature/Task/Feedback |
| AssignedTo | Person or Group (multi) | Who was assigned (indexed) |
| CompletionRule | Choice | Snapshotted from template: All/One |
| RequireComments | Boolean | Snapshotted from template |
| AllowReject | Boolean | Snapshotted from template |
| AllowDelegate | Boolean | Snapshotted from template |
| Status | Choice | Pending/Completed/Rejected/Skipped/FlowError (indexed) |
| ActionBy | Person | Who took action |
| ActionDate | DateTime | When action was taken |
| Comments | Note | Action comments |
| DueDate | DateTime | Calculated due date |
| DelegatedFrom | Person | Original assignee before delegation |
| DelegatedBy | Person | Who performed the delegation |
| DelegatedDate | DateTime | When delegation occurred |

**DJ_Config** - Site-level configuration

| Column | Type | Notes |
|--------|------|-------|
| Title | Text | Config key (e.g. "SchemaVersion", "ArchiveAfterDays") |
| Value | Note | Config value |

Note: SchemaVersion is stored as a DJ_Config item with Title="SchemaVersion". The list also holds other site-level settings such as archive thresholds, keeping the config store extensible without schema changes.
