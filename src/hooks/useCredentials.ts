import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { credentialService } from "@/services/credentialService"

export const credentialKeys = {
  all: ["credentials"] as const,
  detail: (id: string) => ["credentials", id] as const,
}

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.all,
    queryFn: credentialService.list,
  })
}

export function useCreateCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: credentialService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: credentialKeys.all }),
  })
}

export function useDeleteCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: credentialService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: credentialKeys.all }),
  })
}

export function useTestCredential() {
  return useMutation({
    mutationFn: credentialService.test,
  })
}
