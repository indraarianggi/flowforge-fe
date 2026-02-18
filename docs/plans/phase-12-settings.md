# Phase 12: Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Settings page with a Profile section (name, email, avatar initial), a password change form (mock), and a Danger Zone with account deletion (clears localStorage and redirects to login).

**Architecture:** Settings reads the current user from localStorage directly. Profile updates write back to localStorage via `authService`. Password change is a mock — it shows a success toast without doing anything. Account deletion calls `storage.clearAll()` then navigates to `/login`.

**Tech Stack:** React Hook Form, Zod, shadcn/ui, Sonner, React Router 6

---

### Task 1: Update authService With Profile Update

**Files:**
- Modify: `src/services/authService.ts`

**Step 1: Add updateProfile method**
```ts
// Add to authService object in src/services/authService.ts
async updateProfile(data: { name: string }): Promise<User> {
  await delay(400)
  const user = storage.get<User>(STORAGE_KEYS.user)
  if (!user) throw new Error("Not authenticated")
  const updated: User = { ...user, name: data.name, updatedAt: new Date().toISOString() }
  storage.set(STORAGE_KEYS.user, updated)
  return updated
},
```

---

### Task 2: Build Settings Page

**Files:**
- Create: `src/app/routes/settings.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the page**
```tsx
// src/app/routes/settings.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { authService } from "@/services/authService"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import type { User } from "@/types"

// ── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const user = storage.get<User>(STORAGE_KEYS.user)

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "" },
  })

  const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: () => toast.success("Profile updated"),
    onError: () => toast.error("Failed to update profile"),
  })

  // Password form (mock)
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  function handlePasswordSubmit() {
    // Mock: just show success, reset form
    setTimeout(() => {
      toast.success("Password updated")
      passwordForm.reset()
    }, 500)
  }

  // Account deletion
  function handleDeleteAccount() {
    storage.clearAll()
    toast.success("Account deleted")
    navigate("/login")
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account preferences</p>
      </div>

      <div className="space-y-6">
        {/* ── Profile ── */}
        <SectionCard
          title="Profile"
          description="Your name is shown in the sidebar and on your account."
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit((data) => updateProfile(data))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Display name</Label>
              <Input
                id="settings-name"
                {...profileForm.register("name")}
                placeholder="Your name"
              />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                value={user?.email ?? ""}
                readOnly
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-400">Email cannot be changed in this version.</p>
            </div>

            <Button type="submit" size="sm" disabled={isUpdatingProfile}>
              {isUpdatingProfile && <Loader2 size={14} className="mr-2 animate-spin" />}
              Save changes
            </Button>
          </form>
        </SectionCard>

        {/* ── Password ── */}
        <SectionCard
          title="Password"
          description="Change the password you use to sign in."
        >
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register("currentPassword")}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                {...passwordForm.register("newPassword")}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="Repeat new password"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600">
                <span className="font-medium">Note:</span> Password changes are not persisted in this demo version.
              </p>
            </div>

            <Button type="submit" size="sm" variant="outline">
              Update password
            </Button>
          </form>
        </SectionCard>

        {/* ── Danger Zone ── */}
        <SectionCard
          title="Danger zone"
          description="Irreversible actions. Proceed with caution."
        >
          <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
            <div>
              <p className="text-sm font-semibold text-red-800">Delete account</p>
              <p className="text-xs text-red-600 mt-0.5">
                Clears all local data including workflows, executions, and credentials.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete account
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete your account?"
        description="This will permanently delete all your workflows, executions, and credentials from this device. This action cannot be undone."
        confirmLabel="Yes, delete everything"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
```

**Step 2: Update router**
```tsx
import { SettingsPage } from "./routes/settings"
```
And replace the stub:
```tsx
{ path: "/settings", element: <SettingsPage /> },
```

---

### Task 3: Manual Verification

**Step 1: Start dev server**
```bash
pnpm dev
```

**Step 2: Verify**
- Navigate to `/settings`
- See avatar with initials, name and email pre-filled
- Change name → Save → toast "Profile updated" → sidebar name updates on next load
- Password form: empty submit → validation errors on all 3 fields
- Mismatched passwords → "Passwords do not match" on confirm field
- Correct password form → toast "Password updated", form resets
- Email field is read-only (disabled)
- "Delete account" button → confirm dialog → on confirm → localStorage cleared → redirect to `/login`
- After deletion, navigating to `/dashboard` redirects to `/login` (ProtectedRoute)

---

### Task 4: Run Tests & Commit

**Step 1: Run tests**
```bash
pnpm test:run
```

**Step 2: Final commit**
```bash
git add -A
git commit -m "feat: settings page with profile update, password form, and account deletion"
```

---

### Task 5: Final Verification — Full App Flow

**Step 1: Clear localStorage**

In browser DevTools: Application → Local Storage → clear all `flowforge:*` keys.

**Step 2: Run full user journey**

1. `/login` → sign in with any email/password → redirect to `/dashboard`
2. Dashboard → see 3 seed workflow cards, 4 stat boxes
3. Toggle a workflow active/inactive
4. "New Workflow" → editor opens
5. Add a Manual Trigger → configure sample data
6. Add an HTTP Request → fill URL, headers, auth
7. Add an IF node → add condition → see branch container
8. Add nodes to true/false branches
9. Add a Loop node → configure forEach mode
10. Click "Run" → navigate to Execution Monitor → watch live simulation
11. Back → Dashboard → view history for a workflow
12. Execution History → filter by status → click row → monitor opens
13. `/credentials` → test Telegram → add new Telegram → delete Google
14. `/settings` → update name → change password → check danger zone modal
15. Logout (sidebar) → redirected to `/login`

All flows should complete without JavaScript errors in the console.
