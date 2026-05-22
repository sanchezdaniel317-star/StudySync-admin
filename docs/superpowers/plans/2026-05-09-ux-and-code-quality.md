# UX & Code Quality Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser `alert()` with toast notifications, show the logged-in admin's email in the sidebar, add filters and pagination to Reportes, deduplicate `formatDate`, and centralize the auth redirect logic.

**Architecture:** `sonner` handles toasts (installed as a dep, Toaster mounted in the admin layout). A new `AuthGuard` client component centralizes the "no token → redirect to /login" check so each page only needs to handle API-level 401/403. `formatDate` moves to `src/lib/utils.ts`. `auth.getAdminEmail()` decodes the JWT payload (no extra library — native `atob`) to surface the admin email in the Sidebar.

**Tech Stack:** Next.js 16, React 19, sonner (new), shadcn Dialog/Badge/Button (existing)

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/lib/utils.ts` | Add `formatDate` export |
| Modify | `src/lib/auth.ts` | Add `getAdminEmail()` JWT decoder |
| Create | `src/components/AuthGuard.tsx` | Client component: check token, redirect if missing |
| Modify | `src/app/(admin)/layout.tsx` | Mount `<AuthGuard>` + `<Toaster />` |
| Modify | `src/components/Sidebar.tsx` | Display admin email via `auth.getAdminEmail()` |
| Modify | `src/app/(admin)/usuarios/page.tsx` | Remove local token guard, replace `alert()` with toast, import `formatDate` from utils |
| Modify | `src/app/(admin)/reportes/page.tsx` | Remove local token guard, replace `alert()` with toast, import `formatDate` from utils, add type/status filters + pagination |
| Modify | `src/app/(admin)/dashboard/page.tsx` | Remove local token guard |

---

## Task 1: Shared utilities — `formatDate` + `getAdminEmail`

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add `formatDate` to `src/lib/utils.ts`**

Read the file first — it currently has only the `cn` helper from shadcn. Append:

```typescript
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
```

- [ ] **Step 2: Add `getAdminEmail` to `src/lib/auth.ts`**

The function decodes the JWT payload (middle segment, base64url) and returns `sub` or `email` from the claims. Append to the `auth` object:

```typescript
  getAdminEmail: (): string | null => {
    const token = Cookies.get(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      return (payload.sub as string) ?? (payload.email as string) ?? null;
    } catch {
      return null;
    }
  },
```

- [ ] **Step 3: Update `formatDate` import in `src/app/(admin)/usuarios/page.tsx`**

Remove the local `formatDate` function (lines 17-21):
```typescript
function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
```

Add the import at the top of the file (alongside the existing lib imports):
```typescript
import { formatDate } from "@/lib/utils";
```

- [ ] **Step 4: Update `formatDate` import in `src/app/(admin)/reportes/page.tsx`**

Remove the local `formatDate` function (same shape as above, lines 10-14).

Add the import:
```typescript
import { formatDate } from "@/lib/utils";
```

- [ ] **Step 5: Commit**
```bash
git add src/lib/utils.ts src/lib/auth.ts "src/app/(admin)/usuarios/page.tsx" "src/app/(admin)/reportes/page.tsx"
git commit -m "refactor: move formatDate to utils, add getAdminEmail JWT decoder"
```

---

## Task 2: `AuthGuard` + centralize auth redirect in layout

**Files:**
- Create: `src/components/AuthGuard.tsx`
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `src/app/(admin)/dashboard/page.tsx`
- Modify: `src/app/(admin)/usuarios/page.tsx`
- Modify: `src/app/(admin)/reportes/page.tsx`

- [ ] **Step 1: Create `src/components/AuthGuard.tsx`**

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!auth.getToken()) router.push("/login");
  }, [router]);
  return <>{children}</>;
}
```

- [ ] **Step 2: Update `src/app/(admin)/layout.tsx` to use AuthGuard**

The file currently contains:
```typescript
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ss-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

Replace with:
```typescript
import Sidebar from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ss-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Remove local token guard from `src/app/(admin)/dashboard/page.tsx`**

In the `useEffect`, remove the first two lines:
```typescript
// DELETE these two lines:
const token = auth.getToken();
if (!token) { router.push("/login"); return; }
```

And change the Promise.all to use a fresh token read each call. Replace the entire `useEffect` with:
```typescript
  useEffect(() => {
    const token = auth.getToken();
    if (!token) return;
    Promise.all([
      api.getUsers(token),
      api.getFeedback(token),
    ])
      .then(([u, f]) => { setUsers(u); setFeedback(f); })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          auth.removeToken();
          router.push("/login");
        } else {
          setError(err.message ?? "Error al conectar con el servidor");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);
```

(Note: the `if (!token) return;` is kept as a safety guard inside the effect, but the top-level redirect is now handled by `AuthGuard`.)

- [ ] **Step 4: Remove local token guard from `src/app/(admin)/usuarios/page.tsx`**

The current `useEffect` starts with:
```typescript
useEffect(() => {
    if (!token) { router.push("/login"); return; }
    api.getUsers(token)
```

Remove the `if (!token) { router.push("/login"); return; }` line. The effect should simply start with `api.getUsers(token!)` (or keep the early-return as `if (!token) return;` without the push, since AuthGuard handles redirection).

Replace the start of the useEffect:
```typescript
  useEffect(() => {
    if (!token) return;
    api.getUsers(token)
```

- [ ] **Step 5: Remove local token guard from `src/app/(admin)/reportes/page.tsx`**

Same pattern — remove `router.push("/login")` from the token check. Replace:
```typescript
  useEffect(() => {
    if (!token) { router.push("/login"); return; }
```
With:
```typescript
  useEffect(() => {
    if (!token) return;
```

Also update the `.catch` to not silently swallow all errors. Replace:
```typescript
      .catch(() => { auth.removeToken(); router.push("/login"); })
```
With:
```typescript
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          auth.removeToken();
          router.push("/login");
        }
      })
```

Add the `ApiError` import to the top of reportes/page.tsx:
```typescript
import { api, ApiError, FeedbackItem } from "@/lib/api";
```

- [ ] **Step 6: Commit**
```bash
git add src/components/AuthGuard.tsx "src/app/(admin)/layout.tsx" "src/app/(admin)/dashboard/page.tsx" "src/app/(admin)/usuarios/page.tsx" "src/app/(admin)/reportes/page.tsx"
git commit -m "refactor: centralize auth redirect in AuthGuard, remove per-page token guards"
```

---

## Task 3: Toast notifications with sonner

**Files:**
- Install: `sonner`
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `src/app/(admin)/usuarios/page.tsx`
- Modify: `src/app/(admin)/reportes/page.tsx`

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

Expected: resolves without errors, `sonner` appears in `package.json` dependencies.

- [ ] **Step 2: Add `<Toaster />` to the admin layout**

In `src/app/(admin)/layout.tsx`, add the Toaster import and mount it inside the layout:

```typescript
import Sidebar from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { Toaster } from "sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ss-background">
      <Toaster richColors position="top-right" />
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Replace `alert()` in `src/app/(admin)/usuarios/page.tsx`**

Add the import at the top:
```typescript
import { toast } from "sonner";
```

Replace all four `alert(...)` calls:

**In `handleEdit` (catch block):**
```typescript
// Before:
} catch (e) { alert(e instanceof Error ? e.message : "Error al guardar"); }
// After:
} catch (e) { toast.error(e instanceof Error ? e.message : "Error al guardar"); }
```

Add a success toast just before `setEditUser(null)` in `handleEdit`:
```typescript
      toast.success("Usuario actualizado");
      setEditUser(null);
```

**In `handleWarn` (catch block):**
```typescript
// Before:
} catch (e) { alert(e instanceof Error ? e.message : "Error al enviar"); }
// After:
} catch (e) { toast.error(e instanceof Error ? e.message : "Error al enviar"); }
```

Add a success toast just before `setWarnUser(null)` in `handleWarn`:
```typescript
      toast.success("Advertencia enviada");
      setWarnUser(null);
```

**In `handleBlock` (catch block):**
```typescript
// Before:
} catch (e) { alert(e instanceof Error ? e.message : "Error al bloquear"); }
// After:
} catch (e) { toast.error(e instanceof Error ? e.message : "Error al bloquear"); }
```

Add a success toast in the try block of `handleBlock`, after the `setUsers(...)` line:
```typescript
      setUsers((prev) => prev.map((x) => x.email === u.email ? { ...x, is_blocked } : x));
      toast.success(is_blocked ? "Usuario bloqueado" : "Usuario desbloqueado");
```

**In `handleDelete` (catch block):**
```typescript
// Before:
} catch (e) { alert(e instanceof Error ? e.message : "Error al eliminar"); }
// After:
} catch (e) { toast.error(e instanceof Error ? e.message : "Error al eliminar"); }
```

Add a success toast before `setDeleteUser(null)` in `handleDelete`:
```typescript
      toast.success("Usuario eliminado");
      setDeleteUser(null);
```

- [ ] **Step 4: Replace `alert()` in `src/app/(admin)/reportes/page.tsx`**

Add the import:
```typescript
import { toast } from "sonner";
```

In `handleMarkReviewed` catch block:
```typescript
// Before:
} catch (e) { alert(e instanceof Error ? e.message : "Error al actualizar"); }
// After:
} catch (e) { toast.error(e instanceof Error ? e.message : "Error al actualizar"); }
```

Add a success toast after the `setItems(...)` call in `handleMarkReviewed`:
```typescript
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: "revisado" } : item));
      toast.success("Reporte marcado como revisado");
```

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json "src/app/(admin)/layout.tsx" "src/app/(admin)/usuarios/page.tsx" "src/app/(admin)/reportes/page.tsx"
git commit -m "feat: replace alert() with sonner toast notifications and add success feedback"
```

---

## Task 4: Admin email in Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Display admin email in the Sidebar header**

In `src/components/Sidebar.tsx`, import `auth` is already present. Call `auth.getAdminEmail()` inside the component.

Add this line after the existing state declarations (after `const [pendingCount, setPendingCount] = useState(0)`):
```typescript
  const adminEmail = auth.getAdminEmail();
```

Replace the logo/brand section (the `<div className="px-6 py-5 border-b ...">` block) with:
```tsx
      <div className="px-6 py-5 border-b border-ss-input-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ss-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ss-text-dark">StudySync</p>
            {adminEmail ? (
              <p className="text-xs text-ss-text-muted truncate" title={adminEmail}>{adminEmail}</p>
            ) : (
              <p className="text-xs text-ss-text-muted">Admin Panel</p>
            )}
          </div>
        </div>
      </div>
```

- [ ] **Step 2: Commit**
```bash
git add src/components/Sidebar.tsx
git commit -m "feat: display admin email in sidebar header"
```

---

## Task 5: Reportes — filters by type/status + pagination

**Files:**
- Modify: `src/app/(admin)/reportes/page.tsx`

- [ ] **Step 1: Add filter state and pagination constant**

After the existing `const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);` line, add:

```typescript
  const [filterType, setFilterType] = useState<"all" | "bug" | "sugerencia">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pendiente" | "revisado">("all");
  const [page, setPage] = useState(0);
```

Add this constant above the component:
```typescript
const PAGE_SIZE = 20;
```

- [ ] **Step 2: Compute filtered + paginated items**

After the existing state declarations, add the derived values before the `return`:
```typescript
  const filtered = items
    .filter((i) => filterType === "all" || i.type === filterType)
    .filter((i) => filterStatus === "all" || i.status === filterStatus);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
```

- [ ] **Step 3: Add filter controls above the table**

The current JSX structure is:
```tsx
<div className="bg-white rounded-2xl border border-ss-input-border shadow-none overflow-hidden">
  {loading ? (...) : (<div className="overflow-x-auto">...table...</div>)}
</div>
```

Add a filter bar between the outer `<div>` opening and the `{loading ?` check:
```tsx
        <div className="p-4 border-b border-ss-input-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-ss-input-border overflow-hidden text-sm">
            {(["all", "bug", "sugerencia"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setFilterType(v); setPage(0); }}
                className={`px-3 py-1.5 transition-colors ${
                  filterType === v
                    ? "bg-ss-primary text-white"
                    : "text-ss-text-muted hover:bg-ss-background"
                }`}
              >
                {v === "all" ? "Todos" : v === "bug" ? "Bugs" : "Sugerencias"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-ss-input-border overflow-hidden text-sm">
            {(["all", "pendiente", "revisado"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setFilterStatus(v); setPage(0); }}
                className={`px-3 py-1.5 transition-colors ${
                  filterStatus === v
                    ? "bg-ss-primary text-white"
                    : "text-ss-text-muted hover:bg-ss-background"
                }`}
              >
                {v === "all" ? "Todos" : v === "pendiente" ? "Pendientes" : "Revisados"}
              </button>
            ))}
          </div>
          <span className="text-xs text-ss-text-muted ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>
```

- [ ] **Step 4: Replace `items.map` with `pageItems.map` in the table body**

Find:
```tsx
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-ss-text-muted">Sin reportes</td></tr>
                )}
                {items.map((item) => (
```

Replace with:
```tsx
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-ss-text-muted">Sin resultados</td></tr>
                )}
                {pageItems.map((item) => (
```

- [ ] **Step 5: Add pagination footer below the table `</div>`**

After the closing `</div>` of `overflow-x-auto` and before the outer closing `</div>`:
```tsx
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-ss-input-border flex items-center justify-between text-sm text-ss-text-muted">
            <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
```

- [ ] **Step 6: Commit**
```bash
git add "src/app/(admin)/reportes/page.tsx"
git commit -m "feat: add type/status filters and pagination to Reportes"
```
