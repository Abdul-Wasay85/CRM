import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

type Lead = {
  id: string
  status: string
  companies?: {
    name: string
  } | null
  contacts?: {
    first_name: string
    last_name: string | null
  } | null
}

type Activity = {
  id: string
  lead_id: string | null
  type: string
  description: string | null
  created_at: string
  lead?: {
    companies?: {
      name: string
    } | null
    contacts?: {
      first_name: string
      last_name: string | null
    } | null
  } | null
}

type ActivityForm = {
  lead_id: string
  type: string
  description: string
}

const activityTypes = [
  'Call',
  'Email',
  'Meeting',
  'Note',
  'Follow-up',
]

const emptyForm: ActivityForm = {
  lead_id: '',
  type: 'Call',
  description: '',
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ActivityForm>(emptyForm)

  const [error, setError] = useState('')

  async function getOrganizationId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user) {
      throw new Error('Not authenticated')
    }

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)

    if (membershipError) {
      throw membershipError
    }

    if (!memberships || memberships.length === 0) {
      throw new Error('No organization found')
    }

    return memberships[0].organization_id
  }

  async function loadActivities() {
    try {
      setLoading(true)
      setError('')

      const organizationId = await getOrganizationId()

      const {
        data,
        error: activitiesError,
      } = await supabase
        .from('activities')
    .select(`
  id,
  lead_id,
  type,
  description,
  created_at,
  leads (
    companies (
      name
    ),
    contacts (
      first_name,
      last_name
    )
  )
`)
        .eq('organization_id', organizationId)
        .order('created_at', {
          ascending: false,
        })

      if (activitiesError) {
        throw activitiesError
      }

      const formattedActivities: Activity[] = (
        data ?? []
      ).map((activity: any) => ({
        id: activity.id,
        lead_id: activity.lead_id,
        type: activity.type,
        description: activity.description,
        created_at: activity.created_at,
        lead: activity.leads
          ? {
              companies:
                activity.leads.companies ?? null,
              contacts:
                activity.leads.contacts ?? null,
            }
          : null,
      }))

      setActivities(formattedActivities)
    } catch (error) {
      console.error(
        'Error loading activities:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load activities')
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadLeads() {
    try {
      const organizationId =
        await getOrganizationId()

      const {
        data,
        error: leadsError,
      } = await supabase
        .from('leads')
    .select(`
  id,
  status,
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

      setLeads((data ?? []) as unknown as Lead[])
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

  useEffect(() => {
    async function loadData() {
      await Promise.all([
        loadActivities(),
        loadLeads(),
      ])
    }

    loadData()
  }, [])

  function updateField(
    field: keyof ActivityForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function getLeadName(lead: Lead) {
    let contactName = ''

    if (lead.contacts) {
      contactName =
        lead.contacts.first_name +
        ' ' +
        (lead.contacts.last_name || '')

      contactName = contactName.trim()
    }

    const companyName =
      lead.companies?.name || ''

    if (contactName && companyName) {
      return (
        contactName +
        ' • ' +
        companyName
      )
    }

    if (contactName) {
      return contactName
    }

    if (companyName) {
      return companyName
    }

    return (
      'Lead ' +
      lead.id.slice(0, 8)
    )
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'Call':
        return '📞'

      case 'Email':
        return '✉️'

      case 'Meeting':
        return '🤝'

      case 'Note':
        return '📝'

      case 'Follow-up':
        return '📅'

      default:
        return '•'
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case 'Call':
        return '#38bdf8'

      case 'Email':
        return '#a78bfa'

      case 'Meeting':
        return '#22c55e'

      case 'Note':
        return '#f59e0b'

      case 'Follow-up':
        return '#ec4899'

      default:
        return '#94a3b8'
    }
  }

  async function handleAddActivity(
    event: React.FormEvent
  ) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      if (!form.description.trim()) {
        throw new Error(
          'Activity description is required'
        )
      }

      const organizationId =
        await getOrganizationId()

      const {
        error: insertError,
      } = await supabase
        .from('activities')
        .insert({
          organization_id: organizationId,
          lead_id:
            form.lead_id || null,
          type: form.type,
          description:
            form.description.trim(),
        })

      if (insertError) {
        throw insertError
      }

      setForm(emptyForm)
      setShowForm(false)

      await loadActivities()
    } catch (error) {
      console.error(
        'Error creating activity:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to create activity'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteActivity(
    activityId: string
  ) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this activity?'
    )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const {
        error: deleteError,
      } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)

      if (deleteError) {
        throw deleteError
      }

      setActivities((current) =>
        current.filter(
          (activity) =>
            activity.id !== activityId
        )
      )
    } catch (error) {
      console.error(
        'Error deleting activity:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to delete activity'
        )
      }
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f8fafc',
        padding: '40px',
        fontFamily:
          'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
<PageHeader
  title="Activities"
  description="Manage your organization's activities"
  actionLabel="+ Add Activity"
  onAction={() => {
    setError('')
    setShowForm(true)
  }}
/>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: '#450a0a',
              border:
                '1px solid #7f1d1d',
              color: '#fca5a5',
              padding: '14px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {/* FORM */}
        {showForm && (
          <div
            style={{
              background: '#111827',
              border:
                '1px solid #334155',
              borderRadius: '16px',
              padding: '30px',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '25px',
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                Add Activity
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm(emptyForm)
                  setError('')
                }}
                style={{
                  background:
                    'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '22px',
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleAddActivity
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
                {/* LEAD */}
                <div>
                  <label
                    style={labelStyle}
                  >
                    Lead
                  </label>

                  <select
                    value={
                      form.lead_id
                    }
                    onChange={(event) =>
                      updateField(
                        'lead_id',
                        event.target
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
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* TYPE */}
                <div>
                  <label
                    style={labelStyle}
                  >
                    Activity Type
                  </label>

                  <select
                    value={
                      form.type
                    }
                    onChange={(event) =>
                      updateField(
                        'type',
                        event.target
                          .value
                      )
                    }
                    style={
                      selectStyle
                    }
                  >
                    {activityTypes.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div
                style={{
                  marginTop: '18px',
                }}
              >
                <label
                  style={labelStyle}
                >
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    updateField(
                      'description',
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. Spoke with the client about the website redesign proposal."
                  rows={5}
                  required
                  style={{
                    width: '100%',
                    boxSizing:
                      'border-box',
                    padding: '12px',
                    borderRadius:
                      '8px',
                    border:
                      '1px solid #334155',
                    background:
                      '#0f172a',
                    color:
                      '#f8fafc',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

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
                  onClick={() => {
                    setShowForm(false)
                    setForm(emptyForm)
                    setError('')
                  }}
                  style={{
                    padding:
                      '12px 20px',
                    borderRadius:
                      '8px',
                    border:
                      '1px solid #475569',
                    background:
                      'transparent',
                    color:
                      '#f8fafc',
                    cursor:
                      'pointer',
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
                    borderRadius:
                      '8px',
                    border: 'none',
                    background:
                      saving
                        ? '#475569'
                        : '#7c3aed',
                    color: '#fff',
                    cursor:
                      saving
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVITIES */}
        {loading ? (
          <p
            style={{
              color: '#94a3b8',
            }}
          >
            Loading activities...
          </p>
        ) : activities.length ===
          0 ? (
          <div
            style={{
              background: '#111827',
              border:
                '1px solid #1e293b',
              borderRadius: '16px',
              padding: '50px',
              textAlign: 'center',
            }}
          >
            <h2>
              No activities yet
            </h2>

            <p
              style={{
                color: '#94a3b8',
              }}
            >
              Record your first
              customer interaction.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '14px',
            }}
          >
            {activities.map(
              (activity) => {
                const companyName =
                  activity.lead
                    ?.companies?.name ||
                  ''

                let contactName = ''

                if (
                  activity.lead
                    ?.contacts
                ) {
                  contactName =
                    activity.lead.contacts
                      .first_name +
                    ' ' +
                    (activity.lead
                      .contacts
                      .last_name ||
                      '')

                  contactName =
                    contactName.trim()
                }

                const activityColor =
                  getActivityColor(
                    activity.type
                  )

                return (
                  <div
                    key={
                      activity.id
                    }
                    style={{
                      background:
                        '#111827',
                      border:
                        '1px solid #1e293b',
                      borderRadius:
                        '14px',
                      padding:
                        '20px',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: '20px',
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          gap: '15px',
                        }}
                      >
                        <div
                          style={{
                            width: '42px',
                            height:
                              '42px',
                            borderRadius:
                              '10px',
                            background:
                              '#1e293b',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            fontSize:
                              '20px',
                            flexShrink: 0,
                          }}
                        >
                          {getActivityIcon(
                            activity.type
                          )}
                        </div>

                        <div>
                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap: '10px',
                              flexWrap:
                                'wrap',
                            }}
                          >
                            <h3
                              style={{
                                margin: 0,
                                fontSize:
                                  '17px',
                              }}
                            >
                              {
                                activity.type
                              }
                            </h3>

                            <span
                              style={{
                                padding:
                                  '4px 9px',
                                borderRadius:
                                  '999px',
                                background:
                                  activityColor +
                                  '22',
                                color:
                                  activityColor,
                                fontSize:
                                  '11px',
                                fontWeight:
                                  600,
                              }}
                            >
                              Activity
                            </span>
                          </div>

                          {(companyName ||
                            contactName) && (
                            <p
                              style={{
                                margin:
                                  '7px 0',
                                color:
                                  '#cbd5e1',
                                fontSize:
                                  '13px',
                              }}
                            >
                              {contactName && (
                                <>
                                  👤{' '}
                                  {
                                    contactName
                                  }
                                </>
                              )}

                              {contactName &&
                                companyName &&
                                ' • '}

                              {companyName && (
                                <>
                                  🏢{' '}
                                  {
                                    companyName
                                  }
                                </>
                              )}
                            </p>
                          )}

                          <p
                            style={{
                              color:
                                '#cbd5e1',
                              margin:
                                '10px 0',
                              lineHeight:
                                1.6,
                            }}
                          >
                            {
                              activity.description
                            }
                          </p>

                          <p
                            style={{
                              color:
                                '#64748b',
                              fontSize:
                                '12px',
                              margin: 0,
                            }}
                          >
                            {formatDate(
                              activity.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteActivity(
                            activity.id
                          )
                        }
                        style={{
                          padding:
                            '8px 14px',
                          borderRadius:
                            '7px',
                          border:
                            '1px solid #7f1d1d',
                          background:
                            'transparent',
                          color:
                            '#fca5a5',
                          cursor:
                            'pointer',
                          fontSize:
                            '12px',
                          flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  color: '#cbd5e1',
  fontSize: '14px',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
}

