import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { supabase } from '../../lib/supabase'
import {
  parseSpreadsheet,
  type SpreadsheetRow,
} from '../../lib/spreadsheetParser'

type Employee = {
  id: string
  user_id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

type LeadImportModalProps = {
  organizationId: string
  userId: string | null
  employees: Employee[]
  onClose: () => void
  onImported: () => Promise<void> | void
}

type ImportField =
  | 'company_name'
  | 'contact_first_name'
  | 'contact_last_name'
  | 'email'
  | 'phone'
  | 'job_title'
  | 'website'
  | 'status'
  | 'source'
  | 'score'
  | 'estimated_value'
  | 'notes'
  | 'assigned_to'

type ColumnMapping = Record<
  ImportField,
  string
>

type ImportDefaults = {
  status: string
  source: string
  assigned_to: string
}

type ImportMode =
  | 'skip'
  | 'update'
  | 'create'

type ImportRow = {
  rowNumber: number
  companyName: string
  contactFirstName: string
  contactLastName: string
  email: string
  phone: string
  jobTitle: string
  website: string
  status: string
  source: string
  score: string
  estimatedValue: string
  notes: string
  assignedTo: string
}

type ExistingLead = {
  id: string
  company_id: string | null
  contact_id: string | null
}

type ImportStats = {
  total: number
  imported: number
  skipped: number
  duplicates: number
  errors: number
}

const fields: Array<{
  key: ImportField
  label: string
  required?: boolean
}> = [
  {
    key: 'company_name',
    label: 'Company Name',
  },
  {
    key: 'contact_first_name',
    label: 'Contact First Name',
  },
  {
    key: 'contact_last_name',
    label: 'Contact Last Name',
  },
  {
    key: 'email',
    label: 'Email',
  },
  {
    key: 'phone',
    label: 'Phone',
  },
  {
    key: 'job_title',
    label: 'Job Title',
  },
  {
    key: 'website',
    label: 'Website',
  },
  {
    key: 'status',
    label: 'Status',
  },
  {
    key: 'source',
    label: 'Source',
  },
  {
    key: 'score',
    label: 'Lead Score',
  },
  {
    key: 'estimated_value',
    label: 'Estimated Value',
  },
  {
    key: 'notes',
    label: 'Notes',
  },
  {
    key: 'assigned_to',
    label: 'Assigned To',
  },
]

const emptyMapping: ColumnMapping = {
  company_name: '',
  contact_first_name: '',
  contact_last_name: '',
  email: '',
  phone: '',
  job_title: '',
  website: '',
  status: '',
  source: '',
  score: '',
  estimated_value: '',
  notes: '',
  assigned_to: '',
}

const defaultValues: ImportDefaults = {
  status: 'New',
  source: 'Imported',
  assigned_to: '',
}

const leadStatuses = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
}

function findBestHeader(
  headers: string[],
  field: ImportField
): string {
  const aliases: Record<
    ImportField,
    string[]
  > = {
    company_name: [
      'company',
      'companyname',
      'business',
      'businessname',
      'organization',
      'organizationname',
      'companytitle',
    ],
    contact_first_name: [
      'firstname',
      'first',
      'contactfirstname',
      'contactfirst',
      'fname',
    ],
    contact_last_name: [
      'lastname',
      'last',
      'contactlastname',
      'contactlast',
      'lname',
      'surname',
    ],
    email: [
      'email',
      'emailaddress',
      'contactemail',
      'businessemail',
      'workemail',
    ],
    phone: [
      'phone',
      'phonenumber',
      'telephone',
      'mobile',
      'mobilenumber',
      'contactphone',
    ],
    job_title: [
      'jobtitle',
      'title',
      'position',
      'role',
      'contacttitle',
    ],
    website: [
      'website',
      'web',
      'url',
      'websiteurl',
      'domain',
    ],
    status: [
      'status',
      'leadstatus',
      'leadstage',
      'stage',
    ],
    source: [
      'source',
      'leadsource',
      'origin',
    ],
    score: [
      'score',
      'leadscore',
      'rating',
    ],
    estimated_value: [
      'estimatedvalue',
      'value',
      'dealvalue',
      'potentialvalue',
      'revenue',
    ],
    notes: [
      'notes',
      'note',
      'comments',
      'comment',
      'description',
    ],
    assigned_to: [
      'assignedto',
      'assignee',
      'owner',
      'salesrep',
      'salesrepresentative',
      'rep',
      'assigned',
    ],
  }

  const normalizedHeaders =
    headers.map(normalize)

  const possible =
    aliases[field].map(normalize)

  for (const alias of possible) {
    const index =
      normalizedHeaders.indexOf(alias)

    if (index >= 0) {
      return headers[index]
    }
  }

  return ''
}

function getMappedValue(
  row: SpreadsheetRow,
  mapping: string
): string {
  if (!mapping) {
    return ''
  }

  return String(row[mapping] ?? '').trim()
}

function makeImportRow(
  row: SpreadsheetRow,
  rowNumber: number,
  mapping: ColumnMapping,
  defaults: ImportDefaults
): ImportRow {
  return {
    rowNumber,

    companyName: getMappedValue(
      row,
      mapping.company_name
    ),

    contactFirstName: getMappedValue(
      row,
      mapping.contact_first_name
    ),

    contactLastName: getMappedValue(
      row,
      mapping.contact_last_name
    ),

    email: getMappedValue(
      row,
      mapping.email
    ).toLowerCase(),

    phone: getMappedValue(
      row,
      mapping.phone
    ),

    jobTitle: getMappedValue(
      row,
      mapping.job_title
    ),

    website: getMappedValue(
      row,
      mapping.website
    ),

    status:
      getMappedValue(
        row,
        mapping.status
      ) || defaults.status,

    source:
      getMappedValue(
        row,
        mapping.source
      ) || defaults.source,

    score: getMappedValue(
      row,
      mapping.score
    ),

    estimatedValue:
      getMappedValue(
        row,
        mapping.estimated_value
      ),

    notes: getMappedValue(
      row,
      mapping.notes
    ),

    assignedTo:
      getMappedValue(
        row,
        mapping.assigned_to
      ) || defaults.assigned_to,
  }
}

function resolveEmployee(
  value: string,
  employees: Employee[]
): string | null {
  if (!value) {
    return null
  }

  const normalized = normalize(value)

  const employee = employees.find(
    (item) => {
      return (
        normalize(item.full_name) ===
          normalized ||
        normalize(item.email) ===
          normalized ||
        item.user_id === value
      )
    }
  )

  return employee?.user_id ?? null
}

function isValidEmail(
  email: string
): boolean {
  if (!email) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  )
}

export default function LeadImportModal({
  organizationId,
  userId,
  employees,
  onClose,
  onImported,
}: LeadImportModalProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  const [step, setStep] = useState<
    'upload' | 'mapping' | 'preview' | 'complete'
  >('upload')

  const [dragging, setDragging] =
    useState(false)

  const [fileName, setFileName] =
    useState('')

  const [headers, setHeaders] =
    useState<string[]>([])

  const [rows, setRows] =
    useState<SpreadsheetRow[]>([])

  const [mapping, setMapping] =
    useState<ColumnMapping>(emptyMapping)

  const [defaults, setDefaults] =
    useState<ImportDefaults>(
      defaultValues
    )

  const [importMode, setImportMode] =
    useState<ImportMode>('skip')

  const [loadingFile, setLoadingFile] =
    useState(false)

  const [importing, setImporting] =
    useState(false)

  const [progress, setProgress] =
    useState(0)

  const [error, setError] =
    useState('')

  const [stats, setStats] =
    useState<ImportStats>({
      total: 0,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: 0,
    })

  const [importErrors, setImportErrors] =
    useState<string[]>([])

  // --------------------------------
  // Parse file
  // --------------------------------

  async function handleFile(
    file: File
  ) {
    try {
      setLoadingFile(true)
      setError('')

      const parsed =
        await parseSpreadsheet(file)

      setFileName(file.name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)

      const automaticMapping: ColumnMapping = {
        company_name:
          findBestHeader(
            parsed.headers,
            'company_name'
          ),

        contact_first_name:
          findBestHeader(
            parsed.headers,
            'contact_first_name'
          ),

        contact_last_name:
          findBestHeader(
            parsed.headers,
            'contact_last_name'
          ),

        email:
          findBestHeader(
            parsed.headers,
            'email'
          ),

        phone:
          findBestHeader(
            parsed.headers,
            'phone'
          ),

        job_title:
          findBestHeader(
            parsed.headers,
            'job_title'
          ),

        website:
          findBestHeader(
            parsed.headers,
            'website'
          ),

        status:
          findBestHeader(
            parsed.headers,
            'status'
          ),

        source:
          findBestHeader(
            parsed.headers,
            'source'
          ),

        score:
          findBestHeader(
            parsed.headers,
            'score'
          ),

        estimated_value:
          findBestHeader(
            parsed.headers,
            'estimated_value'
          ),

        notes:
          findBestHeader(
            parsed.headers,
            'notes'
          ),

        assigned_to:
          findBestHeader(
            parsed.headers,
            'assigned_to'
          ),
      }

      setMapping(automaticMapping)
      setStep('mapping')
    } catch (error) {
      console.error(
        'Spreadsheet parsing error:',
        error
      )

      setError(
        error instanceof Error
          ? error.message
          : 'Unable to read spreadsheet'
      )
    } finally {
      setLoadingFile(false)
    }
  }

  // --------------------------------
  // Drop handlers
  // --------------------------------

  function handleDrop(
    event: React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault()
    setDragging(false)

    const file =
      event.dataTransfer.files?.[0]

    if (file) {
      void handleFile(file)
    }
  }

  // --------------------------------
  // Build preview rows
  // --------------------------------

  const importRows = useMemo(() => {
    return rows.map(
      (row, index) =>
        makeImportRow(
          row,
          index + 2,
          mapping,
          defaults
        )
    )
  }, [rows, mapping, defaults])

  // --------------------------------
  // Validation
  // --------------------------------

  const validation = useMemo(() => {
    const valid: ImportRow[] = []
    const invalid: Array<{
      row: ImportRow
      reason: string
    }> = []

    const seenEmails = new Set<string>()

    for (const row of importRows) {
      if (
        !row.companyName &&
        !row.contactFirstName &&
        !row.email &&
        !row.phone
      ) {
        invalid.push({
          row,
          reason:
            'No company, contact, email, or phone information',
        })

        continue
      }

      if (!isValidEmail(row.email)) {
        invalid.push({
          row,
          reason: 'Invalid email address',
        })

        continue
      }

      if (row.score) {
        const score = Number(row.score)

        if (
          !Number.isInteger(score) ||
          score < 0 ||
          score > 100
        ) {
          invalid.push({
            row,
            reason:
              'Score must be between 0 and 100',
          })

          continue
        }
      }

      if (row.estimatedValue) {
        const value = Number(
          row.estimatedValue
        )

        if (
          Number.isNaN(value) ||
          value < 0
        ) {
          invalid.push({
            row,
            reason:
              'Estimated value is invalid',
          })

          continue
        }
      }

      if (row.email) {
        if (seenEmails.has(row.email)) {
          invalid.push({
            row,
            reason:
              'Duplicate email within spreadsheet',
          })

          continue
        }

        seenEmails.add(row.email)
      }

      valid.push(row)
    }

    return {
      valid,
      invalid,
    }
  }, [importRows])

  // --------------------------------
  // Import
  // --------------------------------

  async function handleImport() {
    if (!validation.valid.length) {
      setError(
        'There are no valid rows to import.'
      )

      return
    }

    try {
      setImporting(true)
      setError('')
      setImportErrors([])
      setProgress(0)

      const errors: string[] = []

      let imported = 0
      let skipped = 0
      let duplicates = 0

      const total =
        validation.valid.length

      for (
        let index = 0;
        index < total;
        index++
      ) {
        const row =
          validation.valid[index]

        try {
          let existingLead:
            | ExistingLead
            | null = null

          if (row.email) {
            const {
              data: contactMatches,
              error: contactLookupError,
            } = await supabase
              .from('contacts')
              .select(
                'id, company_id'
              )
              .eq(
                'organization_id',
                organizationId
              )
              .eq(
                'email',
                row.email
              )
              .limit(1)

            if (contactLookupError) {
              throw contactLookupError
            }

            const contact =
              contactMatches?.[0]

            if (contact) {
              const {
                data: leadMatches,
                error:
                  leadLookupError,
              } = await supabase
                .from('leads')
                .select(
                  'id, company_id, contact_id'
                )
                .eq(
                  'organization_id',
                  organizationId
                )
                .eq(
                  'contact_id',
                  contact.id
                )
                .limit(1)

              if (leadLookupError) {
                throw leadLookupError
              }

              existingLead =
                leadMatches?.[0] ?? null
            }
          }

          if (
            !existingLead &&
            row.phone
          ) {
            const {
              data: contactMatches,
              error: contactLookupError,
            } = await supabase
              .from('contacts')
              .select(
                'id, company_id'
              )
              .eq(
                'organization_id',
                organizationId
              )
              .eq(
                'phone',
                row.phone
              )
              .limit(1)

            if (contactLookupError) {
              throw contactLookupError
            }

            const contact =
              contactMatches?.[0]

            if (contact) {
              const {
                data: leadMatches,
                error:
                  leadLookupError,
              } = await supabase
                .from('leads')
                .select(
                  'id, company_id, contact_id'
                )
                .eq(
                  'organization_id',
                  organizationId
                )
                .eq(
                  'contact_id',
                  contact.id
                )
                .limit(1)

              if (leadLookupError) {
                throw leadLookupError
              }

              existingLead =
                leadMatches?.[0] ?? null
            }
          }

          if (existingLead) {
            duplicates++

            if (importMode === 'skip') {
              skipped++
              continue
            }

            if (importMode === 'update') {
              const assignedUser =
                resolveEmployee(
                  row.assignedTo,
                  employees
                )

              const score = row.score
                ? Number(row.score)
                : null

              const estimatedValue =
                row.estimatedValue
                  ? Number(
                      row.estimatedValue
                    )
                  : null

              const {
                error:
                  updateError,
              } = await supabase
                .from('leads')
                .update({
                  status:
                    row.status ||
                    defaults.status,

                  source:
                    row.source ||
                    defaults.source,

                  score,

                  estimated_value:
                    estimatedValue,

                  notes:
                    row.notes || null,

                  assigned_to:
                    assignedUser,
                })
                .eq(
                  'id',
                  existingLead.id
                )

              if (updateError) {
                throw updateError
              }

              imported++
              continue
            }

            // create mode intentionally continues
          }

          // --------------------------------
          // Find/create company
          // --------------------------------

          let companyId:
            | string
            | null = null

          if (row.companyName) {
            const {
              data: companyMatches,
              error:
                companyLookupError,
            } = await supabase
              .from('companies')
              .select(
                'id, name'
              )
              .eq(
                'organization_id',
                organizationId
              )
              .ilike(
                'name',
                row.companyName
              )
              .limit(1)

            if (companyLookupError) {
              throw companyLookupError
            }

            if (companyMatches?.[0]) {
              companyId =
                companyMatches[0].id
            } else {
              const {
                data: newCompany,
                error:
                  companyCreateError,
              } = await supabase
                .from('companies')
                .insert({
                  organization_id:
                    organizationId,
                  name:
                    row.companyName,
                  website:
                    row.website || null,
                })
                .select('id')
                .single()

              if (companyCreateError) {
                throw companyCreateError
              }

              companyId =
                newCompany.id
            }
          }

          // --------------------------------
          // Find/create contact
          // --------------------------------

          let contactId:
            | string
            | null = null

          if (
            row.email ||
            row.phone ||
            row.contactFirstName
          ) {
            if (row.email) {
              const {
                data: emailMatches,
                error:
                  emailLookupError,
              } = await supabase
                .from('contacts')
                .select(
                  'id, company_id'
                )
                .eq(
                  'organization_id',
                  organizationId
                )
                .eq(
                  'email',
                  row.email
                )
                .limit(1)

              if (emailLookupError) {
                throw emailLookupError
              }

              if (emailMatches?.[0]) {
                contactId =
                  emailMatches[0].id
              }
            }

            if (!contactId && row.phone) {
              const {
                data: phoneMatches,
                error:
                  phoneLookupError,
              } = await supabase
                .from('contacts')
                .select(
                  'id, company_id'
                )
                .eq(
                  'organization_id',
                  organizationId
                )
                .eq(
                  'phone',
                  row.phone
                )
                .limit(1)

              if (phoneLookupError) {
                throw phoneLookupError
              }

              if (phoneMatches?.[0]) {
                contactId =
                  phoneMatches[0].id
              }
            }

            if (!contactId) {
              const {
                data: newContact,
                error:
                  contactCreateError,
              } = await supabase
                .from('contacts')
                .insert({
                  organization_id:
                    organizationId,

                  company_id:
                    companyId,

                  first_name:
                    row.contactFirstName ||
                    row.companyName ||
                    'Unknown',

                  last_name:
                    row.contactLastName ||
                    null,

                  email:
                    row.email || null,

                  phone:
                    row.phone || null,

                  job_title:
                    row.jobTitle || null,
                })
                .select('id')
                .single()

              if (contactCreateError) {
                throw contactCreateError
              }

              contactId =
                newContact.id
            }
          }

          // --------------------------------
          // Assignment
          // --------------------------------

          const assignedUser =
            resolveEmployee(
              row.assignedTo,
              employees
            )

          // --------------------------------
          // Lead values
          // --------------------------------

          const score = row.score
            ? Number(row.score)
            : null

          const estimatedValue =
            row.estimatedValue
              ? Number(
                  row.estimatedValue
                )
              : null

          // --------------------------------
          // Create lead
          // --------------------------------

          const {
            error: leadCreateError,
          } = await supabase
            .from('leads')
            .insert({
              organization_id:
                organizationId,

              company_id:
                companyId,

              contact_id:
                contactId,

              assigned_to:
                assignedUser,

              status:
                row.status ||
                defaults.status,

              source:
                row.source ||
                defaults.source,

              score,

              estimated_value:
                estimatedValue,

              notes:
                row.notes || null,
            })

          if (leadCreateError) {
            throw leadCreateError
          }

          imported++
        } catch (rowError) {
          console.error(
            `Import error on row ${row.rowNumber}:`,
            rowError
          )

          errors.push(
            `Row ${row.rowNumber}: ${
              rowError instanceof Error
                ? rowError.message
                : 'Unknown error'
            }`
          )
        }

        setProgress(
          Math.round(
            ((index + 1) / total) * 100
          )
        )
      }

      const finalStats = {
        total: importRows.length,
        imported,
        skipped,
        duplicates,
        errors: errors.length,
      }

      setStats(finalStats)
      setImportErrors(errors)
      setStep('complete')

      await onImported()
    } catch (error) {
      console.error(
        'Lead import failed:',
        error
      )

      setError(
        error instanceof Error
          ? error.message
          : 'Lead import failed'
      )
    } finally {
      setImporting(false)
    }
  }

  // --------------------------------
  // Auto-select current user
  // --------------------------------

  useEffect(() => {
    if (
      !defaults.assigned_to &&
      userId
    ) {
      // Do not automatically assign every import.
      // User can select this manually.
    }
  }, [userId, defaults.assigned_to])

  // --------------------------------
  // Render
  // --------------------------------

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}

        <div style={headerStyle}>
          <div>
            <div
              style={{
                color: '#a78bfa',
                fontSize: '12px',
                fontWeight: 700,
                textTransform:
                  'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '6px',
              }}
            >
              Lead Import
            </div>

            <h2
              style={{
                margin: 0,
                color: '#f8fafc',
                fontSize: '24px',
              }}
            >
              Import Leads
            </h2>

            <p
              style={{
                margin:
                  '7px 0 0',
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              Upload, map, validate and
              import your leads.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {/* Error */}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {/* Upload */}

        {step === 'upload' && (
          <div>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() =>
                setDragging(false)
              }
              onDrop={handleDrop}
              onClick={() =>
                fileInputRef.current?.click()
              }
              style={{
                border:
                  dragging
                    ? '1px solid #8b5cf6'
                    : '1px dashed #475569',
                background:
                  dragging
                    ? 'rgba(124,58,237,.10)'
                    : 'rgba(15,23,42,.55)',
                borderRadius: '18px',
                minHeight: '270px',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition:
                  'all .2s ease',
              }}
            >
              <div>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background:
                      'rgba(124,58,237,.14)',
                    border:
                      '1px solid rgba(139,92,246,.25)',
                    display: 'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    margin:
                      '0 auto 18px',
                    fontSize: '28px',
                  }}
                >
                  ↑
                </div>

                <h3
                  style={{
                    margin:
                      '0 0 8px',
                    color: '#f8fafc',
                  }}
                >
                  Drop your spreadsheet here
                </h3>

                <p
                  style={{
                    margin:
                      '0 0 16px',
                    color: '#94a3b8',
                  }}
                >
                  or click to browse
                </p>

                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  CSV, XLSX or XLS
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{
                    display: 'none',
                  }}
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0]

                    if (file) {
                      void handleFile(file)
                    }

                    event.target.value = ''
                  }}
                />
              </div>
            </div>

            {loadingFile && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#a78bfa',
                  marginTop: '18px',
                }}
              >
                Reading spreadsheet...
              </div>
            )}
          </div>
        )}

        {/* Mapping */}

        {step === 'mapping' && (
          <div>
            <div style={fileInfoStyle}>
              <strong>
                {fileName}
              </strong>

              <span>
                {rows.length.toLocaleString()}{' '}
                rows · {headers.length}{' '}
                columns
              </span>
            </div>

            <div
              style={{
                maxHeight: '430px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}
            >
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: '15px',
                    alignItems:
                      'center',
                    padding:
                      '11px 0',
                    borderBottom:
                      '1px solid rgba(255,255,255,.06)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        color:
                          '#f8fafc',
                        fontSize:
                          '14px',
                        fontWeight: 600,
                      }}
                    >
                      {field.label}
                    </div>

                    <div
                      style={{
                        color:
                          '#64748b',
                        fontSize:
                          '12px',
                        marginTop:
                          '3px',
                      }}
                    >
                      CRM field
                    </div>
                  </div>

                  <select
                    value={
                      mapping[field.key]
                    }
                    onChange={(
                      event
                    ) =>
                      setMapping(
                        (current) => ({
                          ...current,
                          [field.key]:
                            event.target
                              .value,
                        })
                      )
                    }
                    style={selectStyle}
                  >
                    <option value="">
                      Don't import
                    </option>

                    {headers.map(
                      (header) => (
                        <option
                          key={header}
                          value={header}
                        >
                          {header}
                        </option>
                      )
                    )}
                  </select>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '20px',
                padding:
                  '18px',
                borderRadius:
                  '14px',
                background:
                  'rgba(15,23,42,.75)',
                border:
                  '1px solid rgba(255,255,255,.07)',
              }}
            >
              <h3
                style={{
                  margin:
                    '0 0 14px',
                  fontSize:
                    '15px',
                }}
              >
                Default values
              </h3>

              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Status
                  </label>

                  <select
                    value={
                      defaults.status
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          status:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    {leadStatuses.map(
                      (
                        status
                      ) => (
                        <option
                          key={
                            status
                          }
                          value={
                            status
                          }
                        >
                          {status}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Source
                  </label>

                  <input
                    value={
                      defaults.source
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          source:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      inputStyle
                    }
                    placeholder="Imported"
                  />
                </div>

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Assigned To
                  </label>

                  <select
                    value={
                      defaults.assigned_to
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          assigned_to:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    <option value="">
                      Unassigned
                    </option>

                    <option
                      value={
                        userId ??
                        ''
                      }
                    >
                      Me
                    </option>

                    {employees
                      .filter(
                        (
                          employee
                        ) =>
                          employee.user_id !==
                          userId
                      )
                      .map(
                        (
                          employee
                        ) => (
                          <option
                            key={
                              employee.user_id
                            }
                            value={
                              employee.user_id
                            }
                          >
                            {
                              employee.full_name
                            }
                          </option>
                        )
                      )}
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding:
                  '16px',
                borderRadius:
                  '14px',
                background:
                  'rgba(15,23,42,.75)',
                border:
                  '1px solid rgba(255,255,255,.07)',
              }}
            >
              <label
                style={
                  labelStyle
                }
              >
                Duplicate handling
              </label>

              <select
                value={importMode}
                onChange={(
                  event
                ) =>
                  setImportMode(
                    event
                      .target
                      .value as ImportMode
                  )
                }
                style={
                  selectStyle
                }
              >
                <option value="skip">
                  Skip duplicate leads
                </option>

                <option value="update">
                  Update existing leads
                </option>

                <option value="create">
                  Create duplicate lead anyway
                </option>
              </select>
            </div>
          </div>
        )}

        {/* Preview */}

        {step === 'preview' && (
          <div>
            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(4, 1fr)',
                gap: '10px',
                marginBottom:
                  '18px',
              }}
            >
              <Stat
                label="Rows"
                value={
                  importRows.length
                }
              />

              <Stat
                label="Ready"
                value={
                  validation
                    .valid
                    .length
                }
              />

              <Stat
                label="Warnings"
                value={
                  validation
                    .invalid
                    .length
                }
              />

              <Stat
                label="Columns"
                value={
                  headers.length
                }
              />
            </div>

            <div
              style={{
                maxHeight:
                  '430px',
                overflow:
                  'auto',
                border:
                  '1px solid rgba(255,255,255,.07)',
                borderRadius:
                  '14px',
              }}
            >
              <table
                style={{
                  width:
                    '100%',
                  borderCollapse:
                    'collapse',
                  minWidth:
                    '950px',
                }}
              >
                <thead>
                  <tr>
                    {[
                      '#',
                      'Company',
                      'Contact',
                      'Email',
                      'Phone',
                      'Status',
                      'Assigned',
                    ].map(
                      (
                        heading
                      ) => (
                        <th
                          key={
                            heading
                          }
                          style={
                            tableHeaderStyle
                          }
                        >
                          {
                            heading
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {importRows
                    .slice(
                      0,
                      100
                    )
                    .map(
                      (
                        row
                      ) => (
                        <tr
                          key={
                            row.rowNumber
                          }
                        >
                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              row.rowNumber
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              row.companyName ||
                              '—'
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {`${row.contactFirstName} ${row.contactLastName}`.trim() ||
                              '—'}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              row.email ||
                              '—'
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              row.phone ||
                              '—'
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {
                              row.status
                            }
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {resolveEmployee(
                              row.assignedTo,
                              employees
                            )
                              ? employees.find(
                                  (
                                    employee
                                  ) =>
                                    employee.user_id ===
                                    resolveEmployee(
                                      row.assignedTo,
                                      employees
                                    )
                                )
                                  ?.full_name
                              : 'Unassigned'}
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>

            {validation.invalid
              .length >
              0 && (
              <div
                style={{
                  marginTop:
                    '15px',
                  padding:
                    '15px',
                  borderRadius:
                    '12px',
                  background:
                    'rgba(127,29,29,.18)',
                  border:
                    '1px solid rgba(239,68,68,.2)',
                }}
              >
                <strong
                  style={{
                    color:
                      '#fca5a5',
                  }}
                >
                  Rows with problems
                </strong>

                <div
                  style={{
                    marginTop:
                      '8px',
                    maxHeight:
                      '120px',
                    overflowY:
                      'auto',
                    color:
                      '#f87171',
                    fontSize:
                      '13px',
                  }}
                >
                  {validation.invalid
                    .slice(
                      0,
                      20
                    )
                    .map(
                      ({
                        row,
                        reason,
                      }) => (
                        <div
                          key={
                            row.rowNumber
                          }
                        >
                          Row{' '}
                          {
                            row.rowNumber
                          }
                          :{' '}
                          {
                            reason
                          }
                        </div>
                      )
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete */}

        {step === 'complete' && (
          <div>
            <div
              style={{
                textAlign:
                  'center',
                padding:
                  '25px 0',
              }}
            >
              <div
                style={{
                  width:
                    '70px',
                  height:
                    '70px',
                  borderRadius:
                    '50%',
                  background:
                    'rgba(34,197,94,.12)',
                  border:
                    '1px solid rgba(34,197,94,.3)',
                  color:
                    '#4ade80',
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  fontSize:
                    '30px',
                  margin:
                    '0 auto 18px',
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  margin:
                    '0 0 8px',
                }}
              >
                Import Complete
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    '#94a3b8',
                }}
              >
                Your lead spreadsheet
                has been processed.
              </p>
            </div>

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(4, 1fr)',
                gap: '10px',
              }}
            >
              <Stat
                label="Imported"
                value={
                  stats.imported
                }
              />

              <Stat
                label="Skipped"
                value={
                  stats.skipped
                }
              />

              <Stat
                label="Duplicates"
                value={
                  stats.duplicates
                }
              />

              <Stat
                label="Errors"
                value={
                  stats.errors
                }
              />
            </div>

            {importErrors.length >
              0 && (
              <div
                style={{
                  marginTop:
                    '18px',
                  padding:
                    '15px',
                  borderRadius:
                    '12px',
                  background:
                    'rgba(127,29,29,.16)',
                  border:
                    '1px solid rgba(239,68,68,.2)',
                }}
              >
                <strong
                  style={{
                    color:
                      '#fca5a5',
                  }}
                >
                  Import errors
                </strong>

                <div
                  style={{
                    marginTop:
                      '10px',
                    maxHeight:
                      '150px',
                    overflowY:
                      'auto',
                    fontSize:
                      '13px',
                    color:
                      '#f87171',
                  }}
                >
                  {importErrors.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                      >
                        {
                          item
                        }
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress */}

        {importing && (
          <div
            style={{
              marginTop:
                '20px',
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                marginBottom:
                  '8px',
                fontSize:
                  '13px',
              }}
            >
              <span
                style={{
                  color:
                    '#cbd5e1',
                }}
              >
                Importing leads...
              </span>

              <span
                style={{
                  color:
                    '#a78bfa',
                  fontWeight:
                    700,
                }}
              >
                {progress}%
              </span>
            </div>

            <div
              style={{
                height:
                  '8px',
                background:
                  '#1e293b',
                borderRadius:
                  '999px',
                overflow:
                  'hidden',
              }}
            >
              <div
                style={{
                  width:
                    `${progress}%`,
                  height:
                    '100%',
                  background:
                    'linear-gradient(90deg, #7c3aed, #a855f7)',
                  transition:
                    'width .2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}

        <div
          style={{
            display:
              'flex',
            justifyContent:
              'space-between',
            gap: '10px',
            marginTop:
              '24px',
            paddingTop:
              '18px',
            borderTop:
              '1px solid rgba(255,255,255,.07)',
          }}
        >
          <button
            onClick={() => {
              if (
                step ===
                'mapping'
              ) {
                setStep(
                  'upload'
                )
              } else if (
                step ===
                'preview'
              ) {
                setStep(
                  'mapping'
                )
              } else if (
                step ===
                'complete'
              ) {
                onClose()
              }
            }}
            disabled={importing}
            style={
              secondaryButtonStyle
            }
          >
            {step ===
            'complete'
              ? 'Close'
              : 'Back'}
          </button>

          <div
            style={{
              display:
                'flex',
              gap: '10px',
            }}
          >
            {step ===
              'mapping' && (
              <button
                onClick={() =>
                  setStep(
                    'preview'
                  )
                }
                style={
                  primaryButtonStyle
                }
              >
                Preview Import
              </button>
            )}

            {step ===
              'preview' && (
              <button
                onClick={() =>
                  void handleImport()
                }
                disabled={
                  importing ||
                  !validation
                    .valid
                    .length
                }
                style={
                  primaryButtonStyle
                }
              >
                {importing
                  ? 'Importing...'
                  : `Import ${validation.valid.length.toLocaleString()} Leads`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div
      style={{
        background:
          'rgba(15,23,42,.75)',
        border:
          '1px solid rgba(255,255,255,.07)',
        borderRadius:
          '12px',
        padding:
          '15px',
      }}
    >
      <div
        style={{
          color:
            '#64748b',
          fontSize:
            '11px',
          textTransform:
            'uppercase',
          letterSpacing:
            '0.06em',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color:
            '#f8fafc',
          fontSize:
            '22px',
          fontWeight:
            700,
          marginTop:
            '4px',
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background:
    'rgba(2,6,23,.78)',
  backdropFilter:
    'blur(10px)',
  WebkitBackdropFilter:
    'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
}

const modalStyle: React.CSSProperties = {
  width: 'min(1050px, 100%)',
  maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto',
  background:
    'linear-gradient(145deg, rgba(15,23,42,.98), rgba(9,13,27,.98))',
  border:
    '1px solid rgba(255,255,255,.09)',
  borderRadius: '22px',
  boxShadow:
    '0 30px 100px rgba(0,0,0,.5)',
  padding: '26px',
  color: '#f8fafc',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '22px',
}

const closeButtonStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  border:
    '1px solid rgba(255,255,255,.08)',
  background:
    'rgba(255,255,255,.04)',
  color: '#94a3b8',
  fontSize: '22px',
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  padding: '13px 15px',
  marginBottom: '18px',
  borderRadius: '11px',
  background:
    'rgba(127,29,29,.25)',
  border:
    '1px solid rgba(239,68,68,.25)',
  color: '#fca5a5',
}

const fileInfoStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '15px',
  padding: '14px 16px',
  borderRadius: '12px',
  background:
    'rgba(124,58,237,.08)',
  border:
    '1px solid rgba(139,92,246,.16)',
  marginBottom: '16px',
  color: '#94a3b8',
  fontSize: '13px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  color: '#cbd5e1',
  fontSize: '12px',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '9px',
  border:
    '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '9px',
  border:
    '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '11px 17px',
  borderRadius: '10px',
  border: 'none',
  background:
    'linear-gradient(135deg, #7c3aed, #8b5cf6)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '11px 17px',
  borderRadius: '10px',
  border:
    '1px solid #334155',
  background:
    'rgba(15,23,42,.8)',
  color: '#cbd5e1',
  cursor: 'pointer',
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  background: '#111827',
  color: '#94a3b8',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom:
    '1px solid #1e293b',
  position: 'sticky',
  top: 0,
}

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  color: '#cbd5e1',
  fontSize: '13px',
  borderBottom:
    '1px solid rgba(255,255,255,.05)',
}