import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useOrganization } from '../context/OrganizationContext'

type Company = {
  id: string
  name: string
}

type Employee = {
  id: string
  user_id: string
  full_name: string
  email: string
  role: string
}

type Contact = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  company_id: string | null
  company_name?: string
  assigned_to: string | null
  created_at?: string
  updated_at?: string
}

type ContactForm = {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company_id: string
  assigned_to: string
}

const emptyForm: ContactForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  job_title: '',
  company_id: '',
  assigned_to: '',
}

export default function Contacts() {
  const {
    organizationId,
    userId,
  } = useOrganization()

  const [contacts, setContacts] =
    useState<Contact[]>([])

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

  const [editingContactId, setEditingContactId] =
    useState<string | null>(null)

  const [form, setForm] =
    useState<ContactForm>(
      emptyForm
    )

  const [error, setError] =
    useState('')

  // ============================================
  // LOAD CONTACTS
  // ============================================

  async function loadContacts() {
    if (!organizationId) return

    try {
      setLoading(true)
      setError('')

      const {
        data,
        error: contactsError,
      } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          job_title,
          company_id,
          assigned_to,
          created_at,
          updated_at,
          companies (
            name
          )
        `)
        .eq(
          'organization_id',
          organizationId
        )
        .order('created_at', {
          ascending: false,
        })

      if (contactsError) {
        throw contactsError
      }

      const formattedContacts: Contact[] =
        (data ?? []).map(
          (contact: any) => ({
            id: contact.id,
            first_name:
              contact.first_name,
            last_name:
              contact.last_name,
            email:
              contact.email,
            phone:
              contact.phone,
            job_title:
              contact.job_title,
            company_id:
              contact.company_id,
            company_name:
              contact.companies?.name ??
              '',
            assigned_to:
              contact.assigned_to,
            created_at:
              contact.created_at,
            updated_at:
              contact.updated_at,
          })
        )

      setContacts(
        formattedContacts
      )
    } catch (error) {
      console.error(
        'Error loading contacts:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to load contacts'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // LOAD COMPANIES
  // ============================================

  async function loadCompanies() {
    if (!organizationId) return

    try {
      const {
        data,
        error: companiesError,
      } = await supabase
        .from('companies')
        .select('id, name')
        .eq(
          'organization_id',
          organizationId
        )
        .order('name', {
          ascending: true,
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
    }
  }

  // ============================================
  // LOAD EMPLOYEES
  // ============================================

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

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    if (!organizationId) return

    async function loadData() {
      await Promise.all([
        loadContacts(),
        loadCompanies(),
        loadEmployees(),
      ])
    }

    loadData()
  }, [organizationId])

  // ============================================
  // FORM
  // ============================================

  function updateField(
    field: keyof ContactForm,
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
    setEditingContactId(
      null
    )
    setShowForm(true)
  }

  function openEditForm(
    contact: Contact
  ) {
    setError('')

    setForm({
      first_name:
        contact.first_name ?? '',
      last_name:
        contact.last_name ?? '',
      email:
        contact.email ?? '',
      phone:
        contact.phone ?? '',
      job_title:
        contact.job_title ?? '',
      company_id:
        contact.company_id ?? '',
      assigned_to:
        contact.assigned_to ?? '',
    })

    setEditingContactId(
      contact.id
    )

    setShowForm(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function closeForm() {
    setShowForm(false)
    setEditingContactId(
      null
    )
    setForm(emptyForm)
    setError('')
  }

  // ============================================
  // SAVE CONTACT
  // ============================================

  async function handleSaveContact(
    event: React.FormEvent
  ) {
    event.preventDefault()

    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    if (!form.first_name.trim()) {
      setError(
        'First name is required'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const contactData = {
        company_id:
          form.company_id ||
          null,
        first_name:
          form.first_name.trim(),
        last_name:
          form.last_name.trim() ||
          null,
        email:
          form.email.trim() ||
          null,
        phone:
          form.phone.trim() ||
          null,
        job_title:
          form.job_title.trim() ||
          null,
        assigned_to:
          form.assigned_to ||
          null,
        updated_at:
          new Date().toISOString(),
      }

      if (editingContactId) {
        const {
          error: updateError,
        } = await supabase
          .from('contacts')
          .update(
            contactData
          )
          .eq(
            'id',
            editingContactId
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
          .from('contacts')
          .insert({
            organization_id:
              organizationId,
            ...contactData,
          })

        if (insertError) {
          throw insertError
        }
      }

      closeForm()

      await loadContacts()
    } catch (error) {
      console.error(
        'Error saving contact:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          editingContactId
            ? 'Failed to update contact'
            : 'Failed to create contact'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // DELETE CONTACT
  // ============================================

  async function handleDeleteContact(
    contactId: string
  ) {
    if (!organizationId) {
      setError(
        'No organization found'
      )
      return
    }

    const confirmed =
      window.confirm(
        'Are you sure you want to delete this contact?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const {
        error: deleteError,
      } = await supabase
        .from('contacts')
        .delete()
        .eq(
          'id',
          contactId
        )
        .eq(
          'organization_id',
          organizationId
        )

      if (deleteError) {
        throw deleteError
      }

      setContacts(
        (current) =>
          current.filter(
            (contact) =>
              contact.id !==
              contactId
          )
      )
    } catch (error) {
      console.error(
        'Error deleting contact:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError(
          'Failed to delete contact'
        )
      }
    }
  }

  // ============================================
  // EMPLOYEE HELPER
  // ============================================

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

  // ============================================
  // UI
  // ============================================

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
          title="Contacts"
          description="Manage your organization's contacts"
          actionLabel="+ Add Contact"
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
                display:
                  'flex',
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
                  {editingContactId
                    ? 'Edit Contact'
                    : 'Add Contact'}
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
                  {editingContactId
                    ? 'Update contact information and ownership.'
                    : 'Create a new contact and assign it to a team member.'}
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
                handleSaveContact
              }
            >
              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '18px',
                }}
              >
                <Input
                  label="First Name *"
                  value={
                    form.first_name
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'first_name',
                      value
                    )
                  }
                  placeholder="John"
                />

                <Input
                  label="Last Name"
                  value={
                    form.last_name
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'last_name',
                      value
                    )
                  }
                  placeholder="Doe"
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
                  placeholder="john@example.com"
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
                  label="Job Title"
                  value={
                    form.job_title
                  }
                  onChange={(
                    value
                  ) =>
                    updateField(
                      'job_title',
                      value
                    )
                  }
                  placeholder="CEO"
                />

                {/* COMPANY */}

                <div>
                  <label
                    style={
                      labelStyle
                    }
                  >
                    Company
                  </label>

                  <select
                    value={
                      form.company_id
                    }
                    onChange={(
                      event
                    ) =>
                      updateField(
                        'company_id',
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
                      No company
                    </option>

                    {companies.map(
                      (
                        company
                      ) => (
                        <option
                          key={
                            company.id
                          }
                          value={
                            company.id
                          }
                        >
                          {
                            company.name
                          }
                        </option>
                      )
                    )}
                  </select>
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
                  display:
                    'flex',
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
                    color:
                      '#fff',
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
                    : editingContactId
                    ? 'Update Contact'
                    : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CONTACTS */}

        {loading ? (
          <div
            style={{
              padding:
                '50px',
              textAlign:
                'center',
              color:
                '#64748b',
              background:
                'rgba(15,23,42,0.55)',
              border:
                '1px solid rgba(255,255,255,0.06)',
              borderRadius:
                '16px',
            }}
          >
            Loading contacts...
          </div>
        ) : contacts.length ===
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
                display:
                  'flex',
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
              👤
            </div>

            <h2
              style={{
                margin:
                  '0 0 8px',
              }}
            >
              No contacts yet
            </h2>

            <p
              style={{
                color:
                  '#94a3b8',
                margin: 0,
              }}
            >
              Add your first
              contact to get
              started.
            </p>
          </div>
        ) : (
          <div
            style={{
              display:
                'grid',
              gap: '14px',
            }}
          >
            {contacts.map(
              (contact) => {
                const employee =
                  getEmployee(
                    contact.assigned_to
                  )

                const isCurrentUser =
                  employee?.user_id ===
                  userId

                const fullName =
                  `${contact.first_name} ${
                    contact.last_name ??
                    ''
                  }`.trim()

                return (
                  <div
                    key={
                      contact.id
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
                          <div
                            style={{
                              width:
                                '40px',
                              height:
                                '40px',
                              borderRadius:
                                '12px',
                              background:
                                'linear-gradient(135deg, #7c3aed, #a855f7)',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              color:
                                '#fff',
                              fontWeight:
                                800,
                              fontSize:
                                '14px',
                              flexShrink: 0,
                            }}
                          >
                            {fullName
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <h3
                              style={{
                                margin:
                                  0,
                                fontSize:
                                  '18px',
                                fontWeight:
                                  700,
                              }}
                            >
                              {
                                fullName
                              }
                            </h3>

                            {contact.job_title && (
                              <div
                                style={{
                                  marginTop:
                                    '3px',
                                  color:
                                    '#a78bfa',
                                  fontSize:
                                    '13px',
                                }}
                              >
                                {
                                  contact.job_title
                                }
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              'grid',
                            gridTemplateColumns:
                              'repeat(auto-fit, minmax(210px, 1fr))',
                            gap:
                              '7px 20px',
                            marginTop:
                              '16px',
                          }}
                        >
                          {contact.company_name && (
                            <p
                              style={{
                                margin:
                                  0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                              }}
                            >
                              🏢{' '}
                              {
                                contact.company_name
                              }
                            </p>
                          )}

                          {contact.email && (
                            <p
                              style={{
                                margin:
                                  0,
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
                              ✉️{' '}
                              {
                                contact.email
                              }
                            </p>
                          )}

                          {contact.phone && (
                            <p
                              style={{
                                margin:
                                  0,
                                color:
                                  '#94a3b8',
                                fontSize:
                                  '13px',
                              }}
                            >
                              📞{' '}
                              {
                                contact.phone
                              }
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
                          type="button"
                          onClick={() =>
                            openEditForm(
                              contact
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
                          type="button"
                          onClick={() =>
                            handleDeleteContact(
                              contact.id
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
                          width:
                            '30px',
                          height:
                            '30px',
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

// ============================================
// INPUT
// ============================================

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

// ============================================
// STYLES
// ============================================

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