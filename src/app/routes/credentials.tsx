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
    <div className="min-h-full bg-slate-50/40">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Credentials</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage authentication for your integrations
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus size={15} className="mr-1.5" />
            Add credential
          </Button>
        </div>

        {/* Credentials grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-36 bg-white rounded-2xl border border-slate-200/80 overflow-hidden animate-pulse"
              >
                <div className="h-1 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 bg-slate-100 rounded-xl" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
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
          <>
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

            <p className="text-xs text-slate-400 mt-6 text-center">
              {credentials.length} credential{credentials.length !== 1 ? "s" : ""} stored
            </p>
          </>
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
    </div>
  )
}
