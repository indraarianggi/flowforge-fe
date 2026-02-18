# Phase 11: Credentials Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Credentials page where users can view, add, test, and delete credentials for Telegram and Google integrations.

**Architecture:** `CredentialsPage` uses `useCredentials()`. Each credential renders as a card showing its type, status, and actions. An "Add credential" modal guides users through a type-specific form. The mock `credentialService.test()` simulates a connection check with a delay.

**Tech Stack:** React 18, TanStack Query, shadcn/ui, Lucide React, Sonner, React Hook Form + Zod

---

### Task 1: Build CredentialCard Component

**Files:**
- Create: `src/components/credentials/CredentialCard.tsx`

**Step 1: Write the component**
```tsx
// src/components/credentials/CredentialCard.tsx
import { useState } from "react"
import { Loader2, Trash2, CheckCircle2, XCircle, RefreshCw, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Credential } from "@/types"

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  telegram: { label: "Telegram Bot",     icon: "✈",  color: "bg-sky-100 text-sky-700" },
  google:   { label: "Google (OAuth2)",  icon: "G",  color: "bg-red-100 text-red-700" },
}

interface Props {
  credential: Credential
  onTest: (id: string) => Promise<{ ok: boolean; message: string }>
  onDelete: (id: string) => void
}

export function CredentialCard({ credential, onTest, onDelete }: Props) {
  const [isTesting, setIsTesting] = useState(false)
  const meta = TYPE_META[credential.type] ?? { label: credential.type, icon: "🔑", color: "bg-slate-100 text-slate-600" }

  async function handleTest() {
    setIsTesting(true)
    try {
      const result = await onTest(credential.id)
      if (result.ok) {
        toast.success("Connection successful", { description: result.message })
      } else {
        toast.error("Connection failed", { description: result.message })
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0", meta.color)}>
          {meta.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{credential.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{meta.label}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={handleTest} disabled={isTesting}>
                  <RefreshCw size={13} className="mr-2" /> Test connection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(credential.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 size={13} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status + metadata */}
          <div className="flex items-center gap-3 mt-3">
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
              credential.status === "connected"
                ? "bg-green-100 text-green-700"
                : credential.status === "expired"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            )}>
              {credential.status === "connected"
                ? <CheckCircle2 size={11} />
                : <XCircle size={11} />
              }
              <span className="capitalize">{credential.status}</span>
            </div>

            {credential.metadata?.botUsername && (
              <span className="text-xs text-slate-400">{credential.metadata.botUsername as string}</span>
            )}
            {credential.metadata?.email && (
              <span className="text-xs text-slate-400">{credential.metadata.email as string}</span>
            )}
          </div>

          {/* Test loading */}
          {isTesting && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
              <Loader2 size={11} className="animate-spin" />
              Testing connection…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 2: Build AddCredentialModal

**Files:**
- Create: `src/components/credentials/AddCredentialModal.tsx`

**Step 1: Write the modal**
```tsx
// src/components/credentials/AddCredentialModal.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CredentialType } from "@/types"

const CREDENTIAL_TYPES = [
  {
    type: "telegram" as CredentialType,
    label: "Telegram Bot",
    icon: "✈",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    description: "Connect a Telegram bot using its API token",
  },
  {
    type: "google" as CredentialType,
    label: "Google (OAuth2)",
    icon: "G",
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Connect Google Workspace (Sheets, Drive, etc.) via OAuth2",
  },
]

const telegramSchema = z.object({
  name: z.string().min(1, "Name is required"),
  botToken: z.string().min(10, "Enter a valid bot token"),
})

const googleSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

type TelegramForm = z.infer<typeof telegramSchema>
type GoogleForm = z.infer<typeof googleSchema>

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (data: { name: string; type: CredentialType; metadata: Record<string, unknown> }) => Promise<void>
  isCreating: boolean
}

export function AddCredentialModal({ open, onClose, onCreate, isCreating }: Props) {
  const [selectedType, setSelectedType] = useState<CredentialType | null>(null)

  const telegramForm = useForm<TelegramForm>({ resolver: zodResolver(telegramSchema) })
  const googleForm = useForm<GoogleForm>({ resolver: zodResolver(googleSchema) })

  function handleClose() {
    setSelectedType(null)
    telegramForm.reset()
    googleForm.reset()
    onClose()
  }

  async function handleTelegramSubmit(data: TelegramForm) {
    await onCreate({
      name: data.name,
      type: "telegram",
      metadata: { botUsername: "@mybot" },
    })
    handleClose()
  }

  async function handleGoogleSubmit(data: GoogleForm) {
    await onCreate({
      name: data.name,
      type: "google",
      metadata: { email: "user@gmail.com" },
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add credential</DialogTitle>
        </DialogHeader>

        {/* Step 1: Choose type */}
        {!selectedType && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-slate-500">Choose the service to connect:</p>
            {CREDENTIAL_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => setSelectedType(ct.type)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors hover:border-primary hover:bg-blue-50",
                  "border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 border", ct.color)}>
                  {ct.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ct.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ct.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2a: Telegram form */}
        {selectedType === "telegram" && (
          <form
            onSubmit={telegramForm.handleSubmit(handleTelegramSubmit)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cred-name">Credential name</Label>
              <Input
                id="cred-name"
                placeholder="My Telegram Bot"
                {...telegramForm.register("name")}
              />
              {telegramForm.formState.errors.name && (
                <p className="text-xs text-destructive">{telegramForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bot-token">Bot API token</Label>
              <Input
                id="bot-token"
                type="password"
                placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                className="font-mono text-sm"
                {...telegramForm.register("botToken")}
              />
              {telegramForm.formState.errors.botToken && (
                <p className="text-xs text-destructive">{telegramForm.formState.errors.botToken.message}</p>
              )}
              <p className="text-xs text-slate-400">
                Get your token from{" "}
                <span className="text-primary">@BotFather</span> on Telegram.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedType(null)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating && <Loader2 size={14} className="mr-2 animate-spin" />}
                Connect
              </Button>
            </div>
          </form>
        )}

        {/* Step 2b: Google form (placeholder OAuth) */}
        {selectedType === "google" && (
          <form
            onSubmit={googleForm.handleSubmit(handleGoogleSubmit)}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="google-cred-name">Credential name</Label>
              <Input
                id="google-cred-name"
                placeholder="Google Workspace"
                {...googleForm.register("name")}
              />
              {googleForm.formState.errors.name && (
                <p className="text-xs text-destructive">{googleForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-700 font-medium">Mock OAuth flow</p>
              <p className="text-xs text-amber-600 mt-0.5">
                In the full version, clicking "Connect" will open a Google OAuth consent screen.
                For now, clicking Connect adds a placeholder credential.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedType(null)}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating && <Loader2 size={14} className="mr-2 animate-spin" />}
                Connect with Google
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 3: Build Credentials Page

**Files:**
- Create: `src/app/routes/credentials.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the page**
```tsx
// src/app/routes/credentials.tsx
import { useState } from "react"
import { Plus, Key } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CredentialCard } from "@/components/credentials/CredentialCard"
import { AddCredentialModal } from "@/components/credentials/AddCredentialModal"
import {
  useCredentials,
  useCreateCredential,
  useDeleteCredential,
  useTestCredential,
} from "@/hooks/useCredentials"
import type { CredentialType } from "@/types"

export function CredentialsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: credentials = [], isLoading } = useCredentials()
  const { mutateAsync: createCredential, isPending: isCreating } = useCreateCredential()
  const { mutate: deleteCredential, isPending: isDeleting } = useDeleteCredential()
  const { mutateAsync: testCredential } = useTestCredential()

  async function handleCreate(data: {
    name: string
    type: CredentialType
    metadata: Record<string, unknown>
  }) {
    try {
      await createCredential(data)
      toast.success("Credential added")
      setShowAdd(false)
    } catch {
      toast.error("Failed to add credential")
    }
  }

  function handleDelete(id: string) {
    deleteCredential(id, {
      onSuccess: () => {
        toast.success("Credential deleted")
        setDeleteTarget(null)
      },
      onError: () => toast.error("Failed to delete credential"),
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credentials</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage authentication for your integrations
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} className="mr-2" />
          Add credential
        </Button>
      </div>

      {/* Credentials grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No credentials yet"
          description="Add credentials to connect Telegram bots and Google services to your workflows."
          action={{ label: "Add credential", onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {credentials.map((credential) => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              onTest={(id) => testCredential(id)}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      )}

      {/* Add credential modal */}
      <AddCredentialModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreate={handleCreate}
        isCreating={isCreating}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete credential?"
        description="Workflows using this credential will stop working until you add a new one."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        isPending={isDeleting}
      />
    </div>
  )
}
```

**Step 2: Update router**
```tsx
import { CredentialsPage } from "./routes/credentials"
```
And replace the stub:
```tsx
{ path: "/credentials", element: <CredentialsPage /> },
```

---

### Task 4: Manual Verification

**Step 1: Start dev server**
```bash
pnpm dev
```

**Step 2: Verify**
- Navigate to `/credentials` → see 2 seed credentials (Telegram + Google)
- Telegram card shows "connected" (green), Google shows "expired" (amber)
- Click "..." → "Test connection" on Telegram → 800ms delay → success toast
- Click "..." → "Test connection" on Google → failure toast (expired)
- Click "Add credential" → modal opens → choose Telegram → fill name + token → Connect → new card appears
- Choose Google → mock OAuth note → Connect → new card appears
- Delete credential → confirm dialog → card disappears
- Delete all → empty state shown

---

### Task 5: Run Tests & Commit

**Step 1: Run tests**
```bash
pnpm test:run
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: credentials page with add, test, and delete"
```
