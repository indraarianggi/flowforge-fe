// src/components/credentials/CredentialCard.tsx
import { useState } from "react"
import { Loader2, Trash2, CheckCircle2, XCircle, AlertCircle, RefreshCw, MoreHorizontal, Calendar } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
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

const TYPE_META: Record<string, { label: string; abbr: string; gradient: string; iconBg: string; iconText: string }> = {
  telegram: {
    label: "Telegram Bot",
    abbr: "TG",
    gradient: "from-sky-400 to-blue-500",
    iconBg: "bg-sky-50 border-sky-200",
    iconText: "text-sky-600",
  },
  google: {
    label: "Google OAuth2",
    abbr: "G",
    gradient: "from-red-400 to-orange-500",
    iconBg: "bg-red-50 border-red-200",
    iconText: "text-red-600",
  },
}

const STATUS_CONFIG = {
  connected: {
    icon: CheckCircle2,
    label: "Connected",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
  expired: {
    icon: AlertCircle,
    label: "Expired",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  invalid: {
    icon: XCircle,
    label: "Invalid",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
}

interface Props {
  credential: Credential
  onTest: (id: string) => Promise<{ ok: boolean; message: string }>
  onDelete: (id: string) => void
}

export function CredentialCard({ credential, onTest, onDelete }: Props) {
  const [isTesting, setIsTesting] = useState(false)
  const meta = TYPE_META[credential.type] ?? {
    label: credential.type,
    abbr: "?",
    gradient: "from-slate-400 to-slate-500",
    iconBg: "bg-slate-50 border-slate-200",
    iconText: "text-slate-600",
  }
  const status = STATUS_CONFIG[credential.status] ?? STATUS_CONFIG.invalid

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
    <div className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent stripe */}
      <div className={cn("h-1 w-full bg-gradient-to-r", meta.gradient)} />

      <div className="p-5">
        <div className="flex items-start gap-3.5">
          {/* Type icon */}
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border font-bold text-sm tracking-tight",
            meta.iconBg,
            meta.iconText,
          )}>
            {meta.abbr}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate leading-tight">
                  {credential.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{meta.label}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleTest} disabled={isTesting}>
                    <RefreshCw size={13} className="mr-2" />
                    Test connection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(credential.id)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 size={13} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status + metadata */}
            <div className="flex items-center flex-wrap gap-2 mt-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border",
                status.className,
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>

              {typeof credential.metadata?.botUsername === "string" && (
                <span className="text-xs text-slate-400 font-mono truncate">
                  {credential.metadata.botUsername}
                </span>
              )}
              {typeof credential.metadata?.email === "string" && (
                <span className="text-xs text-slate-400 truncate">
                  {credential.metadata.email}
                </span>
              )}
            </div>

            {/* Test loading indicator */}
            {isTesting && (
              <div className="flex items-center gap-1.5 mt-2.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
                <Loader2 size={11} className="animate-spin" />
                Testing connection…
              </div>
            )}
          </div>
        </div>

        {/* Footer: created date */}
        <div className="flex items-center gap-1.5 mt-4 pt-3.5 border-t border-slate-100">
          <Calendar size={10} className="text-slate-300" />
          <span className="text-[11px] text-slate-300">
            Added {formatDistanceToNow(new Date(credential.createdAt), { addSuffix: true })}
          </span>
          {credential.expiresAt && credential.status === "expired" && (
            <span className="ml-auto text-[11px] text-amber-500">
              Expired {formatDistanceToNow(new Date(credential.expiresAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
