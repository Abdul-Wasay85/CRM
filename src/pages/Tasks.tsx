import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { useOrganization } from '../context/OrganizationContext'

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

type Employee = {
  id: string
  user_id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

type Task = {
  id: string
  lead_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: string
  completed: boolean
  created_at: string
  leads?: Lead | null
}

type TaskForm = {
  lead_id: string
  assigned_to: string
  title: string
  description: string
  due_date: string
  priority: string
}

const priorities = ['Low', 'Medium', 'High']

const emptyForm: TaskForm = {
  lead_id: '',
  assigned_to: '',
  title: '',
  description: '',
  due_date: '',
  priority: 'Medium',
}

export default function Tasks() {
  const {
    organizationId,
    userId,
  } = useOrganization()

  const [tasks, setTasks] = useState<Task[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState<TaskForm>(emptyForm)

  const [error, setError] = useState('')

  const [filter, setFilter] = useState<
    'all' | 'pending' | 'overdue' | 'completed'
  >('all')

  /*
   * Load all tasks for the current organization.
   */
  const loadTasks = async () => {
    if (!organizationId) {
      return
    }

    try {
      setError('')

      const {
        data,
        error: tasksError,
      } = await supabase
        .from('tasks')
        .select(`
          id,
          lead_id,
          assigned_to,
          title,
          description,
          due_date,
          priority,
          completed,
          created_at,
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
        .eq('organization_id', organizationId)
        .order('created_at', {
          ascending: false,
        })

      if (tasksError) {
        throw tasksError
      }

      setTasks((data as unknown as Task[]) || [])
    } catch (err) {
      console.error('Error loading tasks:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load tasks.'
      )
    }
  }

  /*
   * Load employees belonging to the current organization.
   */
  const loadEmployees = async () => {
    if (!organizationId) {
      return
    }

    try {
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
        .eq('organization_id', organizationId)
        .order('created_at', {
          ascending: true,
        })

      if (membersError) {
        throw membersError
      }

      const userIds = (members ?? []).map(
        (member) => member.user_id
      )

      if (userIds.length === 0) {
        setEmployees([])
        return
      }

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
        (profiles ?? []).map((profile) => [
          profile.id,
          profile,
        ])
      )

      const formattedEmployees: Employee[] =
        (members ?? []).map((member) => {
          const profile = profileMap.get(
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
        })

      setEmployees(formattedEmployees)
    } catch (err) {
      console.error(
        'Error loading employees:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load employees.'
      )
    }
  }

  /*
   * Load leads for the "Related Lead" dropdown.
   */
  const loadLeads = async () => {
    if (!organizationId) {
      return
    }

    try {
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

      setLeads((data as unknown as Lead[]) || [])
    } catch (err) {
      console.error('Error loading leads:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load leads.'
      )
    }
  }

  /*
   * Initial page load.
   */
  useEffect(() => {
    if (!organizationId) {
      return
    }

    const loadData = async () => {
      setLoading(true)

      await Promise.all([
        loadTasks(),
        loadLeads(),
        loadEmployees(),
      ])

      setLoading(false)
    }

    loadData()
  }, [organizationId])

  /*
   * Update a form field.
   */
  const updateField = (
    field: keyof TaskForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  /*
   * Get a readable lead name.
   */
  const getLeadName = (
    lead: Lead | null | undefined
  ) => {
    if (!lead) {
      return 'No lead'
    }

    const contactName = lead.contacts
      ? `${lead.contacts.first_name || ''} ${
          lead.contacts.last_name || ''
        }`.trim()
      : ''

    const companyName =
      lead.companies?.name || ''

    if (contactName && companyName) {
      return `${contactName} • ${companyName}`
    }

    if (contactName) {
      return contactName
    }

    if (companyName) {
      return companyName
    }

    return `Lead ${lead.id.slice(0, 8)}`
  }

  /*
   * Get employee by user ID.
   */
  const getEmployee = (
    employeeUserId: string | null
  ) => {
    if (!employeeUserId) {
      return null
    }

    return (
      employees.find(
        (employee) =>
          employee.user_id === employeeUserId
      ) || null
    )
  }

  /*
   * Priority styling.
   */
  const getPriorityColor = (
    priority: string
  ) => {
    switch (priority) {
      case 'High':
        return {
          background: '#3f1515',
          color: '#f87171',
          border: '#7f1d1d',
        }

      case 'Medium':
        return {
          background: '#3b2f0b',
          color: '#facc15',
          border: '#854d0e',
        }

      case 'Low':
      default:
        return {
          background: '#142b20',
          color: '#4ade80',
          border: '#166534',
        }
    }
  }

  /*
   * Check whether a task is overdue.
   */
  const isOverdue = (task: Task) => {
    if (task.completed || !task.due_date) {
      return false
    }

    const dueDate = new Date(task.due_date)

    if (Number.isNaN(dueDate.getTime())) {
      return false
    }

    const today = new Date()

    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)

    return dueDate < today
  }

  /*
   * Format due date safely.
   */
  const formatDueDate = (
    date: string | null
  ) => {
    if (!date) {
      return 'No due date'
    }

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'No due date'
    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    )
  }

  /*
   * Add a new task.
   */
  const handleAddTask = async (
    event: React.FormEvent
  ) => {
    event.preventDefault()

    if (!organizationId) {
      setError(
        'No organization was found.'
      )
      return
    }

    if (!form.title.trim()) {
      setError(
        'Task title is required.'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error: insertError } =
        await supabase
          .from('tasks')
          .insert({
            organization_id:
              organizationId,
            lead_id:
              form.lead_id || null,
            assigned_to:
              form.assigned_to || null,
            title:
              form.title.trim(),
            description:
              form.description.trim() ||
              null,
            due_date:
              form.due_date || null,
            priority:
              form.priority,
            completed: false,
          })

      if (insertError) {
        throw insertError
      }

      setForm(emptyForm)
      setShowForm(false)

      await loadTasks()
    } catch (err) {
      console.error(
        'Error adding task:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add task.'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * Mark task as completed / pending.
   */
  const toggleTask = async (
    task: Task
  ) => {
    try {
      setError('')

      const newCompletedValue =
        !task.completed

      const {
        error: updateError,
      } = await supabase
        .from('tasks')
        .update({
          completed:
            newCompletedValue,
        })
        .eq('id', task.id)

      if (updateError) {
        throw updateError
      }

      setTasks(
        (current: Task[]) =>
          current.map(
            (item: Task) =>
              item.id === task.id
                ? {
                    ...item,
                    completed:
                      newCompletedValue,
                  }
                : item
          )
      )
    } catch (err) {
      console.error(
        'Error updating task:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update task.'
      )
    }
  }

  /*
   * Delete a task.
   */
  const handleDeleteTask = async (
    taskId: string
  ) => {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this task?'
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')

      const {
        error: deleteError,
      } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (deleteError) {
        throw deleteError
      }

      setTasks(
        (current: Task[]) =>
          current.filter(
            (task: Task) =>
              task.id !== taskId
          )
      )
    } catch (err) {
      console.error(
        'Error deleting task:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete task.'
      )
    }
  }

  /*
   * Task counters.
   */
  const totalTasks = tasks.length

  const completedTasks =
    tasks.filter(
      (task: Task) =>
        task.completed
    )

  const pendingTasks =
    tasks.filter(
      (task: Task) =>
        !task.completed
    )

  const overdueTasks =
    tasks.filter(
      (task: Task) =>
        isOverdue(task)
    )

  /*
   * Filter tasks for the list.
   */
  const filteredTasks =
    useMemo(() => {
      switch (filter) {
        case 'pending':
          return tasks.filter(
            (task) =>
              !task.completed
          )

        case 'overdue':
          return tasks.filter(
            (task) =>
              isOverdue(task)
          )

        case 'completed':
          return tasks.filter(
            (task) =>
              task.completed
          )

        case 'all':
        default:
          return tasks
      }
    }, [tasks, filter])

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '32px',
        background: '#0f172a',
        color: '#f8fafc',
      }}
    >
      <PageHeader
        title="Tasks"
        description="Manage your organization's tasks"
        actionLabel="+ Add Task"
        onAction={() => {
          setError('')
          setForm(emptyForm)
          setShowForm(true)
        }}
      />

      {/* Error */}
      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '10px',
            background: '#3f1515',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {/* Add Task Form */}
      {showForm && (
        <form
          onSubmit={handleAddTask}
          style={{
            marginBottom: '28px',
            padding: '24px',
            borderRadius: '16px',
            background: '#111827',
            border: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom: '22px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '20px',
                }}
              >
                Add New Task
              </h2>

              <p
                style={{
                  margin:
                    '6px 0 0',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                Assign this task to a
                team member.
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
                border: 'none',
                background:
                  'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '24px',
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            {/* Title */}
            <div>
              <label
                style={labelStyle}
              >
                Task Title *
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  updateField(
                    'title',
                    event.target.value
                  )
                }
                placeholder="e.g. Call client"
                style={inputStyle}
              />
            </div>

            {/* Assigned To */}
            <div>
              <label
                style={labelStyle}
              >
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
                      {employee.full_name}
                      {employee.user_id ===
                      userId
                        ? ' (You)'
                        : ''}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Lead */}
            <div>
              <label
                style={labelStyle}
              >
                Related Lead
              </label>

              <select
                value={form.lead_id}
                onChange={(event) =>
                  updateField(
                    'lead_id',
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                <option value="">
                  No lead
                </option>

                {leads.map(
                  (lead) => (
                    <option
                      key={lead.id}
                      value={lead.id}
                    >
                      {getLeadName(
                        lead
                      )}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label
                style={labelStyle}
              >
                Due Date
              </label>

              <input
                type="date"
                value={
                  form.due_date
                }
                onChange={(event) =>
                  updateField(
                    'due_date',
                    event.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* Priority */}
            <div>
              <label
                style={labelStyle}
              >
                Priority
              </label>

              <select
                value={
                  form.priority
                }
                onChange={(event) =>
                  updateField(
                    'priority',
                    event.target.value
                  )
                }
                style={selectStyle}
              >
                {priorities.map(
                  (priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {priority}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Description */}
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
                  event.target.value
                )
              }
              placeholder="Add notes or details..."
              rows={4}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
            />
          </div>

          {/* Form Actions */}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent:
                'flex-end',
              gap: '10px',
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
                border:
                  '1px solid #334155',
                borderRadius: '9px',
                padding:
                  '11px 20px',
                background:
                  'transparent',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                border: 'none',
                borderRadius: '9px',
                padding:
                  '11px 20px',
                background: saving
                  ? '#4c1d95'
                  : '#7c3aed',
                color: '#ffffff',
                fontWeight: 600,
                cursor: saving
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {saving
                ? 'Saving...'
                : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <SummaryCard
          title="Total Tasks"
          value={totalTasks}
          icon="📋"
          onClick={() =>
            setFilter('all')
          }
          active={
            filter === 'all'
          }
        />

        <SummaryCard
          title="Pending"
          value={
            pendingTasks.length
          }
          icon="⏳"
          onClick={() =>
            setFilter('pending')
          }
          active={
            filter === 'pending'
          }
        />

        <SummaryCard
          title="Completed"
          value={
            completedTasks.length
          }
          icon="✅"
          onClick={() =>
            setFilter('completed')
          }
          active={
            filter === 'completed'
          }
        />

        <SummaryCard
          title="Overdue"
          value={
            overdueTasks.length
          }
          icon="⚠️"
          onClick={() =>
            setFilter('overdue')
          }
          active={
            filter === 'overdue'
          }
        />
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <FilterButton
          label={`All (${totalTasks})`}
          active={
            filter === 'all'
          }
          onClick={() =>
            setFilter('all')
          }
        />

        <FilterButton
          label={`Pending (${pendingTasks.length})`}
          active={
            filter === 'pending'
          }
          onClick={() =>
            setFilter('pending')
          }
        />

        <FilterButton
          label={`Overdue (${overdueTasks.length})`}
          active={
            filter === 'overdue'
          }
          onClick={() =>
            setFilter('overdue')
          }
        />

        <FilterButton
          label={`Completed (${completedTasks.length})`}
          active={
            filter === 'completed'
          }
          onClick={() =>
            setFilter('completed')
          }
        />
      </div>

      {/* Tasks */}
      <div
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '14px',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              borderRadius: '14px',
              background: '#111827',
              color: '#94a3b8',
            }}
          >
            Loading tasks...
          </div>
        ) : filteredTasks.length ===
          0 ? (
          <div
            style={{
              padding:
                '50px 20px',
              textAlign: 'center',
              borderRadius: '14px',
              background: '#111827',
              border:
                '1px solid #1e293b',
            }}
          >
            <div
              style={{
                fontSize: '38px',
                marginBottom: '12px',
              }}
            >
              📋
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: '18px',
              }}
            >
              No tasks found
            </h3>

            <p
              style={{
                marginTop: '8px',
                marginBottom: 0,
                color: '#64748b',
              }}
            >
              {filter === 'all'
                ? 'Create your first task to get started.'
                : `There are no ${filter} tasks.`}
            </p>
          </div>
        ) : (
          filteredTasks.map(
            (task) => {
              const overdue =
                isOverdue(task)

              const priorityColors =
                getPriorityColor(
                  task.priority
                )

              const assignedEmployee =
                getEmployee(
                  task.assigned_to
                )

              return (
                <div
                  key={task.id}
                  style={{
                    padding: '20px',
                    borderRadius:
                      '14px',
                    background:
                      '#111827',
                    border: overdue
                      ? '1px solid #7f1d1d'
                      : '1px solid #1e293b',
                    opacity:
                      task.completed
                        ? 0.72
                        : 1,
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
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        gap: '14px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleTask(
                            task
                          )
                        }
                        aria-label={
                          task.completed
                            ? 'Mark task as pending'
                            : 'Mark task as completed'
                        }
                        style={{
                          flexShrink: 0,
                          width: '24px',
                          height: '24px',
                          marginTop:
                            '2px',
                          borderRadius:
                            '6px',
                          border:
                            task.completed
                              ? '1px solid #22c55e'
                              : '1px solid #475569',
                          background:
                            task.completed
                              ? '#166534'
                              : 'transparent',
                          color:
                            '#ffffff',
                          cursor:
                            'pointer',
                          fontSize:
                            '14px',
                        }}
                      >
                        {task.completed
                          ? '✓'
                          : ''}
                      </button>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {/* Title + Priority */}
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
                              fontWeight:
                                600,
                              textDecoration:
                                task.completed
                                  ? 'line-through'
                                  : 'none',
                              color:
                                task.completed
                                  ? '#94a3b8'
                                  : '#f8fafc',
                            }}
                          >
                            {
                              task.title
                            }
                          </h3>

                          <span
                            style={{
                              padding:
                                '4px 9px',
                              borderRadius:
                                '999px',
                              fontSize:
                                '12px',
                              fontWeight:
                                600,
                              background:
                                priorityColors.background,
                              color:
                                priorityColors.color,
                              border:
                                `1px solid ${priorityColors.border}`,
                            }}
                          >
                            {
                              task.priority
                            }
                          </span>

                          {task.completed && (
                            <span
                              style={{
                                padding:
                                  '4px 9px',
                                borderRadius:
                                  '999px',
                                background:
                                  '#142b20',
                                color:
                                  '#4ade80',
                                border:
                                  '1px solid #166534',
                                fontSize:
                                  '12px',
                                fontWeight:
                                  600,
                              }}
                            >
                              Completed
                            </span>
                          )}

                          {!task.completed &&
                            overdue && (
                              <span
                                style={{
                                  padding:
                                    '4px 9px',
                                  borderRadius:
                                    '999px',
                                  background:
                                    '#3f1515',
                                  color:
                                    '#f87171',
                                  border:
                                    '1px solid #7f1d1d',
                                  fontSize:
                                    '12px',
                                  fontWeight:
                                    600,
                                }}
                              >
                                Overdue
                              </span>
                            )}

                          {!task.completed &&
                            !overdue && (
                              <span
                                style={{
                                  padding:
                                    '4px 9px',
                                  borderRadius:
                                    '999px',
                                  background:
                                    '#172554',
                                  color:
                                    '#60a5fa',
                                  border:
                                    '1px solid #1e40af',
                                  fontSize:
                                    '12px',
                                  fontWeight:
                                    600,
                                }}
                              >
                                Pending
                              </span>
                            )}
                        </div>

                        {/* Assigned Employee */}
                        <div
                          style={{
                            marginTop:
                              '12px',
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: '9px',
                            color:
                              '#cbd5e1',
                            fontSize:
                              '14px',
                          }}
                        >
                          <div
                            style={{
                              width:
                                '28px',
                              height:
                                '28px',
                              flexShrink: 0,
                              borderRadius:
                                '50%',
                              display:
                                'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'center',
                              background:
                                assignedEmployee
                                  ? 'linear-gradient(135deg, #7c3aed, #4c1d95)'
                                  : '#1e293b',
                              color:
                                '#ffffff',
                              fontSize:
                                '12px',
                              fontWeight:
                                700,
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
                            <span
                              style={{
                                color:
                                  '#64748b',
                                fontSize:
                                  '12px',
                                marginRight:
                                  '5px',
                              }}
                            >
                              Assigned to
                            </span>

                            <span
                              style={{
                                color:
                                  assignedEmployee
                                    ? '#e2e8f0'
                                    : '#64748b',
                                fontWeight:
                                  600,
                              }}
                            >
                              {assignedEmployee
                                ? assignedEmployee.user_id ===
                                  userId
                                  ? 'You'
                                  : assignedEmployee.full_name
                                : 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* Lead */}
                        {task.leads && (
                          <div
                            style={{
                              marginTop:
                                '10px',
                              color:
                                '#cbd5e1',
                              fontSize:
                                '14px',
                            }}
                          >
                            👤{' '}
                            {task.leads
                              .contacts
                              ? `${task.leads.contacts.first_name} ${
                                  task.leads.contacts.last_name ||
                                  ''
                                }`.trim()
                              : 'No contact'}
                            {' • '}
                            🏢{' '}
                            {task.leads
                              .companies
                              ?.name ||
                              'No company'}
                          </div>
                        )}

                        {/* Description */}
                        {task.description && (
                          <p
                            style={{
                              marginTop:
                                '10px',
                              marginBottom:
                                0,
                              color:
                                '#94a3b8',
                              fontSize:
                                '14px',
                              lineHeight:
                                1.6,
                            }}
                          >
                            {
                              task.description
                            }
                          </p>
                        )}

                        {/* Due Date */}
                        <div
                          style={{
                            marginTop:
                              '12px',
                            color:
                              overdue
                                ? '#f87171'
                                : '#94a3b8',
                            fontSize:
                              '13px',
                            fontWeight:
                              overdue
                                ? 600
                                : 400,
                          }}
                        >
                          📅{' '}
                          {task.due_date
                            ? `Due ${formatDueDate(
                                task.due_date
                              )}`
                            : 'No due date'}
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteTask(
                          task.id
                        )
                      }
                      style={{
                        flexShrink: 0,
                        border:
                          '1px solid #334155',
                        borderRadius:
                          '8px',
                        padding:
                          '8px 12px',
                        background:
                          '#1e293b',
                        color:
                          '#f87171',
                        cursor:
                          'pointer',
                        fontSize:
                          '13px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            }
          )
        )}
      </div>
    </div>
  )
}

/*
 * Summary Card
 */
function SummaryCard({
  title,
  value,
  icon,
  onClick,
  active,
}: {
  title: string
  value: number
  icon: string
  onClick: () => void
  active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '20px',
        borderRadius: '14px',
        background: active
          ? '#1e1b4b'
          : '#111827',
        border: active
          ? '1px solid #7c3aed'
          : '1px solid #1e293b',
        color: '#ffffff',
        cursor: 'pointer',
        transition: '0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: '#94a3b8',
            fontSize: '13px',
          }}
        >
          {title}
        </span>

        <span
          style={{
            fontSize: '20px',
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '30px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </button>
  )
}

/*
 * Filter Button
 */
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active
          ? '1px solid #7c3aed'
          : '1px solid #334155',
        borderRadius: '9px',
        padding: '9px 14px',
        background: active
          ? '#1e1b4b'
          : '#111827',
        color: active
          ? '#c4b5fd'
          : '#94a3b8',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  )
}

/*
 * Shared styles
 */
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  color: '#cbd5e1',
  fontSize: '13px',
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
  fontSize: '14px',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#f8fafc',
  outline: 'none',
  fontSize: '14px',
}

