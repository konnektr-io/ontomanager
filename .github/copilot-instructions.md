# OntoManager - AI Coding Agent Instructions

## Project Overview

OntoManager is a web-based RDF ontology management application that enables users to import, visualize, edit, and commit ontologies stored in GitHub repositories. The application uses **client-side RDF graph storage** with browser-level persistence for working with semantic web data.

**Tech Stack:**

- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Vue Router
- **Backend**: Flask (Python) - provides GitHub OAuth proxy and OpenAI integration
- **RDF Processing**: N3.js, Quadstore, browser-level (IndexedDB wrapper)
- **Deployment**: Docker (multi-stage build)

## ✅ MIGRATION COMPLETE: PrimeVue → shadcn-vue

**STATUS**: Migration complete! All components and views have been migrated to shadcn-vue.

### Migration Architecture

```
/client (OLD - PrimeVue)    →    /web (NEW - shadcn-vue)
├── services (✅ COPIED)          ├── services (✅ MIGRATED)
├── stores (✅ COPIED)            ├── stores (✅ MIGRATED)
├── utils (✅ COPIED)             ├── utils (✅ MIGRATED)
├── components (✅ COMPLETE)       ├── components/ui (✅ shadcn-vue + custom tree)
│   ├── TermValue.vue (✅)        │   ├── TermValue.vue (✅ MIGRATED)
│   ├── UserMenu.vue (✅)         │   ├── UserMenu.vue (✅ MIGRATED)
│   ├── NewResourceDialog.vue (✅)│   ├── NewResourceDialog.vue (✅ MIGRATED)
│   ├── NewIssueDialog.vue (✅)   │   ├── NewIssueDialog.vue (✅ MIGRATED)
│   ├── IssueDialog.vue (✅)      │   ├── IssueDialog.vue (✅ MIGRATED)
│   ├── PropertyValue.vue (✅)    │   ├── PropertyValue.vue (✅ MIGRATED)
│   ├── PropertyValues.vue (✅)   │   ├── PropertyValues.vue (✅ MIGRATED)
│   ├── ResourceViewer.vue (✅)   │   ├── ResourceViewer.vue (✅ MIGRATED - Improved UX)
│   ├── TheHeader.vue (✅)        │   ├── TheHeader.vue (✅ MIGRATED)
│   ├── ResourceTree.vue (✅)     │   ├── ResourceTree.vue (✅ MIGRATED - Custom tree)
│   └── All editor dialogs (✅)   │   └── ui/tree/ (✅ Custom tree component built)
└── views (✅ COMPLETE)          └── views (✅ COMPLETE)
```

### Migration Rules

1. **Working Directory**: All new work happens in `/web`
2. **No PrimeVue**: Never import or reference PrimeVue components
3. **Component Installation**: Use `$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; pnpm dlx shadcn-vue@latest add <component>` to add shadcn-vue components
4. **Already Installed**: button, dialog, input, select, separator, sheet, sidebar, skeleton, tooltip, badge, textarea, dropdown-menu, card, collapsible, resizable, avatar, spinner, sonner, alert-dialog

### Component Mapping (PrimeVue → shadcn-vue)

| PrimeVue Component | shadcn-vue Equivalent                                                  | Status             |
| ------------------ | ---------------------------------------------------------------------- | ------------------ |
| `Button`           | `button`                                                               | ✅ Installed       |
| `Dialog`           | `dialog`                                                               | ✅ Installed       |
| `InputText`        | `input`                                                                | ✅ Installed       |
| `Select`           | `select`                                                               | ✅ Installed       |
| `Divider`          | `separator`                                                            | ✅ Installed       |
| `Textarea`         | `textarea`                                                             | ✅ Installed       |
| `Tree`             | **Custom tree component** (based on shadcn-react tree-view)            | ✅ Built           |
| `Menu`             | `dropdown-menu` or `context-menu`                                      | ✅ Installed       |
| `Panel`            | `card` or `collapsible`                                                | ✅ Installed       |
| `Card`             | `card`                                                                 | ✅ Installed       |
| `Splitter`         | `resizable`                                                            | ✅ Installed       |
| `Avatar`           | `avatar`                                                               | ✅ Installed       |
| `Tag`              | `badge`                                                                | ✅ Installed       |
| `ProgressSpinner`  | `spinner`                                                              | ✅ Installed       |
| `useToast`         | `sonner` or `toast`                                                    | ✅ Installed       |
| `useConfirm`       | `alert-dialog`                                                         | ✅ Installed       |
| `useDialog`        | **Declarative pattern** - separate components are `DialogContent` only | ✅ Pattern decided |

### Migration Workflow

1. **Install Required Component**: `pnpm dlx shadcn-vue@latest add <component-name>`
2. **Copy Component File**: From `/client/src/components/` to `/web/src/components/`
3. **Update Imports**: Replace PrimeVue imports with shadcn-vue equivalents
4. **Adapt Props/Events**: Match shadcn-vue component APIs (use Reka UI patterns)
5. **Update Styles**: Use Tailwind CSS classes (shadcn uses utility-first approach)
6. **Test**: Run `pnpm dev` in `/web` to verify component works
7. **Iterate**: Fix any issues before moving to next component

### Critical Migration Decisions

**Tree Component Strategy:**

- Build custom reusable tree component based on [shadcn-react tree-view](https://raw.githubusercontent.com/MrLightful/shadcn-tree-view/refs/heads/main/src/tree-view.tsx)
- Port React implementation to Vue 3 with TypeScript
- Use collapsible and button shadcn-vue components as foundation

**Dialog Pattern (Important):**

- **Separate dialog components contain ONLY DialogContent** (not full Dialog wrapper)
- Parent components must wrap triggers in `<Dialog>` + `<DialogTrigger>`
- For context/dropdown menus: wrap entire menu in Dialog, use `<DialogTrigger as-child>`
- No need for v-if - DialogTrigger handles open/close state
- Example:
  ```vue
  <!-- Parent component -->
  <Dialog>
    <DropdownMenu>
      <DropdownMenuTrigger>...</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DialogTrigger as-child>
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DialogTrigger>
      </DropdownMenuContent>
    </DropdownMenu>
    <NewResourceDialog /> <!-- This is DialogContent only -->
  </Dialog>
  ```

**Splitter/Resizable:**

- Use shadcn-vue's `resizable` component for split panes
- Replaces PrimeVue's Splitter/SplitterPanel

### Components to Migrate (Priority Order)

**Phase 1 - Simple Components:** ✅ **COMPLETE**

- `TermValue.vue` (uses Tag → badge) ✅ **MIGRATED**
- `UserMenu.vue` (uses Avatar, Menu → dropdown-menu) ✅ **MIGRATED**

**Phase 2 - Form Components:** ✅ **COMPLETE**

- `NewResourceDialog.vue` (uses Dialog, InputText, Button) ✅ **MIGRATED**
- `NewIssueDialog.vue` (uses Dialog, InputText, Textarea, Button) ✅ **MIGRATED**
- `IssueDialog.vue` (uses Dialog, Textarea, Button) ✅ **MIGRATED**

**Phase 3 - Complex Components:** ✅ **COMPLETE**

- `PropertyValue.vue`, `PropertyValues.vue` (uses Panel, Divider, Button) ✅ **MIGRATED**
- `ResourceViewer.vue` (uses Panel, Menu, Tag, Button) ✅ **MIGRATED - Improved UX**

**Phase 4 - Editor Dialogs:** ✅ **COMPLETE**

- `AddPropertyDialog.vue` ✅ **MIGRATED**
- `EditPredicateObjectsDialog.vue` ✅ **MIGRATED** (complex with dynamic objects, language/datatype selection)
- `EditPropertyShapeDialog.vue` ✅ **MIGRATED** (SHACL constraints)
- `EditRestrictionDialog.vue` ✅ **MIGRATED** (OWL restrictions)
- `CreateOntologyDialog.vue` ✅ **MIGRATED** (ontology metadata + GitHub commit)

**Phase 5 - Large Components:** ✅ **COMPLETE**

- `TheHeader.vue` (uses Select, Button, InputText, Dialog, ProgressSpinner) ✅ **MIGRATED**
- `ResourceTree.vue` (uses Tree - custom tree component implementation) ✅ **MIGRATED**

**Phase 6 - Views:** ✅ **COMPLETE**

- `TheOntologyManagerView.vue` (uses Splitter → resizable) ✅ **MIGRATED**
- `LoadOntologyView.vue` (uses Card, Button, Select) ✅ **MIGRATED**
- `App.vue` (main app shell) ✅ **MIGRATED**

## Core Architecture Patterns

### RDF Graph Store (GraphStoreService)

**Location**: `web/src/services/GraphStoreService.ts`

The application uses **client-side RDF storage** with Quadstore backed by browser-level (IndexedDB):

```typescript
// Quads are RDF statements: Subject, Predicate, Object, Graph
interface Quad {
  subject: NamedNode | BlankNode;
  predicate: NamedNode;
  object: NamedNode | Literal | BlankNode;
  graph: NamedNode | DefaultGraph;
}
```

**Key Patterns:**

- **Graphs** are identified by named nodes (URLs)
- **Scopes** provide isolation for different ontologies
- **Built-in vocabularies** (RDF, RDFS, OWL, SKOS, SHACL) are preloaded
- **Tree generation** uses RDF predicates (subClassOf, subPropertyOf, rdf:type)

**Common Operations:**

```typescript
// Add ontology from URL or GitHub
await graphStoreService.loadGraph(url, graphNode, scopeId);

// Query quads
const quads = await graphStoreService.getQuads(pattern, scopeId);

// Generate resource trees (classes, properties, individuals)
const classTree = await graphStoreService.getClassesTree(visibleGraphs);
```

### GitHub Integration (GitHubService)

**Location**: `web/src/services/GitHubService.ts`

- **OAuth Flow**: Frontend → Flask proxy (`/api/github/oauth/*`) → GitHub
- **Token Management**: Stores tokens in localStorage with expiry tracking
- **Auto-refresh**: Handles token refresh transparently
- **Octokit**: Uses @octokit/rest for GitHub API calls

**Auth Flow:**

1. User clicks login → redirects to Flask `/api/github/oauth/login`
2. GitHub redirects back with `code`
3. Frontend exchanges code via `/api/github/oauth/token`
4. GitHubService stores token and creates authenticated Octokit instance

### State Management (Pinia Stores)

**graph.ts** - Manages ontologies, resources, and edit state:

- `userGraphs`: Array of loaded ontologies with metadata
- `selectedOntology`: Currently active ontology for editing
- `selectedResource`: URI of currently viewed resource
- `undoStack`/`redoStack`: Tracks quad changes for undo/redo
- `visibleGraphs`: Filters which ontologies appear in trees

**github.ts** - Manages GitHub authentication:

- `user`: Current GitHub user
- `isSignedIn`: Authentication status
- Methods: `handleGitHubCallback()`, `loginToGitHub()`, `logout()`

### Routing & Navigation

**Key Pattern**: Resource selection updates URL query parameter:

```typescript
// URL format: /{treeType}?uri={resourceUri}
// Example: /classes?uri=http://example.org/MyClass

watch(selectedResource, (uri) => {
  router.push({ query: { uri: uri || undefined } });
});
```

**Tree Types**: `classes`, `properties`, `individuals`, `decomposition`, `ontologies`

## Development Workflow

### Frontend Development (`/web`)

```bash
# Install dependencies
pnpm install

# Development server (Vite)
pnpm dev

# Type checking
pnpm build  # Runs vue-tsc + vite build

# Add shadcn-vue components
pnpm dlx shadcn-vue@latest add <component-name>
```

### Backend Development (`/app`)

```bash
# Install dependencies
pip install -r requirements.txt

# Run Flask dev server
python app.py

# Environment variables needed:
# - GITHUB_CLIENT_ID
# - GITHUB_CLIENT_SECRET
# - GITHUB_REDIRECT_URI
# - OPENAI_API_KEY
```

### Docker Build

```bash
# Multi-stage build: frontend builder + Python runtime
docker build -t ontomanager .

# Frontend built in /app/static, served by Flask
```

## Project-Specific Conventions

### Import Paths

- Services and stores imported from `/web/src/`: Use `@/services/`, `@/stores/`
- During migration, `/client` components reference `/web` services: `../../../web/src/services/`
- After migration, all imports will use `@/` alias

### RDF Vocabulary Utilities

**Location**: `web/src/utils/vocab.ts`

Provides typed access to common RDF terms:

```typescript
import { vocab } from "@/utils/vocab";

// Instead of string literals:
const classType = vocab.rdfs.Class; // NamedNode<'http://www.w3.org/2000/01/rdf-schema#Class'>
const label = vocab.rdfs.label;
```

### Tree Node Structure

All tree visualizations use consistent `ResourceTreeNode` interface:

```typescript
interface ResourceTreeNode {
  key: string; // URI of resource
  label: string; // Display name (from rdfs:label or skos:prefLabel)
  data: {
    parentUri?: string; // For hierarchical relationships
    graph: string; // Source ontology URI
  };
  icon?: string; // Icon identifier
  children: ResourceTreeNode[];
}
```

### Quad Change Tracking

Edits are tracked as quad additions/removals for undo/redo:

```typescript
// Add quad to undo stack
addQuad(subject, predicate, object, graph);

// Remove quad
removeQuad(subject, predicate, object, graph);

// Serialize changes for commit
const changes = serializeUndoStack();
```

### GitHub Commit Workflow

1. User edits resource in selected ontology
2. Changes tracked in undo stack
3. Click "Commit" → calls `writeGraph()`
4. Serializes quads to Turtle format
5. Creates GitHub commit via Octokit
6. Clears undo stack

## Important Implementation Notes

### Why Client-Side Graph Storage?

OntoManager uses **browser-level + Quadstore** instead of server-side storage because:

- Enables offline-capable ontology editing
- No backend infrastructure needed for graph storage
- Direct GitHub integration for persistence
- Users work with ontologies as "files" rather than database entities

### Tree Generation Logic

**Classes Tree**: Follows `rdfs:subClassOf` relationships
**Decomposition Tree**: Follows restrictions on properties with 'hasPart' in URI (configurable)
**Properties Tree**: Follows `rdfs:subPropertyOf` relationships
**Individuals Tree**: Groups by `rdf:type` (instances of classes)

### Editing Permissions

Editing only enabled when:

- Ontology is hosted on GitHub (`graph.owner && graph.repo`)
- User has write access (validated by GitHub token scopes)
- Ontology is selected in header dropdown

## Testing & Validation

- Run dev servers for both frontend (`pnpm dev` in `/web`) and backend (`python app.py` in `/app`)
- Test GitHub OAuth flow with real GitHub app credentials
- Verify RDF quad operations in browser DevTools → Application → IndexedDB
- Check undo/redo functionality after editing resources

## Final Migration Steps

Once all components are migrated and working:

1. Update `/Dockerfile` to build from `/web` instead of `/client`
2. Update root `README.md` references
3. Delete `/client` folder
4. Rename `/web` → `/client`
5. Update all documentation
6. Clean up this migration section from copilot-instructions.md
