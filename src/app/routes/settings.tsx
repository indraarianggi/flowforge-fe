// src/app/routes/settings.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, User2, Lock, AlertTriangle, CheckCircle2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

// ── Section Card ────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  accent,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  accent?: "default" | "danger"
}) {
  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md ${
        accent === "danger"
          ? "border-red-200"
          : "border-slate-200/80"
      }`}
    >
      <div
        className={`px-6 py-4 border-b flex items-start gap-3 ${
          accent === "danger"
            ? "border-red-100 bg-red-50/40"
            : "border-slate-100 bg-slate-50/50"
        }`}
      >
        <div
          className={`mt-0.5 p-2 rounded-lg ${
            accent === "danger"
              ? "bg-red-100 text-red-600"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
        <div>
          <h2
            className={`text-sm font-semibold ${
              accent === "danger" ? "text-red-800" : "text-slate-800"
            }`}
          >
            {title}
          </h2>
          <p
            className={`text-xs mt-0.5 ${
              accent === "danger" ? "text-red-500" : "text-slate-500"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name }: { name?: string }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <div className="relative group">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md ring-4 ring-primary/10 group-hover:ring-primary/20 transition-all duration-300">
        <span className="text-white text-xl font-bold tracking-tight">{initials}</span>
      </div>
      {/* Subtle pulse ring */}
      <div className="absolute inset-0 rounded-full ring-2 ring-primary/20 animate-ping opacity-0 group-hover:opacity-100" />
    </div>
  )
}

// ── Field Row ───────────────────────────────────────────────────────────────

function FieldRow({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const user = storage.get<User>(STORAGE_KEYS.user)

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
    <div className="min-h-full bg-slate-50/40">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account preferences</p>
        </div>

        <div className="space-y-5">
          {/* ── Profile ── */}
          <SectionCard
            icon={User2}
            title="Profile"
            description="Your public identity within FlowForge."
          >
            {/* Avatar + identity */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <Avatar name={user?.name} />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{user?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 size={11} />
                  Active account
                </span>
              </div>
            </div>

            <form
              onSubmit={profileForm.handleSubmit((data) => updateProfile(data))}
              className="space-y-4"
            >
              <FieldRow
                id="settings-name"
                label="Display name"
                error={profileForm.formState.errors.name?.message}
              >
                <Input
                  id="settings-name"
                  {...profileForm.register("name")}
                  placeholder="Your name"
                  className="h-9 text-sm"
                />
              </FieldRow>

              <FieldRow
                id="settings-email"
                label="Email address"
                hint="Email cannot be changed in this version."
              >
                <Input
                  id="settings-email"
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                  className="h-9 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </FieldRow>

              <div className="pt-1">
                <Button type="submit" size="sm" disabled={isUpdatingProfile} className="h-8 text-xs px-4">
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 size={12} className="mr-1.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* ── Password ── */}
          <SectionCard
            icon={Lock}
            title="Password"
            description="Change the password you use to sign in."
          >
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4"
            >
              <FieldRow
                id="current-password"
                label="Current password"
                error={passwordForm.formState.errors.currentPassword?.message}
              >
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("currentPassword")}
                  className="h-9 text-sm"
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-4">
                <FieldRow
                  id="new-password"
                  label="New password"
                  error={passwordForm.formState.errors.newPassword?.message}
                >
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    {...passwordForm.register("newPassword")}
                    className="h-9 text-sm"
                  />
                </FieldRow>

                <FieldRow
                  id="confirm-new-password"
                  label="Confirm password"
                  error={passwordForm.formState.errors.confirmPassword?.message}
                >
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Repeat new password"
                    {...passwordForm.register("confirmPassword")}
                    className="h-9 text-sm"
                  />
                </FieldRow>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-600">
                  <span className="font-medium">Demo mode:</span> Password changes are not persisted in this version.
                </p>
              </div>

              <div className="pt-1">
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs px-4">
                  Update password
                </Button>
              </div>
            </form>
          </SectionCard>

          {/* ── Danger Zone ── */}
          <SectionCard
            icon={AlertTriangle}
            title="Danger zone"
            description="Irreversible actions — proceed with caution."
            accent="danger"
          >
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-200 bg-red-50/60">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">Delete account</p>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  Permanently clears all workflows, executions, and credentials from this device.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-shrink-0 h-8 text-xs px-4"
              >
                Delete account
              </Button>
            </div>
          </SectionCard>
        </div>
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
