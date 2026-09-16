import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../context/OrganizationContext'

type Lead = {
  id: string
  status: string
  company_id: string | null
  contact_id: string | null
  companies?: {
    name: string
  } | null
  contacts?: {
    first_name: string
    last_name: string | null
  } | null
}

type Employee = {
  id: string
  user_id: string
  full_name: string
  email: string
  role: string
}

type Deal = {
  id: string
  lead_id: string | null
  name: string
  stage: string
  value: number | null
  expected_close_date: string | null
  assigned_to: string | null
  lead?: {
    id: string
    status: string
    companies?: {
      name: string
    } | null
    contacts?: {
      first_name: string
      last_name: string | null
    } | null
  } | null
}

type DealForm = {
  name: string
  lead_id: string
  stage: string
  value: string
  expected_close_date: string
  assigned_to: string
}

const stages = [
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
]

const emptyForm: DealForm = {
  name: '',
  lead_id: '',
  stage: 'Qualified',
  value: '',
  expected_close_date: '',
  assigned_to: '',
}

export default function Deals() {
  const {
    organizationId,
    userId,
  } = useOrganization()

  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] =
    useState<DealForm>(emptyForm)

  const [error, setError] = useState('')

  async function loadDeals() {
    if (!organizationId) return

    try {
      setLoading(true)
      setError('')

      const { data, error: dealsError } =
        await supabase
          .from('deals')
          .select(`
            id,
            lead_id,
            name,
            stage,
            value,
            expected_close_date,
            assigned_to,
            leads (
              id,
              status,
              companies (
                name
              ),
              contacts (
                first_name,
                last_name
              )
            )
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .order('created_at', {
            ascending: false,
          })

      if (dealsError) {
        throw dealsError
      }

      const formattedDeals: Deal[] =
        (data ?? []).map(
          (deal: any) => ({
            id: deal.id,
            lead_id: deal.lead_id,
            name: deal.name,
            stage: deal.stage,
            value: deal.value,
            expected_close_date:
              deal.expected_close_date,
            assigned_to:
              deal.assigned_to ?? null,
            lead: deal.leads
              ? {
                  id: deal.leads.id,
                  status:
                    deal.leads.status,
                  companies:
                    Array.isArray(
                      deal.leads.companies
                    )
                      ? deal.leads.companies[0] ??
                        null
                      : deal.leads.companies ??
                        null,
                  contacts:
                    Array.isArray(
                      deal.leads.contacts
                    )
                      ? deal.leads.contacts[0] ??
                        null
                      : deal.leads.contacts ??
                        null,
                }
              : null,
          })
        )

      setDeals(formattedDeals)
    } catch (error) {
      console.error(
        'Error loading deals:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load deals')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadLeads() {
    if (!organizationId) return

    try {
      const { data, error: leadsError } =
        await supabase
          .from('leads')
          .select(`
            id,
            status,
            company_id,
            contact_id,
            companies (
              name
            ),
            contacts (
              first_name,
              last_name
            )
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .not(
            'status',
            'eq',
            'Lost'
          )
          .order('created_at', {
            ascending: false,
          })

      if (leadsError) {
        throw leadsError
      }

      const formattedLeads: Lead[] =
        (data ?? []).map(
          (lead: any) => {
            const company =
              Array.isArray(
                lead.companies
              )
                ? lead.companies[0]
                : lead.companies

            const contact =
              Array.isArray(
                lead.contacts
              )
                ? lead.contacts[0]
                : lead.contacts

            return {
              id: lead.id,
              status: lead.status,
              company_id:
                lead.company_id,
              contact_id:
                lead.contact_id,
              companies: company
                ? {
                    name: company.name,
                  }
                : null,
              contacts: contact
                ? {
                    first_name:
                      contact.first_name,
                    last_name:
                      contact.last_name,
                  }
                : null,
            }
          }
        )

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
    }
  }

  async function loadEmployees() {
    if (!organizationId) return

    try {
      const {
        data: members,
        error: membersError,
      } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role
        `)
        .eq(
          'organization_id',
          organizationId
        )
        .order('role', {
          ascending: true,
        })

      if (membersError) {
        throw membersError
      }

      if (!members || members.length === 0) {
        setEmployees([])
        return
      }

      const userIds =
        members.map(
          (member) =>
            member.user_id
        )

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email
        `)
        .in('id', userIds)

      if (profilesError) {
        throw profilesError
      }

      const profileMap =
        new Map(
          (profiles ?? []).map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        )

      const formattedEmployees: Employee[] =
        members.map((member) => {
          const profile =
            profileMap.get(
              member.user_id
            )

          return {
            id: member.id,
            user_id:
              member.user_id,
            full_name:
              profile?.full_name ||
              'Unknown User',
            email:
              profile?.email ||
              '',
            role:
              member.role ||
              'employee',
          }
        })

      setEmployees(
        formattedEmployees
      )
    } catch (error) {
      console.error(
        'Error loading employees:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to load employees'
        )
      }
    }
  }

  useEffect(() => {
    if (!organizationId) return

    async function loadData() {
      await Promise.all([
        loadDeals(),
        loadLeads(),
        loadEmployees(),
      ])
    }

    loadData()
  }, [organizationId])

  function updateField(
    field: keyof DealForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function getLeadName(
    lead: Lead
  ) {
    const contactName =
      lead.contacts
        ? `${lead.contacts.first_name} ${
            lead.contacts.last_name ??
            ''
          }`.trim()
        : ''

    const companyName =
      lead.companies?.name?.trim() ??
      ''

    if (
      contactName &&
      companyName
    ) {
      return `${contactName} • ${companyName}`
    }

    if (contactName) {
      return contactName
    }

    if (companyName) {
      return companyName
    }

    return 'Unnamed Lead'
  }

  function getEmployee(
    userIdToFind: string | null
  ) {
    if (!userIdToFind) {
      return null
    }

    return (
      employees.find(
        (employee) =>
          employee.user_id ===
          userIdToFind
      ) ?? null
    )
  }

  async function handleAddDeal(
    event: React.FormEvent
  ) {
    event.preventDefault()

    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      if (!form.name.trim()) {
        throw new Error(
          'Deal name is required'
        )
      }

      let value: number | null =
        null

      if (form.value.trim()) {
        const parsedValue =
          Number(form.value)

        if (
          Number.isNaN(
            parsedValue
          ) ||
          parsedValue < 0
        ) {
          throw new Error(
            'Deal value must be a valid non-negative number'
          )
        }

        value = parsedValue
      }

      const {
        error: insertError,
      } = await supabase
        .from('deals')
        .insert({
          organization_id:
            organizationId,
          lead_id:
            form.lead_id || null,
          name: form.name.trim(),
          stage: form.stage,
          value,
          expected_close_date:
            form.expected_close_date ||
            null,
          assigned_to:
            form.assigned_to ||
            null,
        })

      if (insertError) {
        throw insertError
      }

      setForm(emptyForm)
      setShowForm(false)

      await loadDeals()
    } catch (error) {
      console.error(
        'Error creating deal:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to create deal'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function updateDealStage(
    dealId: string,
    stage: string
  ) {
    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    try {
      setError('')

      const {
        error: updateError,
      } = await supabase
        .from('deals')
        .update({
          stage,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          dealId
        )
        .eq(
          'organization_id',
          organizationId
        )

      if (updateError) {
        throw updateError
      }

      setDeals(
        (currentDeals) =>
          currentDeals.map(
            (deal) =>
              deal.id === dealId
                ? {
                    ...deal,
                    stage,
                  }
                : deal
          )
      )
    } catch (error) {
      console.error(
        'Error updating deal:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to update deal'
        )
      }
    }
  }

  async function handleDeleteDeal(
    dealId: string
  ) {
    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this deal?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const {
        error: deleteError,
      } = await supabase
        .from('deals')
        .delete()
        .eq(
          'id',
          dealId
        )
        .eq(
          'organization_id',
          organizationId
        )

      if (deleteError) {
        throw deleteError
      }

      setDeals(
        (currentDeals) =>
          currentDeals.filter(
            (deal) =>
              deal.id !== dealId
          )
      )
    } catch (error) {
      console.error(
        'Error deleting deal:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to delete deal'
        )
      }
    }
  }

  function getStageDeals(
    stage: string
  ) {
    return deals.filter(
      (deal) =>
        deal.stage === stage
    )
  }

  function getStageValue(
    stage: string
  ) {
    return getStageDeals(
      stage
    ).reduce(
      (total, deal) =>
        total +
        Number(
          deal.value ?? 0
        ),
      0
    )
  }

  function formatCurrency(
    value: number | null
  ) {
    return `$${Number(
      value ?? 0
    ).toLocaleString()}`
  }

  function getStageColor(
    stage: string
  ) {
    switch (stage) {
      case 'Qualified':
        return '#38bdf8'

      case 'Proposal':
        return '#a78bfa'

      case 'Negotiation':
        return '#f59e0b'

      case 'Won':
        return '#22c55e'

      case 'Lost':
        return '#ef4444'

      default:
        return '#94a3b8'
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 0%, rgba(124,58,237,0.10), transparent 28%), #070a12',
        color: '#f8fafc',
        padding: '32px',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1500px',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '7px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius:
                    '50%',
                  background:
                    '#8b5cf6',
                  boxShadow:
                    '0 0 14px rgba(139,92,246,0.8)',
                }}
              />

              <span
                style={{
                  color: '#a78bfa',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing:
                    '0.08em',
                  textTransform:
                    'uppercase',
                }}
              >
                Sales Pipeline
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 750,
                letterSpacing:
                  '-0.03em',
              }}
            >
              Deals
            </h1>

            <p
              style={{
                color: '#94a3b8',
                margin:
                  '8px 0 0',
                fontSize: '14px',
              }}
            >
              Manage your sales
              pipeline and track
              opportunities.
            </p>
          </div>

          <button
            onClick={() => {
              setError('')
              setForm(emptyForm)
              setShowForm(true)
            }}
            style={{
              padding:
                '12px 18px',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: '11px',
              background:
                'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow:
                '0 10px 30px rgba(124,58,237,0.22)',
            }}
          >
            + Add Deal
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background:
                'rgba(127,29,29,0.28)',
              border:
                '1px solid rgba(248,113,113,0.22)',
              color: '#fca5a5',
              padding:
                '13px 16px',
              borderRadius:
                '11px',
              marginBottom:
                '20px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* ADD DEAL FORM */}
        {showForm && (
          <div
            style={{
              background:
                'rgba(15,23,42,0.78)',
              border:
                '1px solid rgba(255,255,255,0.08)',
              borderRadius:
                '18px',
              padding: '26px',
              marginBottom:
                '28px',
              boxShadow:
                '0 20px 50px rgba(0,0,0,0.20)',
              backdropFilter:
                'blur(18px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                marginBottom:
                  '24px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize:
                      '20px',
                  }}
                >
                  Add Deal
                </h2>

                <p
                  style={{
                    margin:
                      '5px 0 0',
                    color:
                      '#64748b',
                    fontSize:
                      '13px',
                  }}
                >
                  Create a new
                  opportunity in
                  your pipeline.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm(
                    emptyForm
                  )
                  setError('')
                }}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius:
                    '9px',
                  border:
                    '1px solid #334155',
                  background:
                    'rgba(15,23,42,0.8)',
                  color:
                    '#94a3b8',
                  cursor:
                    'pointer',
                  fontSize:
                    '20px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleAddDeal
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
                {/* NAME */}
                <Input
                  label="Deal Name"
                  value={
                    form.name
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'name',
                      value
                    )
                  }
                  placeholder="Website Redesign Project"
                  required
                />

                {/* LEAD */}
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Lead
                  </label>

                  <select
                    value={
                      form.lead_id
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        'lead_id',
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    <option value="">
                      No lead
                    </option>

                    {leads.map(
                      (lead) => (
                        <option
                          key={
                            lead.id
                          }
                          value={
                            lead.id
                          }
                        >
                          {getLeadName(
                            lead
                          )}{' '}
                          —{' '}
                          {
                            lead.status
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* STAGE */}
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Stage
                  </label>

                  <select
                    value={
                      form.stage
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        'stage',
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    {stages.map(
                      (stage) => (
                        <option
                          key={
                            stage
                          }
                          value={
                            stage
                          }
                        >
                          {stage}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* VALUE */}
                <Input
                  label="Deal Value"
                  type="number"
                  value={
                    form.value
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'value',
                      value
                    )
                  }
                  placeholder="5000"
                />

                {/* CLOSE DATE */}
                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Expected Close
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      form.expected_close_date
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        'expected_close_date',
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      inputStyle
                    }
                  />
                </div>

                {/* ASSIGNED TO */}
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
                      form.assigned_to
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        'assigned_to',
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {employees.map(
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
                          {employee.full_name}
                          {employee.user_id ===
                          userId
                            ? ' (You)'
                            : ''}{' '}
                          —{' '}
                          {
                            employee.role
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  gap: '12px',
                  marginTop:
                    '25px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(
                      false
                    )
                    setForm(
                      emptyForm
                    )
                    setError('')
                  }}
                  style={{
                    padding:
                      '11px 18px',
                    borderRadius:
                      '10px',
                    border:
                      '1px solid #334155',
                    background:
                      'transparent',
                    color:
                      '#cbd5e1',
                    cursor:
                      'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  style={{
                    padding:
                      '11px 20px',
                    borderRadius:
                      '10px',
                    border:
                      '1px solid rgba(139,92,246,0.3)',
                    background:
                      saving
                        ? '#334155'
                        : '#7c3aed',
                    color: '#fff',
                    cursor:
                      saving
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Deal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PIPELINE SUMMARY */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom:
              '25px',
          }}
        >
          <SummaryCard
            label="Total Deals"
            value={deals.length.toString()}
          />

          <SummaryCard
            label="Pipeline Value"
            value={formatCurrency(
              deals
                .filter(
                  (deal) =>
                    deal.stage !==
                      'Won' &&
                    deal.stage !==
                      'Lost'
                )
                .reduce(
                  (
                    total,
                    deal
                  ) =>
                    total +
                    Number(
                      deal.value ??
                        0
                    ),
                  0
                )
            )}
          />

          <SummaryCard
            label="Won"
            value={formatCurrency(
              getStageValue(
                'Won'
              )
            )}
          />

          <SummaryCard
            label="Negotiation"
            value={formatCurrency(
              getStageValue(
                'Negotiation'
              )
            )}
          />
        </div>

        {/* KANBAN */}
        {loading ? (
          <div
            style={{
              padding: '50px',
              textAlign:
                'center',
              color: '#64748b',
              background:
                'rgba(15,23,42,0.55)',
              border:
                '1px solid rgba(255,255,255,0.06)',
              borderRadius:
                '16px',
            }}
          >
            Loading deals...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(5, minmax(230px, 1fr))',
              gap: '15px',
              overflowX:
                'auto',
              paddingBottom:
                '20px',
            }}
          >
            {stages.map(
              (stage) => {
                const stageDeals =
                  getStageDeals(
                    stage
                  )

                return (
                  <div
                    key={stage}
                    style={{
                      background:
                        'rgba(15,23,42,0.68)',
                      border:
                        '1px solid rgba(255,255,255,0.07)',
                      borderRadius:
                        '16px',
                      minHeight:
                        '450px',
                      padding:
                        '15px',
                      backdropFilter:
                        'blur(14px)',
                    }}
                  >
                    {/* COLUMN HEADER */}
                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
                        marginBottom:
                          '7px',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            width:
                              '9px',
                            height:
                              '9px',
                            borderRadius:
                              '50%',
                            background:
                              getStageColor(
                                stage
                              ),
                            boxShadow: `0 0 10px ${getStageColor(
                              stage
                            )}66`,
                          }}
                        />

                        <h3
                          style={{
                            margin: 0,
                            fontSize:
                              '14px',
                            fontWeight:
                              700,
                          }}
                        >
                          {stage}
                        </h3>

                        <span
                          style={{
                            color:
                              '#64748b',
                            fontSize:
                              '12px',
                            background:
                              '#0b1020',
                            border:
                              '1px solid #1e293b',
                            padding:
                              '2px 7px',
                            borderRadius:
                              '999px',
                          }}
                        >
                          {
                            stageDeals.length
                          }
                        </span>
                      </div>
                    </div>

                    <p
                      style={{
                        margin:
                          '0 0 15px',
                        color:
                          '#64748b',
                        fontSize:
                          '12px',
                      }}
                    >
                      {formatCurrency(
                        getStageValue(
                          stage
                        )
                      )}
                    </p>

                    {/* DEAL CARDS */}
                    <div
                      style={{
                        display:
                          'grid',
                        gap: '12px',
                      }}
                    >
                      {stageDeals.map(
                        (
                          deal
                        ) => (
                          <DealCard
                            key={
                              deal.id
                            }
                            deal={
                              deal
                            }
                            assignedEmployee={getEmployee(
                              deal.assigned_to
                            )}
                            currentUserId={
                              userId
                            }
                            onStageChange={
                              updateDealStage
                            }
                            onDelete={
                              handleDeleteDeal
                            }
                            stages={
                              stages
                            }
                            formatCurrency={
                              formatCurrency
                            }
                          />
                        )
                      )}

                      {stageDeals.length ===
                        0 && (
                        <div
                          style={{
                            border:
                              '1px dashed #334155',
                            borderRadius:
                              '10px',
                            padding:
                              '25px 10px',
                            textAlign:
                              'center',
                            color:
                              '#475569',
                            fontSize:
                              '13px',
                          }}
                        >
                          No deals
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* -----------------------------
   DEAL CARD
----------------------------- */

function DealCard({
  deal,
  assignedEmployee,
  currentUserId,
  onStageChange,
  onDelete,
  stages,
  formatCurrency,
}: {
  deal: Deal
  assignedEmployee: Employee | null
  currentUserId: string | null
  onStageChange: (
    id: string,
    stage: string
  ) => void
  onDelete: (
    id: string
  ) => void
  stages: string[]
  formatCurrency: (
    value: number | null
  ) => string
}) {
  const companyName =
    deal.lead?.companies?.name

  const contactName =
    deal.lead?.contacts
      ? `${deal.lead.contacts.first_name} ${
          deal.lead.contacts.last_name ??
          ''
        }`.trim()
      : ''

  const isAssignedToCurrentUser =
    assignedEmployee?.user_id ===
    currentUserId

  return (
    <div
      style={{
        background:
          'rgba(15,23,42,0.88)',
        border:
          '1px solid #253047',
        borderRadius:
          '12px',
        padding: '15px',
        transition:
          'border-color 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* DEAL NAME */}
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          gap: '10px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.4,
            fontWeight: 700,
          }}
        >
          {deal.name}
        </h4>
      </div>

      {/* COMPANY */}
      {companyName && (
        <p
          style={{
            margin:
              '10px 0 3px',
            color: '#cbd5e1',
            fontSize: '13px',
          }}
        >
          🏢 {companyName}
        </p>
      )}

      {/* CONTACT */}
      {contactName && (
        <p
          style={{
            margin:
              '3px 0',
            color: '#94a3b8',
            fontSize: '13px',
          }}
        >
          👤 {contactName}
        </p>
      )}

      {/* VALUE */}
      <div
        style={{
          marginTop: '12px',
          fontWeight: 750,
          color: '#c4b5fd',
          fontSize: '17px',
        }}
      >
        {formatCurrency(
          deal.value
        )}
      </div>

      {/* CLOSE DATE */}
      {deal.expected_close_date && (
        <p
          style={{
            color: '#64748b',
            fontSize: '12px',
            margin:
              '8px 0 12px',
          }}
        >
          Close:{' '}
          {new Date(
            deal.expected_close_date
          ).toLocaleDateString()}
        </p>
      )}

      {/* ASSIGNED EMPLOYEE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          marginTop:
            deal.expected_close_date
              ? '0'
              : '12px',
          marginBottom:
            '11px',
          padding:
            '8px 9px',
          background:
            'rgba(30,41,59,0.5)',
          border:
            '1px solid rgba(255,255,255,0.05)',
          borderRadius:
            '9px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius:
              '50%',
            background:
              assignedEmployee
                ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                : '#1e293b',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {assignedEmployee
            ? assignedEmployee.full_name
                .trim()
                .charAt(0)
                .toUpperCase()
            : '?'}
        </div>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: '#64748b',
              fontSize: '10px',
              textTransform:
                'uppercase',
              letterSpacing:
                '0.06em',
              fontWeight: 700,
            }}
          >
            Assigned to
          </div>

          <div
            style={{
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              overflow:
                'hidden',
              textOverflow:
                'ellipsis',
              whiteSpace:
                'nowrap',
            }}
          >
            {assignedEmployee
              ? isAssignedToCurrentUser
                ? `${assignedEmployee.full_name} (You)`
                : assignedEmployee.full_name
              : 'Unassigned'}
          </div>
        </div>
      </div>

      {/* MOVE STAGE */}
      <select
        value={deal.stage}
        onChange={(event) =>
          onStageChange(
            deal.id,
            event.target.value
          )
        }
        style={{
          width: '100%',
          padding: '8px 9px',
          borderRadius:
            '8px',
          border:
            '1px solid #334155',
          background:
            '#111827',
          color: '#f8fafc',
          fontSize: '12px',
          outline: 'none',
        }}
      >
        {stages.map(
          (stage) => (
            <option
              key={stage}
              value={stage}
            >
              Move to {stage}
            </option>
          )
        )}
      </select>

      {/* DELETE */}
      <button
        onClick={() =>
          onDelete(
            deal.id
          )
        }
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '8px',
          borderRadius:
            '8px',
          border:
            '1px solid rgba(127,29,29,0.7)',
          background:
            'rgba(127,29,29,0.08)',
          color: '#fca5a5',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        Delete
      </button>
    </div>
  )
}

/* -----------------------------
   INPUT
----------------------------- */

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        style={labelStyle}
      >
        {label}

        {required && (
          <span
            style={{
              color: '#f87171',
            }}
          >
            {' '}
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={
          placeholder
        }
        min={
          type === 'number'
            ? '0'
            : undefined
        }
        style={inputStyle}
      />
    </div>
  )
}

/* -----------------------------
   SUMMARY CARD
----------------------------- */

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={{
        background:
          'rgba(15,23,42,0.68)',
        border:
          '1px solid rgba(255,255,255,0.07)',
        borderRadius:
          '14px',
        padding: '18px',
        boxShadow:
          '0 12px 30px rgba(0,0,0,0.12)',
      }}
    >
      <p
        style={{
          margin: 0,
          color: '#64748b',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        {label}
      </p>

      <h2
        style={{
          margin:
            '7px 0 0',
          fontSize: '23px',
          fontWeight: 750,
          letterSpacing:
            '-0.02em',
        }}
      >
        {value}
      </h2>
    </div>
  )
}

/* -----------------------------
   STYLES
----------------------------- */

const labelStyle: React.CSSProperties =
  {
    display: 'block',
    marginBottom: '7px',
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: 600,
  }

const inputStyle: React.CSSProperties =
  {
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

const selectStyle: React.CSSProperties =
  {
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