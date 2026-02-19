// src/components/credentials/AddCredentialModal.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    abbr: "TG",
    gradient: "from-sky-400 to-blue-500",
    iconBg: "bg-sky-50 border-sky-200",
    iconText: "text-sky-600",
    description: "Connect a Telegram bot using its API token",
    hoverBorder: "hover:border-sky-300 hover:bg-sky-50/50",
  },
  {
    type: "google" as CredentialType,
    label: "Google OAuth2",
    abbr: "G",
    gradient: "from-red-400 to-orange-500",
    iconBg: "bg-red-50 border-red-200",
    iconText: "text-red-600",
    description: "Connect Google Workspace (Sheets, Drive, etc.) via OAuth2",
    hoverBorder: "hover:border-red-300 hover:bg-red-50/50",
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

  const selected = CREDENTIAL_TYPES.find((ct) => ct.type === selectedType)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                onClick={() => setSelectedType(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors -ml-1"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <DialogTitle className="text-base">
              {selectedType ? `Connect ${selected?.label}` : "Add credential"}
            </DialogTitle>
          </div>
          {selectedType && (
            <p className="text-xs text-slate-400 pl-6">
              {selected?.description}
            </p>
          )}
        </DialogHeader>

        {/* Step 1: Choose type */}
        {!selectedType && (
          <div className="space-y-2.5 pt-1">
            <p className="text-xs text-slate-500 mb-3">Choose the service to connect:</p>
            {CREDENTIAL_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => setSelectedType(ct.type)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150",
                  "border-slate-200",
                  ct.hoverBorder,
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm tracking-tight flex-shrink-0 border",
                  ct.iconBg,
                  ct.iconText,
                )}>
                  {ct.abbr}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{ct.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ct.description}</p>
                </div>
              </button>
            ))}

            <div className="flex items-center gap-1.5 pt-2 text-xs text-slate-400">
              <ShieldCheck size={12} className="text-slate-300" />
              Credentials are stored locally and never sent to external servers.
            </div>
          </div>
        )}

        {/* Step 2a: Telegram form */}
        {selectedType === "telegram" && (
          <form
            onSubmit={telegramForm.handleSubmit(handleTelegramSubmit)}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cred-name" className="text-xs font-medium text-slate-700">
                Credential name
              </Label>
              <Input
                id="cred-name"
                placeholder="e.g. My Telegram Bot"
                {...telegramForm.register("name")}
              />
              {telegramForm.formState.errors.name && (
                <p className="text-xs text-destructive">{telegramForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bot-token" className="text-xs font-medium text-slate-700">
                Bot API token
              </Label>
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
                <span className="text-sky-600 font-medium">@BotFather</span> on Telegram.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedType(null)}
                disabled={isCreating}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating && <Loader2 size={14} className="mr-2 animate-spin" />}
                Connect bot
              </Button>
            </div>
          </form>
        )}

        {/* Step 2b: Google form (mock OAuth) */}
        {selectedType === "google" && (
          <form
            onSubmit={googleForm.handleSubmit(handleGoogleSubmit)}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="google-cred-name" className="text-xs font-medium text-slate-700">
                Credential name
              </Label>
              <Input
                id="google-cred-name"
                placeholder="e.g. Google Workspace"
                {...googleForm.register("name")}
              />
              {googleForm.formState.errors.name && (
                <p className="text-xs text-destructive">{googleForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-1">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <ExternalLink size={11} />
                Mock OAuth flow
              </p>
              <p className="text-xs text-amber-600 leading-relaxed">
                In production, clicking "Connect" opens a Google OAuth consent screen.
                For now, a placeholder credential will be added.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedType(null)}
                disabled={isCreating}
              >
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
