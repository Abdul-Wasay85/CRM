import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useOrganization } from '../context/OrganizationContext'
import LeadImportModal from '../components/lead-import/LeadImportModal'

type Company = {
  id: string
  name: string
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  company_id: string | null
}

type Employee = {
  id: string
  user_id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

type Lead = {
  id: string
  company_id: string | null
  contact_id: string | null
  assigned_to: string | null
  status: string
  source: string | null
  score: number | null
  estimated_value: number | null
  notes: string | null
  company_name?: string
  contact_name?: string
  assigned_name?: string
}

type LeadForm = {
  company_id: string
  contact_id: string
  assigned_to: string
  status: string
  source: string
  score: string
  estimated_value: string
  notes: string
}

const emptyForm: LeadForm = {
  company_id: '',
  contact_id: '',
  assigned_to: '',
  status: 'New',
  source: '',
  score: '',
  estimated_value: '',
  notes: '',
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

export default function Leads() {
  const { organizationId, userId } = useOrganization()

  const [leads, setLeads] = useState<Lead[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const [editingLeadId, setEditingLeadId] = useState<string | null>(
    null
  )

  const [form, setForm] = useState<LeadForm>(emptyForm)

  const [error, setError] = useState('')

  // --------------------------------
  // Load employees
  // --------------------------------

  async function loadEmployees() {
    if (!organizationId) {
      return
    }

    try {
      const { data: members, error: membersError } =
        await supabase
          .from('organization_members')
          .select('id, user_id, role, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', {
            ascending: true,
          })

      if (membersError) {
        throw membersError
      }

      if (!members || members.length === 0) {
        setEmployees([])
        return
      }

      const userIds = members.map(
        (member) => member.user_id
      )

      const { data: profiles, error: profilesError } =
        await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

      if (profilesError) {
        throw profilesError
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile,
        ])
      )

      const formattedEmployees: Employee[] =
        members.map((member) => {
          const profile = profileMap.get(
            member.user_id
          )

          return {
            id: member.id,
            user_id: member.user_id,
            role: member.role,
            full_name:
              profile?.full_name ||
              profile?.email ||
              'Unknown User',
            email: profile?.email || '',
            created_at: member.created_at,
          }
        })

      setEmployees(formattedEmployees)
    } catch (error) {
      console.error(
        'Error loading employees:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load employees')
      }
    }
  }

  // --------------------------------
  // Load leads
  // --------------------------------

  async function loadLeads() {
    if (!organizationId) {
      return
    }

    try {
      setLoading(true)
      setError('')

      const { data, error: leadsError } =
        await supabase
          .from('leads')
          .select(`
            id,
            company_id,
            contact_id,
            assigned_to,
            status,
            source,
            score,
            estimated_value,
            notes,
            companies (
              name
            ),
            contacts (
              first_name,
              last_name
            )
          `)
          .eq('organization_id', organizationId)
          .order('created_at', {
            ascending: false,
          })

      if (leadsError) {
        throw leadsError
      }

      const formattedLeads: Lead[] =
        (data ?? []).map((lead: any) => {
          const assignedEmployee =
            employees.find(
              (employee) =>
                employee.user_id ===
                lead.assigned_to
            )

          return {
            id: lead.id,
            company_id: lead.company_id,
            contact_id: lead.contact_id,
            assigned_to: lead.assigned_to,
            status: lead.status,
            source: lead.source,
            score: lead.score,
            estimated_value:
              lead.estimated_value,
            notes: lead.notes,

            company_name:
              lead.companies?.name ?? '',

            contact_name: lead.contacts
              ? `${lead.contacts.first_name} ${
                  lead.contacts.last_name ?? ''
                }`.trim()
              : '',

            assigned_name:
              assignedEmployee?.full_name ?? '',
          }
        })

      setLeads(formattedLeads)
    } catch (error) {
      console.error(
        'Error loading leads:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load leads')
      }
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------
  // Load companies
  // --------------------------------

  async function loadCompanies() {
    if (!organizationId) {
      return
    }

    try {
      const { data, error: companiesError } =
        await supabase
          .from('companies')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name', {
            ascending: true,
          })

      if (companiesError) {
        throw companiesError
      }

      setCompanies(data ?? [])
    } catch (error) {
      console.error(
        'Error loading companies:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load companies')
      }
    }
  }

  // --------------------------------
  // Load contacts
  // --------------------------------

  async function loadContacts() {
    if (!organizationId) {
      return
    }

    try {
      const { data, error: contactsError } =
        await supabase
          .from('contacts')
          .select(
            'id, first_name, last_name, company_id'
          )
          .eq('organization_id', organizationId)
          .order('first_name', {
            ascending: true,
          })

      if (contactsError) {
        throw contactsError
      }

      setContacts(data ?? [])
    } catch (error) {
      console.error(
        'Error loading contacts:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load contacts')
      }
    }
  }

  // --------------------------------
  // Initial loading
  // --------------------------------

  useEffect(() => {
    if (!organizationId) {
      return
    }

    async function loadData() {
      await Promise.all([
        loadEmployees(),
        loadCompanies(),
        loadContacts(),
      ])
    }

    void loadData()
  }, [organizationId])

  // --------------------------------
  // Load leads after employees
  // --------------------------------

  useEffect(() => {
    if (!organizationId) {
      return
    }

    void loadLeads()
  }, [organizationId, employees])

  // --------------------------------
  // Update form
  // --------------------------------

  function updateField(
    field: keyof LeadForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  // --------------------------------
  // Validate form numbers
  // --------------------------------

  function getValidatedNumbers() {
    let score: number | null = null

    if (form.score.trim()) {
      const parsedScore = Number(form.score)

      if (
        !Number.isInteger(parsedScore) ||
        parsedScore < 0 ||
        parsedScore > 100
      ) {
        throw new Error(
          'Lead score must be a whole number between 0 and 100'
        )
      }

      score = parsedScore
    }

    let estimatedValue: number | null = null

    if (form.estimated_value.trim()) {
      const parsedValue = Number(
        form.estimated_value
      )

      if (
        Number.isNaN(parsedValue) ||
        parsedValue < 0
      ) {
        throw new Error(
          'Estimated value must be a valid positive number'
        )
      }

      estimatedValue = parsedValue
    }

    return {
      score,
      estimatedValue,
    }
  }

  // --------------------------------
  // Add lead
  // --------------------------------

  async function handleAddLead(
    event: FormEvent
  ) {
    event.preventDefault()

    if (!organizationId) {
      setError('No organization found')
      return
    }

    try {
      setSaving(true)
      setError('')

      const {
        score,
        estimatedValue,
      } = getValidatedNumbers()

      const { error: insertError } =
        await supabase
          .from('leads')
          .insert({
            organization_id: organizationId,
            company_id:
              form.company_id || null,
            contact_id:
              form.contact_id || null,
            assigned_to:
              form.assigned_to || null,
            status: form.status,
            source:
              form.source.trim() || null,
            score,
            estimated_value:
              estimatedValue,
            notes:
              form.notes.trim() || null,
          })

      if (insertError) {
        throw insertError
      }

      setForm(emptyForm)
      setShowForm(false)

      await loadLeads()
    } catch (error) {
      console.error(
        'Error creating lead:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to create lead')
      }
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------
  // Start editing lead
  // --------------------------------

  function handleEditLead(lead: Lead) {
    setError('')

    setEditingLeadId(lead.id)

    setForm({
      company_id:
        lead.company_id ?? '',
      contact_id:
        lead.contact_id ?? '',
      assigned_to:
        lead.assigned_to ?? '',
      status:
        lead.status || 'New',
      source:
        lead.source ?? '',
      score:
        lead.score !== null &&
        lead.score !== undefined
          ? String(lead.score)
          : '',
      estimated_value:
        lead.estimated_value !== null &&
        lead.estimated_value !== undefined
          ? String(
              lead.estimated_value
            )
          : '',
      notes:
        lead.notes ?? '',
    })

    setShowForm(false)
  }

  // --------------------------------
  // Cancel editing
  // --------------------------------

  function handleCancelEdit() {
    setEditingLeadId(null)
    setForm(emptyForm)
    setError('')
  }

  // --------------------------------
  // Update lead
  // --------------------------------

  async function handleUpdateLead(
    event: FormEvent
  ) {
    event.preventDefault()

    if (!organizationId) {
      setError('No organization found')
      return
    }

    if (!editingLeadId) {
      setError('No lead selected for editing')
      return
    }

    try {
      setSaving(true)
      setError('')

      const {
        score,
        estimatedValue,
      } = getValidatedNumbers()

      const { error: updateError } =
        await supabase
          .from('leads')
          .update({
            company_id:
              form.company_id || null,
            contact_id:
              form.contact_id || null,
            assigned_to:
              form.assigned_to || null,
            status:
              form.status,
            source:
              form.source.trim() || null,
            score,
            estimated_value:
              estimatedValue,
            notes:
              form.notes.trim() || null,
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', editingLeadId)
          .eq(
            'organization_id',
            organizationId
          )

      if (updateError) {
        throw updateError
      }

      setEditingLeadId(null)
      setForm(emptyForm)

      await loadLeads()
    } catch (error) {
      console.error(
        'Error updating lead:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to update lead')
      }
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------
  // Delete lead
  // --------------------------------

  async function handleDeleteLead(
    leadId: string
  ) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this lead?'
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(leadId)
      setError('')

      const { error: deleteError } =
        await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)
          .eq(
            'organization_id',
            organizationId
          )

      if (deleteError) {
        throw deleteError
      }

      await loadLeads()
    } catch (error) {
      console.error(
        'Error deleting lead:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to delete lead')
      }
    } finally {
      setDeletingId(null)
    }
  }

  // --------------------------------
  // Handle successful import
  // --------------------------------

  async function handleImportComplete() {
    setShowImport(false)
    setError('')

    await Promise.all([
      loadCompanies(),
      loadContacts(),
      loadLeads(),
    ])
  }

  // --------------------------------
  // Filter contacts by company
  // --------------------------------

  const availableContacts =
    form.company_id
      ? contacts.filter(
          (contact) =>
            contact.company_id ===
            form.company_id
        )
      : contacts

  // --------------------------------
  // Shared form
  // --------------------------------

  function renderLeadForm(
    isEditing: boolean
  ) {
    return (
      <div
        style={{
          background:
            'linear-gradient(145deg, rgba(17,24,39,0.96), rgba(15,23,42,0.96))',
          border:
            '1px solid rgba(148,163,184,0.16)',
          borderRadius: '18px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow:
            '0 20px 50px rgba(0, 0, 0, 0.24)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            gap: '20px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '22px',
                color: '#f8fafc',
              }}
            >
              {isEditing
                ? 'Edit Lead'
                : 'Add Lead'}
            </h2>

            <p
              style={{
                margin:
                  '6px 0 0',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              {isEditing
                ? 'Update the lead information below.'
                : 'Create a new lead manually.'}
            </p>
          </div>

          <button
            type="button"
            onClick={
              isEditing
                ? handleCancelEdit
                : () => {
                    setShowForm(false)
                    setForm(emptyForm)
                    setError('')
                  }
            }
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border:
                '1px solid rgba(148,163,184,0.14)',
              background:
                'rgba(15,23,42,0.8)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '24px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={
            isEditing
              ? handleUpdateLead
              : handleAddLead
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '18px',
            }}
          >
            {/* Company */}

            <div>
              <label style={labelStyle}>
                Company
              </label>

              <select
                value={
                  form.company_id
                }
                onChange={(event) => {
                  setForm(
                    (current) => ({
                      ...current,
                      company_id:
                        event.target
                          .value,
                      contact_id: '',
                    })
                  )
                }}
                style={selectStyle}
              >
                <option value="">
                  No company
                </option>

                {companies.map(
                  (company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Contact */}

            <div>
              <label style={labelStyle}>
                Contact
              </label>

              <select
                value={
                  form.contact_id
                }
                onChange={(event) =>
                  updateField(
                    'contact_id',
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="">
                  No contact
                </option>

                {availableContacts.map(
                  (contact) => (
                    <option
                      key={contact.id}
                      value={contact.id}
                    >
                      {
                        contact.first_name
                      }{' '}
                      {contact.last_name ??
                        ''}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Assigned To */}

            <div>
              <label style={labelStyle}>
                Assigned To
              </label>

              <select
                value={
                  form.assigned_to
                }
                onChange={(event) =>
                  updateField(
                    'assigned_to',
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="">
                  Unassigned
                </option>

                {employees.map(
                  (employee) => (
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
                      {employee.user_id ===
                      userId
                        ? ' (You)'
                        : ''}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Status */}

            <div>
              <label style={labelStyle}>
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                {leadStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Source */}

            <Input
              label="Source"
              value={form.source}
              onChange={(value) =>
                updateField(
                  'source',
                  value
                )
              }
              placeholder="Website, Referral, Cold Call..."
            />

            {/* Score */}

            <Input
              label="Lead Score (0-100)"
              type="number"
              value={form.score}
              onChange={(value) =>
                updateField(
                  'score',
                  value
                )
              }
              placeholder="85"
            />

            {/* Estimated Value */}

            <Input
              label="Estimated Value"
              type="number"
              value={
                form.estimated_value
              }
              onChange={(value) =>
                updateField(
                  'estimated_value',
                  value
                )
              }
              placeholder="5000"
            />
          </div>

          {/* Notes */}

          <div
            style={{
              marginTop: '18px',
            }}
          >
            <label style={labelStyle}>
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(event) =>
                updateField(
                  'notes',
                  event.target.value
                )
              }
              placeholder="Add notes about this lead..."
              rows={4}
              style={{
                width: '100%',
                boxSizing:
                  'border-box',
                padding: '12px',
                borderRadius: '8px',
                border:
                  '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Buttons */}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'flex-end',
              gap: '12px',
              marginTop: '25px',
            }}
          >
            <button
              type="button"
              onClick={
                isEditing
                  ? handleCancelEdit
                  : () => {
                      setShowForm(false)
                      setForm(emptyForm)
                      setError('')
                    }
              }
              style={{
                padding:
                  '12px 20px',
                borderRadius: '9px',
                border:
                  '1px solid #475569',
                background:
                  'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding:
                  '12px 20px',
                borderRadius: '9px',
                border: 'none',
                background: saving
                  ? '#475569'
                  : '#7c3aed',
                color: '#fff',
                cursor: saving
                  ? 'not-allowed'
                  : 'pointer',
                fontWeight: 700,
                boxShadow:
                  saving
                    ? 'none'
                    : '0 8px 24px rgba(124,58,237,0.22)',
              }}
            >
              {saving
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #0b1020 0%, #070a12 100%)',
        color: '#f8fafc',
        padding: '40px',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Header */}

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent:
              'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '24px',
          }}
        >
          <div style={{ flex: 1 }}>
            <PageHeader
              title="Leads"
              description="Manage and qualify your sales leads"
              actionLabel="+ Add Lead"
              onAction={() => {
                setError('')
                setEditingLeadId(null)
                setForm(emptyForm)
                setShowForm(true)
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setError('')
              setShowImport(true)
              setShowForm(false)
              setEditingLeadId(null)
            }}
            style={{
              marginTop: '4px',
              padding: '12px 18px',
              borderRadius: '10px',
              border:
                '1px solid rgba(139, 92, 246, 0.45)',
              background:
                'linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(168, 85, 247, 0.12))',
              color: '#ddd6fe',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow:
                '0 8px 24px rgba(124, 58, 237, 0.12)',
              whiteSpace: 'nowrap',
            }}
          >
            Import Leads
          </button>
        </div>

        {/* Error */}

        {error && (
          <div
            style={{
              background:
                'rgba(127, 29, 29, 0.35)',
              border:
                '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '14px 18px',
              borderRadius: '10px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {/* Add Form */}

        {showForm &&
          renderLeadForm(false)}

        {/* Edit Form */}

        {editingLeadId &&
          renderLeadForm(true)}

        {/* Leads List */}

        {loading ? (
          <div
            style={{
              background:
                'rgba(15,23,42,0.78)',
              border:
                '1px solid rgba(148,163,184,0.12)',
              borderRadius: '16px',
              padding: '50px',
              textAlign: 'center',
              color: '#94a3b8',
            }}
          >
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div
            style={{
              background:
                'rgba(15,23,42,0.78)',
              border:
                '1px solid rgba(148,163,184,0.12)',
              borderRadius: '16px',
              padding: '50px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                margin:
                  '0 auto 16px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                background:
                  'rgba(124, 58, 237, 0.12)',
                border:
                  '1px solid rgba(139, 92, 246, 0.2)',
                color: '#a78bfa',
                fontSize: '24px',
              }}
            >
              +
            </div>

            <h2
              style={{
                margin:
                  '0 0 8px',
              }}
            >
              No leads yet
            </h2>

            <p
              style={{
                color: '#94a3b8',
                margin:
                  '0 0 22px',
              }}
            >
              Add your first lead manually
              or import a spreadsheet.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setEditingLeadId(null)
                  setForm(emptyForm)
                  setShowForm(true)
                }}
                style={{
                  padding:
                    '10px 16px',
                  borderRadius: '9px',
                  border: 'none',
                  background:
                    '#7c3aed',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Add Lead
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setShowImport(true)
                }}
                style={{
                  padding:
                    '10px 16px',
                  borderRadius: '9px',
                  border:
                    '1px solid #475569',
                  background:
                    'transparent',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Import Leads
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '15px',
            }}
          >
            {leads.map((lead) => {
              const assignedEmployee =
                employees.find(
                  (employee) =>
                    employee.user_id ===
                    lead.assigned_to
                )

              const isAssignedToCurrentUser =
                lead.assigned_to ===
                userId

              return (
                <div
                  key={lead.id}
                  style={{
                    background:
                      'rgba(15,23,42,0.78)',
                    border:
                      '1px solid rgba(148,163,184,0.12)',
                    borderRadius: '14px',
                    padding: '20px',
                    transition:
                      'border-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap: '20px',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          marginBottom:
                            '8px',
                          color:
                            '#f8fafc',
                        }}
                      >
                        {lead.contact_name ||
                          lead.company_name ||
                          'Unnamed Lead'}
                      </h3>

                      {lead.company_name && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '5px 0',
                          }}
                        >
                          Company:{' '}
                          {
                            lead.company_name
                          }
                        </p>
                      )}

                      {lead.contact_name && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '5px 0',
                          }}
                        >
                          Contact:{' '}
                          {
                            lead.contact_name
                          }
                        </p>
                      )}

                      {lead.source && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '5px 0',
                          }}
                        >
                          Source:{' '}
                          {lead.source}
                        </p>
                      )}

                      {lead.score !==
                        null && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '5px 0',
                          }}
                        >
                          Score:{' '}
                          {lead.score}/100
                        </p>
                      )}

                      {lead.estimated_value !==
                        null && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '5px 0',
                          }}
                        >
                          Estimated Value: $
                          {Number(
                            lead.estimated_value
                          ).toLocaleString()}
                        </p>
                      )}

                      {/* Assigned Employee */}

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '8px',
                          marginTop:
                            '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '30px',
                            height:
                              '30px',
                            borderRadius:
                              '50%',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            background:
                              'rgba(124, 58, 237, 0.18)',
                            border:
                              '1px solid rgba(139, 92, 246, 0.28)',
                            color:
                              '#c4b5fd',
                            fontSize:
                              '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {assignedEmployee
                            ? assignedEmployee.full_name
                                .charAt(
                                  0
                                )
                                .toUpperCase()
                            : '?'}
                        </div>

                        <div>
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
                            Assigned To
                          </div>

                          <div
                            style={{
                              color:
                                '#e2e8f0',
                              fontSize:
                                '14px',
                              fontWeight: 600,
                            }}
                          >
                            {assignedEmployee
                              ? isAssignedToCurrentUser
                                ? 'You'
                                : assignedEmployee.full_name
                              : 'Unassigned'}
                          </div>
                        </div>
                      </div>

                      {lead.notes && (
                        <p
                          style={{
                            color:
                              '#94a3b8',
                            margin:
                              '10px 0 0',
                            lineHeight: 1.6,
                          }}
                        >
                          {lead.notes}
                        </p>
                      )}
                    </div>

                    {/* Right side */}

                    <div
                      style={{
                        display:
                          'flex',
                        flexDirection:
                          'column',
                        alignItems:
                          'flex-end',
                        gap: '10px',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          padding:
                            '6px 12px',
                          borderRadius:
                            '999px',
                          background:
                            getStatusBackground(
                              lead.status
                            ),
                          color:
                            getStatusColor(
                              lead.status
                            ),
                          fontSize:
                            '13px',
                          fontWeight: 700,
                        }}
                      >
                        {lead.status}
                      </span>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleEditLead(
                              lead
                            )
                          }
                          style={{
                            padding:
                              '8px 14px',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid rgba(139,92,246,0.4)',
                            background:
                              'rgba(124,58,237,0.12)',
                            color:
                              '#c4b5fd',
                            cursor:
                              'pointer',
                            fontWeight:
                              600,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={
                            deletingId ===
                            lead.id
                          }
                          onClick={() =>
                            handleDeleteLead(
                              lead.id
                            )
                          }
                          style={{
                            padding:
                              '8px 14px',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid rgba(127,29,29,0.8)',
                            background:
                              'transparent',
                            color:
                              '#fca5a5',
                            cursor:
                              deletingId ===
                              lead.id
                                ? 'not-allowed'
                                : 'pointer',
                            fontWeight:
                              600,
                          }}
                        >
                          {deletingId ===
                          lead.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lead Import Modal */}

      {showImport &&
        organizationId && (
          <LeadImportModal
            organizationId={
              organizationId
            }
            userId={userId ?? ''}
            employees={employees}
            onClose={() =>
              setShowImport(false)
            }
            onImported={
              handleImportComplete
            }
          />
        )}
    </div>
  )
}

// --------------------------------
// Input component
// --------------------------------

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        min={
          type === 'number'
            ? '0'
            : undefined
        }
        style={{
          width: '100%',
          boxSizing:
            'border-box',
          padding: '12px',
          borderRadius: '8px',
          border:
            '1px solid #334155',
          background: '#0f172a',
          color: '#f8fafc',
          outline: 'none',
        }}
      />
    </div>
  )
}

// --------------------------------
// Status colors
// --------------------------------

function getStatusColor(
  status: string
) {
  switch (
    status.toLowerCase()
  ) {
    case 'new':
      return '#c4b5fd'

    case 'contacted':
      return '#93c5fd'

    case 'qualified':
      return '#86efac'

    case 'proposal':
      return '#fde68a'

    case 'negotiation':
      return '#fdba74'

    case 'won':
      return '#4ade80'

    case 'lost':
      return '#fca5a5'

    default:
      return '#cbd5e1'
  }
}

function getStatusBackground(
  status: string
) {
  switch (
    status.toLowerCase()
  ) {
    case 'new':
      return 'rgba(124,58,237,0.18)'

    case 'contacted':
      return 'rgba(59,130,246,0.16)'

    case 'qualified':
      return 'rgba(34,197,94,0.14)'

    case 'proposal':
      return 'rgba(234,179,8,0.14)'

    case 'negotiation':
      return 'rgba(249,115,22,0.14)'

    case 'won':
      return 'rgba(34,197,94,0.18)'

    case 'lost':
      return 'rgba(239,68,68,0.14)'

    default:
      return 'rgba(100,116,139,0.18)'
  }
}

// --------------------------------
// Shared styles
// --------------------------------

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  color: '#cbd5e1',
  fontSize: '14px',
  fontWeight: 500,
}

const selectStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  borderRadius: '8px',
  border:
    '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
}