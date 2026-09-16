import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useOrganization } from '../context/OrganizationContext'

type Company = {
  id: string
  name: string
  website: string | null
  industry: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  country: string | null
  assigned_to: string | null
  created_at?: string
  updated_at?: string
}

type Employee = {
  id: string
  user_id: string
  full_name: string
  email: string
  role: string
}

type CompanyForm = {
  name: string
  website: string
  industry: string
  phone: string
  email: string
  city: string
  state: string
  country: string
  assigned_to: string
}

const emptyForm: CompanyForm = {
  name: '',
  website: '',
  industry: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  country: '',
  assigned_to: '',
}

export default function Companies() {
  const {
    organizationId,
    userId,
  } = useOrganization()

  const [companies, setCompanies] =
    useState<Company[]>([])

  const [employees, setEmployees] =
    useState<Employee[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [showForm, setShowForm] =
    useState(false)

  const [editingCompanyId, setEditingCompanyId] =
    useState<string | null>(null)

  const [form, setForm] =
    useState<CompanyForm>(
      emptyForm
    )

  const [error, setError] =
    useState('')

  async function loadCompanies() {
    if (!organizationId) return

    try {
      setLoading(true)
      setError('')

      const {
        data,
        error: companiesError,
      } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          website,
          industry,
          phone,
          email,
          city,
          state,
          country,
          assigned_to,
          created_at,
          updated_at
        `)
        .eq(
          'organization_id',
          organizationId
        )
        .order('created_at', {
          ascending: false,
        })

      if (companiesError) {
        throw companiesError
      }

      setCompanies(
        data ?? []
      )
    } catch (error) {
      console.error(
        'Error loading companies:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to load companies'
        )
      }
    } finally {
      setLoading(false)
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

      if (
        !members ||
        members.length === 0
      ) {
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
        .in(
          'id',
          userIds
        )

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
        members.map(
          (member) => {
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
          }
        )

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
        loadCompanies(),
        loadEmployees(),
      ])
    }

    loadData()
  }, [organizationId])

  function updateField(
    field: keyof CompanyForm,
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    )
  }

  function openAddForm() {
    setError('')
    setForm(emptyForm)
    setEditingCompanyId(
      null
    )
    setShowForm(true)
  }

  function openEditForm(
    company: Company
  ) {
    setError('')

    setForm({
      name: company.name ?? '',
      website:
        company.website ?? '',
      industry:
        company.industry ?? '',
      phone:
        company.phone ?? '',
      email:
        company.email ?? '',
      city:
        company.city ?? '',
      state:
        company.state ?? '',
      country:
        company.country ?? '',
      assigned_to:
        company.assigned_to ??
        '',
    })

    setEditingCompanyId(
      company.id
    )

    setShowForm(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function closeForm() {
    setShowForm(false)
    setEditingCompanyId(
      null
    )
    setForm(emptyForm)
    setError('')
  }

  async function handleSaveCompany(
    event: React.FormEvent
  ) {
    event.preventDefault()

    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    if (!form.name.trim()) {
      setError(
        'Company name is required'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const companyData = {
        name: form.name.trim(),
        website:
          form.website.trim() ||
          null,
        industry:
          form.industry.trim() ||
          null,
        phone:
          form.phone.trim() ||
          null,
        email:
          form.email.trim() ||
          null,
        city:
          form.city.trim() ||
          null,
        state:
          form.state.trim() ||
          null,
        country:
          form.country.trim() ||
          null,
        assigned_to:
          form.assigned_to ||
          null,
        updated_at:
          new Date().toISOString(),
      }

      if (editingCompanyId) {
        const {
          error: updateError,
        } = await supabase
          .from('companies')
          .update(
            companyData
          )
          .eq(
            'id',
            editingCompanyId
          )
          .eq(
            'organization_id',
            organizationId
          )

        if (updateError) {
          throw updateError
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from('companies')
          .insert({
            organization_id:
              organizationId,
            ...companyData,
          })

        if (insertError) {
          throw insertError
        }
      }

      closeForm()

      await loadCompanies()
    } catch (error) {
      console.error(
        'Error saving company:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          editingCompanyId
            ? 'Failed to update company'
            : 'Failed to create company'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCompany(
    companyId: string
  ) {
    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this company?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const {
        error: deleteError,
      } = await supabase
        .from('companies')
        .delete()
        .eq(
          'id',
          companyId
        )
        .eq(
          'organization_id',
          organizationId
        )

      if (deleteError) {
        throw deleteError
      }

      setCompanies(
        (current) =>
          current.filter(
            (company) =>
              company.id !==
              companyId
          )
      )
    } catch (error) {
      console.error(
        'Error deleting company:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to delete company'
        )
      }
    }
  }

  function getEmployee(
    assignedTo: string | null
  ) {
    if (!assignedTo) {
      return null
    }

    return (
      employees.find(
        (employee) =>
          employee.user_id ===
          assignedTo
      ) ?? null
    )
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
          maxWidth: '1250px',
          margin: '0 auto',
        }}
      >
        <PageHeader
          title="Companies"
          description="Manage your organization's companies"
          actionLabel="+ Add Company"
          onAction={
            openAddForm
          }
        />

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
              fontSize:
                '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* FORM */}

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
                  {editingCompanyId
                    ? 'Edit Company'
                    : 'Add Company'}
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
                  {editingCompanyId
                    ? 'Update company information and ownership.'
                    : 'Create a new company and assign it to a team member.'}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
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
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSaveCompany
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
                <Input
                  label="Company Name *"
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
                  placeholder="Acme Inc."
                />

                <Input
                  label="Website"
                  value={
                    form.website
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'website',
                      value
                    )
                  }
                  placeholder="https://example.com"
                />

                <Input
                  label="Industry"
                  value={
                    form.industry
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'industry',
                      value
                    )
                  }
                  placeholder="Technology"
                />

                <Input
                  label="Phone"
                  value={
                    form.phone
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'phone',
                      value
                    )
                  }
                  placeholder="+1 555 123 4567"
                />

                <Input
                  label="Email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'email',
                      value
                    )
                  }
                  placeholder="contact@example.com"
                />

                <Input
                  label="City"
                  value={
                    form.city
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'city',
                      value
                    )
                  }
                  placeholder="Dallas"
                />

                <Input
                  label="State"
                  value={
                    form.state
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'state',
                      value
                    )
                  }
                  placeholder="Texas"
                />

                <Input
                  label="Country"
                  value={
                    form.country
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'country',
                      value
                    )
                  }
                  placeholder="United States"
                />

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
                          {
                            employee.full_name
                          }

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
                  onClick={
                    closeForm
                  }
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
                    fontWeight:
                      600,
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
                    fontWeight:
                      700,
                  }}
                >
                  {saving
                    ? 'Saving...'
                    : editingCompanyId
                    ? 'Update Company'
                    : 'Save Company'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* COMPANIES */}

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
            Loading companies...
          </div>
        ) : companies.length ===
          0 ? (
          <div
            style={{
              background:
                'rgba(15,23,42,0.68)',
              border:
                '1px solid rgba(255,255,255,0.07)',
              borderRadius:
                '16px',
              padding: '50px',
              textAlign:
                'center',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius:
                  '14px',
                margin:
                  '0 auto 15px',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                background:
                  'rgba(124,58,237,0.12)',
                color:
                  '#a78bfa',
                fontSize:
                  '22px',
              }}
            >
              🏢
            </div>

            <h2
              style={{
                margin:
                  '0 0 8px',
              }}
            >
              No companies yet
            </h2>

            <p
              style={{
                color:
                  '#94a3b8',
                margin: 0,
              }}
            >
              Add your first
              company to get
              started.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '14px',
            }}
          >
            {companies.map(
              (company) => {
                const employee =
                  getEmployee(
                    company.assigned_to
                  )

                const isCurrentUser =
                  employee?.user_id ===
                  userId

                return (
                  <div
                    key={
                      company.id
                    }
                    style={{
                      background:
                        'rgba(15,23,42,0.68)',
                      border:
                        '1px solid rgba(255,255,255,0.07)',
                      borderRadius:
                        '15px',
                      padding:
                        '20px',
                      boxShadow:
                        '0 12px 30px rgba(0,0,0,0.12)',
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
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
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
                                '18px',
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              company.name
                            }
                          </h3>

                          {company.industry && (
                            <span
                              style={{
                                padding:
                                  '4px 9px',
                                borderRadius:
                                  '999px',
                                background:
                                  'rgba(124,58,237,0.12)',
                                border:
                                  '1px solid rgba(139,92,246,0.2)',
                                color:
                                  '#c4b5fd',
                                fontSize:
                                  '11px',
                                fontWeight:
                                  600,
                              }}
                            >
                              {
                                company.industry
                              }
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display:
                              'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(200px, 1fr))',
                            gap:
                              '6px 20px',
                            marginTop:
                              '13px',
                          }}
                        >
                          {company.email && (
                            <p
                              style={{
                                margin: 0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                              }}
                            >
                              ✉️{' '}
                              {
                                company.email
                              }
                            </p>
                          )}

                          {company.phone && (
                            <p
                              style={{
                                margin: 0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                              }}
                            >
                              📞{' '}
                              {
                                company.phone
                              }
                            </p>
                          )}

                          {company.website && (
                            <p
                              style={{
                                margin: 0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                                overflow:
                                  'hidden',
                                textOverflow:
                                  'ellipsis',
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              🌐{' '}
                              {
                                company.website
                              }
                            </p>
                          )}

                          {(company.city ||
                            company.state ||
                            company.country) && (
                            <p
                              style={{
                                margin: 0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                              }}
                            >
                              📍{' '}
                              {[
                                company.city,
                                company.state,
                                company.country,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ', '
                                )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          alignItems:
                            'center',
                          gap: '8px',
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={() =>
                            openEditForm(
                              company
                            )
                          }
                          style={{
                            padding:
                              '8px 13px',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid #334155',
                            background:
                              'rgba(15,23,42,0.8)',
                            color:
                              '#cbd5e1',
                            cursor:
                              'pointer',
                            fontSize:
                              '12px',
                            fontWeight:
                              600,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteCompany(
                              company.id
                            )
                          }
                          style={{
                            padding:
                              '8px 13px',
                            borderRadius:
                              '8px',
                            border:
                              '1px solid rgba(127,29,29,0.7)',
                            background:
                              'rgba(127,29,29,0.08)',
                            color:
                              '#fca5a5',
                            cursor:
                              'pointer',
                            fontSize:
                              '12px',
                            fontWeight:
                              600,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* ASSIGNED EMPLOYEE */}

                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: '9px',
                        marginTop:
                          '17px',
                        padding:
                          '9px 10px',
                        background:
                          'rgba(30,41,59,0.42)',
                        border:
                          '1px solid rgba(255,255,255,0.05)',
                        borderRadius:
                          '10px',
                        width:
                          'fit-content',
                        maxWidth:
                          '100%',
                      }}
                    >
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius:
                            '50%',
                          background:
                            employee
                              ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                              : '#1e293b',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          color:
                            '#fff',
                          fontSize:
                            '11px',
                          fontWeight:
                            800,
                          flexShrink: 0,
                        }}
                      >
                        {employee
                          ? employee.full_name
                              .trim()
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
                              '10px',
                            textTransform:
                              'uppercase',
                            letterSpacing:
                              '0.06em',
                            fontWeight:
                              700,
                          }}
                        >
                          Assigned to
                        </div>

                        <div
                          style={{
                            color:
                              '#cbd5e1',
                            fontSize:
                              '12px',
                            fontWeight:
                              600,
                          }}
                        >
                          {employee
                            ? isCurrentUser
                              ? `${employee.full_name} (You)`
                              : employee.full_name
                            : 'Unassigned'}
                        </div>
                      </div>
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

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label
        style={
          labelStyle
        }
      >
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
        placeholder={
          placeholder
        }
        style={
          inputStyle
        }
      />
    </div>
  )
}

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