export type DeliveryProofType =
  | 'pickup_photo'
  | 'delivery_photo'
  | 'arrival_photo'
  | 'signature'
  | 'other'

export interface DeliveryProof {
  proof_id?: number
  order_id?: number
  proof_type: string
  photo_url: string
  captured_at?: string
  status?: string
}

export function isViewableProofUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  return trimmed.startsWith('https://') || trimmed.startsWith('http://')
}

export function pickLatestProof(
  proofs: DeliveryProof[] | undefined | null,
  proofType: DeliveryProofType
): DeliveryProof | null {
  if (!proofs?.length) return null
  const matches = proofs.filter((p) => p.proof_type === proofType)
  if (!matches.length) return null
  return [...matches].sort((a, b) => {
    const ta = a.captured_at ? new Date(a.captured_at).getTime() : 0
    const tb = b.captured_at ? new Date(b.captured_at).getTime() : 0
    return tb - ta
  })[0]
}

export function getProofDisplayState(proof: DeliveryProof | null): {
  kind: 'missing' | 'unviewable' | 'image'
  url?: string
} {
  if (!proof?.photo_url) {
    return { kind: 'missing' }
  }
  if (!isViewableProofUrl(proof.photo_url)) {
    return { kind: 'unviewable' }
  }
  return { kind: 'image', url: proof.photo_url.trim() }
}
