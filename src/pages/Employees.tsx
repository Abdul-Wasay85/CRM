import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useOrganization } from '../context/OrganizationContext'

type Employee = {
  id: string
  user_id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

type EmployeeForm = {
  email: string
  full_name: string
  role: string
}

const emptyForm: EmployeeForm = {
  email: '',
  full_name: '',
  role: 'employee',
}

const roles = [
  {
    value: 'admin',
    label: 'Admin',
  },
  {
    value: 'manager',
    label: 'Manager',
  },
  {
    value: 'sales',
    label: 'Sales',
  },
  {
    value: 'employee',
    label: 'Employee',
  },
]

export default function Employees() {
  const {
    organizationId,
    userId,
    role: currentUserRole,
  } = useOrganization()

  const [employees, setEmployees] =
    useState<Employee[]>([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [showForm, setShowForm] =
    useState(false)

  const [form, setForm] =
    useState<EmployeeForm>(
      emptyForm
    )

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const canManageEmployees =
    currentUserRole === 'owner' ||
    currentUserRole === 'admin'

  async function loadEmployees() {
    if (!organizationId) {
      return
    }

    try {
      setLoading(true)
      setError('')

      /*
       * First load the organization memberships.
       *
       * RLS controls which members the current user
       * is allowed to see.
       */
      const {
        data: members,
        error: membersError,
      } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq(
          'organization_id',
          organizationId
        )
        .order('created_at', {
          ascending: true,
        })

      if (membersError) {
        throw membersError
      }

      const userIds =
        (members ?? []).map(
          (member) => member.user_id
        )

      if (userIds.length === 0) {
        setEmployees([])
        return
      }

      /*
       * Profiles contain:
       * - full_name
       * - email
       *
       * RLS determines which profiles the current
       * user is allowed to read.
       */
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

      const profileMap = new Map(
        (profiles ?? []).map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      )

      const formattedEmployees =
        (members ?? []).map(
          (member) => {
            const profile =
              profileMap.get(
                member.user_id
              )

            return {
              id: member.id,
              user_id: member.user_id,
              role: member.role,
              full_name:
                profile?.full_name ||
                'Unnamed Employee',
              email:
                profile?.email ||
                '',
              created_at:
                member.created_at,
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [organizationId])

  function updateField(
    field: keyof EmployeeForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleInviteEmployee(
    event: React.FormEvent
  ) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const email =
        form.email.trim().toLowerCase()

      const fullName =
        form.full_name.trim()

      if (!email) {
        throw new Error(
          'Employee email is required'
        )
      }

      if (
        !email.includes('@') ||
        !email.includes('.')
      ) {
        throw new Error(
          'Please enter a valid email address'
        )
      }

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          'invite-employee',
          {
            body: {
              email,
              full_name: fullName,
              role: form.role,
            },
          }
        )

      if (functionError) {
        throw functionError
      }

      if (data?.error) {
        throw new Error(
          data.error
        )
      }

      setSuccess(
        `Invitation sent to ${email}`
      )

      setForm(emptyForm)
      setShowForm(false)

      await loadEmployees()
    } catch (error) {
      console.error(
        'Error inviting employee:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to invite employee'
        )
      }
    } finally {
      setSaving(false)
    }
  }

async function handleRemoveEmployee(
  employee: Employee
) {
  if (employee.user_id === userId) {
    setError(
      'You cannot remove yourself from the organization'
    )
    return
  }

  if (employee.role === 'owner') {
    setError(
      'The organization owner cannot be removed'
    )
    return
  }

  const confirmed = window.confirm(
    `Remove ${employee.full_name} from this organization?`
  )

  if (!confirmed) {
    return
  }

  try {
    setError('')
    setSuccess('')

    const {
      data: deletedRows,
      error: deleteError,
    } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', employee.id)
      .eq('organization_id', organizationId)
      .select('id')

    if (deleteError) {
      throw deleteError
    }

    /*
     * If RLS prevents the delete, Supabase can return
     * an empty array instead of throwing an error.
     */
    if (!deletedRows || deletedRows.length === 0) {
      throw new Error(
        'Employee was not removed. Your account may not have permission to delete organization members.'
      )
    }

    setEmployees((current) =>
      current.filter(
        (item) => item.id !== employee.id
      )
    )

    setSuccess(
      `${employee.full_name} was removed from the organization`
    )
  } catch (error) {
    console.error(
      'Error removing employee:',
      error
    )

    if (error instanceof Error) {
      setError(error.message)
    } else {
      setError(
        'Failed to remove employee'
      )
    }
  }
}

  return (
    <div
      style={{
        minHeight: '100%',
        color: '#f8fafc',
      }}
    >
      <PageHeader
        title="Employees"
        description="Manage the people who have access to your CRM"
        actionLabel={
          canManageEmployees
            ? '+ Invite Employee'
            : undefined
        }
        onAction={
          canManageEmployees
            ? () => {
                setError('')
                setSuccess('')
                setForm(emptyForm)
                setShowForm(true)
              }
            : undefined
        }
      />

      {error && (
        <div
          style={{
            background: '#450a0a',
            border:
              '1px solid #7f1d1d',
            color: '#fca5a5',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#052e16',
            border:
              '1px solid #166534',
            color: '#86efac',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          {success}
        </div>
      )}

      {showForm &&
        canManageEmployees && (
          <div
            style={{
              background: '#111827',
              border:
                '1px solid #334155',
              borderRadius: '16px',
              padding: '28px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '20px',
                  }}
                >
                  Invite Employee
                </h2>

                <p
                  style={{
                    color: '#94a3b8',
                    margin:
                      '6px 0 0',
                    fontSize: '14px',
                  }}
                >
                  They'll receive an email
                  invitation to join your
                  organization.
                </p>
              </div>

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
                  fontSize: '24px',
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleInviteEmployee
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '18px',
                }}
              >
                <Input
                  label="Full Name"
                  value={
                    form.full_name
                  }
                  onChange={(value) =>
                    updateField(
                      'full_name',
                      value
                    )
                  }
                  placeholder="John Smith"
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    updateField(
                      'email',
                      value
                    )
                  }
                  placeholder="john@company.com"
                  required
                />

                <div>
                  <label
                    style={labelStyle}
                  >
                    Role
                  </label>

                  <select
                    value={form.role}
                    onChange={(event) =>
                      updateField(
                        'role',
                        event.target
                          .value
                      )
                    }
                    style={selectStyle}
                  >
                    {roles.map(
                      (role) => (
                        <option
                          key={
                            role.value
                          }
                          value={
                            role.value
                          }
                        >
                          {role.label}
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
                  marginTop: '24px',
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
                      '11px 18px',
                    borderRadius:
                      '9px',
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
                      '11px 18px',
                    borderRadius:
                      '9px',
                    border: 'none',
                    background: saving
                      ? '#475569'
                      : '#7c3aed',
                    color: '#fff',
                    cursor: saving
                      ? 'not-allowed'
                      : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {saving
                    ? 'Sending...'
                    : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        )}

      {loading ? (
        <div
          style={{
            color: '#94a3b8',
            padding: '30px 0',
          }}
        >
          Loading employees...
        </div>
      ) : (
        <div
          style={{
            background: '#111827',
            border:
              '1px solid #1e293b',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '2fr 1.5fr 1fr 1fr auto',
              gap: '20px',
              padding:
                '16px 20px',
              borderBottom:
                '1px solid #1e293b',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 700,
              textTransform:
                'uppercase',
              letterSpacing:
                '0.06em',
            }}
          >
            <span>Employee</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span />
          </div>

          {employees.map(
            (employee) => (
              <div
                key={employee.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '2fr 1.5fr 1fr 1fr auto',
                  gap: '20px',
                  alignItems:
                    'center',
                  padding:
                    '18px 20px',
                  borderBottom:
                    '1px solid #1e293b',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius:
                        '50%',
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      background:
                        'linear-gradient(135deg, #7c3aed, #4c1d95)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {employee.full_name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {
                        employee.full_name
                      }
                    </div>

                    {employee.user_id ===
                      userId && (
                      <span
                        style={{
                          color:
                            '#a78bfa',
                          fontSize:
                            '12px',
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    color: '#94a3b8',
                    fontSize:
                      '14px',
                  }}
                >
                  {employee.email ||
                    '—'}
                </span>

                <span
                  style={{
                    display:
                      'inline-flex',
                    width:
                      'fit-content',
                    padding:
                      '5px 10px',
                    borderRadius:
                      '999px',
                    background:
                      '#312e81',
                    color:
                      '#c4b5fd',
                    fontSize:
                      '12px',
                    fontWeight: 600,
                    textTransform:
                      'capitalize',
                  }}
                >
                  {
                    employee.role
                  }
                </span>

                <span
                  style={{
                    color: '#94a3b8',
                    fontSize:
                      '13px',
                  }}
                >
                  {new Date(
                    employee.created_at
                  ).toLocaleDateString()}
                </span>

                <div>
                  {canManageEmployees &&
                    employee.user_id !==
                      userId &&
                    employee.role !==
                      'owner' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveEmployee(
                            employee
                          )
                        }
                        style={{
                          padding:
                            '7px 12px',
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
                        }}
                      >
                        Remove
                      </button>
                    )}
                </div>
              </div>
            )
          )}

          {employees.length ===
            0 && (
            <div
              style={{
                padding: '50px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              No employees yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label style={labelStyle}>
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
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  color: '#cbd5e1',
  fontSize: '14px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
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
