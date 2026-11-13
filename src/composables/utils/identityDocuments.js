/**
 * Identity documents: a company decides which document *types* exist, and each
 * employee holds one *document* per type.
 *
 * Two endpoint families sit behind that split, and only one of them is about a
 * person:
 *
 *   /user/companies/{company_id}/identity-document-types/          (company)
 *   /user/companies/{company_id}/employees/{employee_id}/identity-documents/
 *                                                                  (employee)
 *
 * The company-level write is `POST` / `PATCH` only — the API documents no
 * delete, so a type is retired by clearing `is_active`, not removed. The
 * employee-level `POST` is an upsert: sending a type that employee already has
 * answers 201 with `replaced: true`, and an identical re-submission answers 200
 * with `unchanged: true`, which is why the dialog reports those apart.
 *
 * Read-side normalisers live here so the settings panel, the employee dialog
 * and anything else that prints a document cannot disagree about a label or
 * about what `is_active` defaults to.
 */

import { longLabel, todayIso } from 'src/composables/utils/calendarDate'

const asText = (value) => (value == null ? '' : String(value).trim())

/**
 * The list endpoints answer a bare array, but DRF's paginated shape (`results`)
 * and the app's `{ data }` envelope are both seen elsewhere in this API, so both
 * are accepted rather than trusting one.
 */
export function unwrapIdentityDocumentList(payload) {
  if (Array.isArray(payload)) return payload
  const rows = payload?.data ?? payload?.results ?? payload?.items
  return Array.isArray(rows) ? rows : []
}

/** A document type, as the panel's table and the dialog's select read it. */
export function normaliseDocumentType(raw) {
  const src = raw || {}
  const sortOrder = Number(src.sort_order)
  return {
    id: src.id ?? null,
    code: asText(src.code),
    name: asText(src.name) || asText(src.code) || 'Untitled type',
    isRequired: src.is_required === true,
    // An absent flag is an active type: only an explicit false retires one.
    isActive: src.is_active !== false,
    requiresExpiry: src.requires_expiry === true,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  }
}

/** `sort_order` first, then name — the order the API's own field asks for. */
export function sortDocumentTypes(rows = []) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

/**
 * One employee's document row.
 *
 * `document_type` arrives as the type's id while `document_type_name` /
 * `document_type_code` / `document_type_requires_expiry` arrive beside it, so
 * the row needs no second lookup to render a label.
 */
export function normaliseIdentityDocument(raw) {
  const src = raw || {}
  return {
    id: src.id ?? null,
    typeId: src.document_type?.id ?? src.document_type ?? null,
    typeName: asText(src.document_type_name) || asText(src.document_type_code) || 'Document',
    typeCode: asText(src.document_type_code),
    requiresExpiry: src.document_type_requires_expiry === true,
    number: asText(src.document_number),
    issuedAt: src.issued_at || '',
    expiresAt: src.expires_at || '',
    attachment: src.attachment || '',
    isVerified: src.is_verified === true,
    verifiedAt: src.verified_at || '',
    isActive: src.is_active !== false,
    updatedAt: src.updated_at || '',
  }
}

/**
 * Whether a document has lapsed. A document with no expiry date is not expired:
 * absence of a date is not absence of a document.
 */
export function isExpired(document) {
  return Boolean(document?.expiresAt) && document.expiresAt < todayIso()
}

/** The expiry line under a document's name. Never a bare blank. */
export function documentExpiryLabel(document) {
  if (!document?.expiresAt) return 'No expiry date'
  const label = longLabel(document.expiresAt)
  return isExpired(document) ? `Expired ${label}` : `Expires ${label}`
}

/**
 * The body for the employee-documents `POST`.
 *
 * Multipart only when there is a file to send — the endpoint accepts JSON for
 * every other write, and sending a JSON body keeps the request readable in the
 * network panel. `issued_at` / `expires_at` travel as `null` rather than as an
 * empty string when absent, which is the shape the endpoint documents.
 *
 * @param {{typeId: number|string, number: string, issuedAt: string,
 *          expiresAt: string, attachment: File|null}} form
 * @returns {FormData|object}
 */
export function identityDocumentBody({ typeId, number, issuedAt, expiresAt, attachment }) {
  const hasFile = typeof File !== 'undefined' && attachment instanceof File

  if (hasFile) {
    const body = new FormData()
    body.append('document_type', typeId)
    body.append('document_number', number || '')
    if (issuedAt) body.append('issued_at', issuedAt)
    if (expiresAt) body.append('expires_at', expiresAt)
    body.append('attachment', attachment)
    return body
  }

  return {
    document_type: typeId,
    document_number: number || '',
    issued_at: issuedAt || null,
    expires_at: expiresAt || null,
  }
}
