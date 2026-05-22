# Dashboard Improvements & Nice-to-Have Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark mode toggle, block confirmation dialog, report detail modal, monthly-registrations bar chart, pending-reports widget, and sidebar pending-reports badge.

**Architecture:** All features are self-contained UI additions to existing pages and the Sidebar. Dark mode uses a `useTheme` hook that toggles `.dark` on `<html>` and persists to `localStorage`. The chart is a pure CSS/Tailwind bar chart built from the already-fetched `users` array. The sidebar fetches the pending count independently via the existing `api.getFeedback`. No new dependencies needed.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, lucide-react, shadcn Dialog (already installed)

---

## File Map

| Action   | File                                              | Change                                              |
|----------|---------------------------------------------------|-----------------------------------------------------|
| Create   | `src/hooks/useTheme.ts`                           | Dark mode hook (toggle + localStorage persist)      |
| Modify   | `src/app/layout.tsx`                              | Inline script to prevent dark-mode flash on reload  |
| Modify   | `src/app/globals.css`                             | Add dark-mode overrides for `--color-ss-*` tokens   |
| Modify   | `src/components/Sidebar.tsx`                      | Dark toggle button + pending-reports badge          |
| Modify   | `src/app/(admin)/dashboard/page.tsx`              | Monthly bar chart + pending-reports card            |
| Modify   | `src/app/(admin)/usuarios/page.tsx`               | Block/unblock confirmation dialog                   |
| Modify   | `src/app/(admin)/reportes/page.tsx`               | Full-description detail modal                       |

---

## Task 1: `useTheme` hook + anti-flash script + dark CSS tokens

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create the hook**

`src/hooks/useTheme.ts`:
```typescript
"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return { dark, toggle };
}
```

- [ ] **Step 2: Add anti-flash script to layout**

Read `src/app/layout.tsx`. It currently looks like:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ... font setup ...
export default function RootLayout({ children }: ...) {
  return (
    <html lang="en">
      <body ...>{children}</body>
    </html>
  );
}
```

Add `<script>` as the first child of `<html>` (before `<body>`):
```tsx
<html lang="en">
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}})();`,
      }}
    />
  </head>
  <body className={...}>{children}</body>
</html>
```

- [ ] **Step 3: Add dark-mode overrides for ss-* color tokens in globals.css**

In `src/app/globals.css`, add these lines inside the existing `.dark { }` block (after all the existing `--background`, `--foreground`, etc. vars):
```css
  --color-ss-primary: #3D9DF2;
  --color-ss-primary-dark: #56AAFF;
  --color-ss-light-blue: #5BB4FF;
  --color-ss-background: #0f1117;
  --color-ss-input-border: #2a3045;
  --color-ss-text-dark: #e8ecef;
  --color-ss-text-muted: #8b96b0;
```

- [ ] **Step 4: Commit**
```bash
git add src/hooks/useTheme.ts src/app/layout.tsx src/app/globals.css
git commit -m "feat: add dark mode hook, anti-flash script, and dark token overrides"
```

---

## Task 2: Dark mode toggle button + pending-reports badge in Sidebar

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add imports at the top of Sidebar.tsx**

Add to the existing imports:
```tsx
import { Moon, Sun, AlertCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
```

- [ ] **Step 2: Add state inside the `Sidebar` component (right after existing `const router = useRouter()`)**

```tsx
const { dark, toggle } = useTheme();
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  const token = auth.getToken();
  if (!token) return;
  api.getFeedback(token)
    .then((items) => setPendingCount(items.filter((i) => i.status === "pendiente").length))
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Update the Reportes nav item to show a badge**

In the `navItems` array the Reportes item renders as:
```tsx
<Link key={item.href} href={item.href} className={...}>
  {item.icon}
  {item.label}
</Link>
```

Replace the Reportes link with a conditional badge. Change the entire `{navItems.map(...)}` block:
```tsx
{navItems.map((item) => {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      key={item.href}
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-ss-primary/10 text-ss-primary"
          : "text-ss-text-muted hover:bg-ss-background hover:text-ss-text-dark"
      }`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.href === "/reportes" && pendingCount > 0 && (
        <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-ss-error text-white text-[10px] font-bold">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      )}
    </Link>
  );
})}
```

- [ ] **Step 4: Add dark mode toggle button at the bottom of the sidebar**

In `src/components/Sidebar.tsx`, the bottom section currently has only the logout button inside `<div className="px-3 py-4 border-t border-ss-input-border">`. Add the toggle button **before** the logout button:
```tsx
<div className="px-3 py-4 border-t border-ss-input-border space-y-1">
  <button
    onClick={toggle}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ss-text-muted hover:bg-ss-background hover:text-ss-text-dark transition-colors"
  >
    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    {dark ? "Modo claro" : "Modo oscuro"}
  </button>
  <button
    onClick={handleLogout}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ss-text-muted hover:bg-red-50 hover:text-ss-error transition-colors"
  >
    <svg ...existing logout svg...>...</svg>
    Cerrar sesión
  </button>
</div>
```

- [ ] **Step 5: Commit**
```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add dark mode toggle and pending-reports badge to sidebar"
```

---

## Task 3: Block/unblock confirmation dialog in Usuarios

**Files:**
- Modify: `src/app/(admin)/usuarios/page.tsx`

- [ ] **Step 1: Add `confirmBlockUser` state**

After the existing `const [deleting, setDeleting] = useState(false);` line, add:
```tsx
const [confirmBlockUser, setConfirmBlockUser] = useState<AdminUser | null>(null);
```

- [ ] **Step 2: Replace the `handleBlock` call in the action buttons**

Find this button in the JSX:
```tsx
<button title={u.is_blocked ? "Desbloquear" : "Bloquear"} onClick={() => handleBlock(u)}
```
Change `onClick={() => handleBlock(u)}` to `onClick={() => setConfirmBlockUser(u)}`.

- [ ] **Step 3: Add the confirmation Dialog**

After the existing `deleteUser` Dialog (around line 231), add:
```tsx
<Dialog open={!!confirmBlockUser} onOpenChange={(o) => !o && setConfirmBlockUser(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {confirmBlockUser?.is_blocked ? "¿Desbloquear usuario?" : "¿Bloquear usuario?"}
      </DialogTitle>
    </DialogHeader>
    <p className="text-sm text-ss-text-muted py-2">
      {confirmBlockUser?.is_blocked
        ? <>El usuario <span className="font-medium text-ss-text-dark">{confirmBlockUser?.name}</span> podrá volver a iniciar sesión.</>
        : <>El usuario <span className="font-medium text-ss-text-dark">{confirmBlockUser?.name}</span> no podrá iniciar sesión hasta que sea desbloqueado.</>
      }
    </p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setConfirmBlockUser(null)}>Cancelar</Button>
      <Button
        onClick={async () => {
          if (confirmBlockUser) {
            await handleBlock(confirmBlockUser);
            setConfirmBlockUser(null);
          }
        }}
        className={confirmBlockUser?.is_blocked
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-ss-error hover:bg-red-700 text-white"
        }
      >
        {confirmBlockUser?.is_blocked ? "Desbloquear" : "Bloquear"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Commit**
```bash
git add src/app/(admin)/usuarios/page.tsx
git commit -m "feat: add block/unblock confirmation dialog"
```

---

## Task 4: Report detail modal in Reportes

**Files:**
- Modify: `src/app/(admin)/reportes/page.tsx`

- [ ] **Step 1: Add Dialog imports and `selectedItem` state**

Add Dialog imports at the top (after the existing imports):
```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
```

Add state inside the component after `const [updating, setUpdating] = useState<string | null>(null);`:
```tsx
const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
```

- [ ] **Step 2: Make the title cell clickable**

Find the title `<td>` in the table:
```tsx
<td className="px-4 py-3 font-medium text-ss-text-dark max-w-[180px] truncate">{item.title}</td>
```

Replace with:
```tsx
<td className="px-4 py-3 max-w-[180px]">
  <button
    onClick={() => setSelectedItem(item)}
    className="font-medium text-ss-primary hover:underline text-left truncate block w-full"
    title={item.title}
  >
    {item.title}
  </button>
</td>
```

- [ ] **Step 3: Add the detail Dialog**

After the closing `</div>` of the component's outer `<div>`, add:
```tsx
<Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle className="pr-6">{selectedItem?.title}</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={selectedItem?.type === "bug" ? "bg-red-100 text-ss-error border-0" : "bg-blue-100 text-ss-primary border-0"}>
          {selectedItem?.type === "bug" ? "Bug" : "Sugerencia"}
        </Badge>
        <Badge className={selectedItem?.status === "revisado" ? "bg-green-100 text-green-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>
          {selectedItem?.status === "revisado" ? "Revisado" : "Pendiente"}
        </Badge>
        <span className="text-xs text-ss-text-muted ml-auto">{formatDate(selectedItem?.created_at ?? null)}</span>
      </div>
      <p className="text-xs text-ss-text-muted">{selectedItem?.user_email}</p>
      <p className="text-sm text-ss-text-dark whitespace-pre-wrap leading-relaxed">{selectedItem?.description}</p>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Commit**
```bash
git add src/app/(admin)/reportes/page.tsx
git commit -m "feat: add full-description detail modal for reports"
```

---

## Task 5: Dashboard — monthly bar chart + pending-reports widget

**Files:**
- Modify: `src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Add Link import and helper functions**

Add to existing imports:
```tsx
import Link from "next/link";
import { api, ApiError, AdminUser, FeedbackItem } from "@/lib/api";
```

(Note: `FeedbackItem` is a new import from `@/lib/api`.)

Add these helper functions **above** the `StatCard` component:

```tsx
const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getMonthlyRegistrations(users: AdminUser[]) {
  const counts: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = 0;
  }
  users.forEach((u) => {
    if (!u.created_at) return;
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in counts) counts[key]++;
  });
  return Object.entries(counts).map(([key, count]) => {
    const month = parseInt(key.split("-")[1]) - 1;
    return { label: MONTH_NAMES[month], value: count };
  });
}
```

Add the `BarChart` component after `StatCard`:
```tsx
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-3 h-28 pt-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[11px] text-ss-text-muted font-medium">{d.value || ""}</span>
          <div
            className="w-full bg-ss-primary/70 hover:bg-ss-primary rounded-t transition-all"
            style={{ height: `${(d.value / max) * 72}px`, minHeight: d.value > 0 ? "6px" : "0" }}
          />
          <span className="text-[11px] text-ss-text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `feedback` state and fetch it**

Inside `DashboardPage`, add state after `const [error, setError] = useState("")`:
```tsx
const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
```

Add a second `api.getFeedback` call inside the same `useEffect`, chained after `api.getUsers`:
```tsx
useEffect(() => {
  const token = auth.getToken();
  if (!token) { router.push("/login"); return; }
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

- [ ] **Step 3: Compute derived values and render chart + pending widget**

After the existing `newThisMonth` computation, add:
```tsx
const monthlyData = getMonthlyRegistrations(users);
const pendingReports = feedback.filter((f) => f.status === "pendiente").length;
```

Replace the entire `return (...)` JSX with:
```tsx
return (
  <div>
    <h1 className="text-2xl font-bold text-ss-text-dark mb-6">Dashboard</h1>
    {loading ? (
      <p className="text-ss-text-muted">Cargando...</p>
    ) : error ? (
      <p className="text-sm text-ss-error bg-red-50 rounded-lg px-4 py-3">{error}</p>
    ) : (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard label="Total de usuarios" value={users.length} color="text-ss-primary" />
          <StatCard label="Usuarios bloqueados" value={users.filter((u) => u.is_blocked).length} color="text-ss-error" />
          <StatCard label="Nuevos este mes" value={newThisMonth} color="text-green-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Monthly registrations chart */}
          <Card className="p-6 border border-ss-input-border shadow-none sm:col-span-2">
            <p className="text-sm font-medium text-ss-text-muted mb-4">Registros por mes (últimos 6 meses)</p>
            <BarChart data={monthlyData} />
          </Card>

          {/* Pending reports widget */}
          <Link href="/reportes" className="block">
            <Card className="p-6 border border-ss-input-border shadow-none h-full hover:border-ss-primary transition-colors cursor-pointer">
              <p className="text-sm font-medium text-ss-text-muted mb-2">Reportes pendientes</p>
              <p className={`text-4xl font-bold ${pendingReports > 0 ? "text-amber-500" : "text-green-600"}`}>
                {pendingReports}
              </p>
              <p className="text-xs text-ss-text-muted mt-3">
                {pendingReports > 0 ? "Haz clic para revisarlos →" : "Todo al día ✓"}
              </p>
            </Card>
          </Link>
        </div>
      </div>
    )}
  </div>
);
```

- [ ] **Step 4: Commit**
```bash
git add src/app/(admin)/dashboard/page.tsx
git commit -m "feat: add monthly registrations chart and pending reports widget to dashboard"
```
