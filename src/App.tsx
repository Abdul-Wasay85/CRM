  import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    Link,
  } from 'react-router-dom'
  import { useEffect, useState } from 'react'

  import Register from './pages/Register'
  import Login from './pages/Login'
  import ProtectedRoute from './components/ProtectedRoute'

  import { supabase } from './lib/supabase'

  import Companies from './pages/Companies'
  import Contacts from './pages/Contacts'
  import Leads from './pages/Leads'
  import Deals from './pages/Deals'
  import Activities from './pages/Activities'
  import Tasks from './pages/Tasks'
  import Employees from './pages/Employees'
  import Messages from './pages/Messages'
  import AppShell from './components/AppShell'
  import TeamAlerts from './pages/TeamAlerts'
  import TeamAlertDetails from './pages/TeamAlertDetails'
  import {
    OrganizationProvider,
    useOrganization,
  } from './context/OrganizationContext'
  import ForgotPassword from './pages/ForgotPassword'
  import ResetPassword from './pages/ResetPassword'

  type DashboardStats = {
    companies: number
    contacts: number
    leads: number
    deals: number
    tasks: number
    pipelineValue: number
    wonValue: number
    overdueTasks: number
  }

  type LeadStatus = {
    status: string
    count: number
  }

  type DealStage = {
    stage: string
    count: number
    value: number
  }

  type RecentActivity = {
    id: string
    type: string
    description: string | null
    created_at: string
    leads?: {
      companies?: {
        name: string
      } | null
      contacts?: {
        first_name: string
        last_name: string | null
      } | null
    } | null
  }

  function Dashboard() {
    const {
      organizationId,
      organizationName,
    } = useOrganization()

    const [stats, setStats] =
      useState<DashboardStats>({
        companies: 0,
        contacts: 0,
        leads: 0,
        deals: 0,
        tasks: 0,
        pipelineValue: 0,
        wonValue: 0,
        overdueTasks: 0,
      })

    const [leadStatuses, setLeadStatuses] =
      useState<LeadStatus[]>([])

    const [dealStages, setDealStages] =
      useState<DealStage[]>([])

    const [recentActivities, setRecentActivities] =
      useState<RecentActivity[]>([])

    const [loading, setLoading] =
      useState(true)

    const [error, setError] =
      useState('')

    useEffect(() => {
      if (!organizationId) {
        setLoading(false)
        return
      }

      async function loadDashboard() {
        try {
          setLoading(true)
          setError('')

          const [
            companiesResult,
            contactsResult,
            leadsResult,
            dealsResult,
            tasksResult,
            overdueTasksResult,
            leadDataResult,
            dealDataResult,
            activitiesResult,
          ] = await Promise.all([
            supabase
              .from('companies')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('contacts')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('leads')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('deals')
              .select(
                'id, stage, value',
                {
                  count: 'exact',
                }
              )
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('tasks')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('tasks')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq(
                'organization_id',
                organizationId
              )
              .eq('completed', false)
              .lt(
                'due_date',
                new Date()
                  .toISOString()
                  .split('T')[0]
              ),

            supabase
              .from('leads')
              .select('status')
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('deals')
              .select('stage, value')
              .eq(
                'organization_id',
                organizationId
              ),

            supabase
              .from('activities')
              .select(`
                id,
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
              .eq(
                'organization_id',
                organizationId
              )
              .order('created_at', {
                ascending: false,
              })
              .limit(8),
          ])

          const results = [
            companiesResult,
            contactsResult,
            leadsResult,
            dealsResult,
            tasksResult,
            overdueTasksResult,
            leadDataResult,
            dealDataResult,
            activitiesResult,
          ]

          const failedResult = results.find(
            (result) => result.error
          )

          if (failedResult?.error) {
            throw failedResult.error
          }

          /*
          * -----------------------------------------
          * DEAL REVENUE
          * -----------------------------------------
          */

          const deals =
            (dealsResult.data || []) as Array<{
              stage: string
              value: number | null
            }>

          const pipelineValue =
            deals.reduce(
              (total, deal) =>
                total +
                Number(deal.value || 0),
              0
            )

          const wonValue =
            deals
              .filter(
                (deal) =>
                  deal.stage === 'Won'
              )
              .reduce(
                (total, deal) =>
                  total +
                  Number(deal.value || 0),
                0
              )

          /*
          * -----------------------------------------
          * LEAD STATUS BREAKDOWN
          * -----------------------------------------
          */

          const leadRows =
            (leadDataResult.data || []) as Array<{
              status: string
            }>

          const leadStatusMap: Record<
            string,
            number
          > = {}

          leadRows.forEach((lead) => {
            const status =
              lead.status || 'Unknown'

            leadStatusMap[status] =
              (leadStatusMap[status] || 0) +
              1
          })

          const leadStatusOrder = [
            'New',
            'Contacted',
            'Qualified',
            'Proposal',
            'Negotiation',
            'Won',
            'Lost',
          ]

          const orderedLeadStatuses =
            leadStatusOrder
              .filter(
                (status) =>
                  leadStatusMap[status] !==
                  undefined
              )
              .map((status) => ({
                status,
                count:
                  leadStatusMap[status],
              }))

          const unknownLeadStatuses =
            Object.entries(
              leadStatusMap
            )
              .filter(
                ([status]) =>
                  !leadStatusOrder.includes(
                    status
                  )
              )
              .map(
                ([status, count]) => ({
                  status,
                  count,
                })
              )

          setLeadStatuses([
            ...orderedLeadStatuses,
            ...unknownLeadStatuses,
          ])

          /*
          * -----------------------------------------
          * DEAL STAGE BREAKDOWN
          * -----------------------------------------
          */

          const dealRows =
            (dealDataResult.data || []) as Array<{
              stage: string
              value: number | null
            }>

          const dealStageMap: Record<
            string,
            {
              count: number
              value: number
            }
          > = {}

          dealRows.forEach((deal) => {
            const stage =
              deal.stage || 'Unknown'

            if (!dealStageMap[stage]) {
              dealStageMap[stage] = {
                count: 0,
                value: 0,
              }
            }

            dealStageMap[stage].count += 1

            dealStageMap[stage].value +=
              Number(deal.value || 0)
          })

          const dealStageOrder = [
            'Qualified',
            'Proposal',
            'Negotiation',
            'Won',
            'Lost',
          ]

          const orderedDealStages =
            dealStageOrder
              .filter(
                (stage) =>
                  dealStageMap[stage] !==
                  undefined
              )
              .map((stage) => ({
                stage,
                count:
                  dealStageMap[stage].count,
                value:
                  dealStageMap[stage].value,
              }))

          const unknownDealStages =
            Object.entries(
              dealStageMap
            )
              .filter(
                ([stage]) =>
                  !dealStageOrder.includes(
                    stage
                  )
              )
              .map(
                ([stage, data]) => ({
                  stage,
                  count: data.count,
                  value: data.value,
                })
              )

          setDealStages([
            ...orderedDealStages,
            ...unknownDealStages,
          ])

          /*
          * -----------------------------------------
          * RECENT ACTIVITIES
          * -----------------------------------------
          */

          setRecentActivities(
            (activitiesResult.data ||
              []) as RecentActivity[]
          )

          /*
          * -----------------------------------------
          * DASHBOARD STATS
          * -----------------------------------------
          */

          setStats({
            companies:
              companiesResult.count || 0,

            contacts:
              contactsResult.count || 0,

            leads:
              leadsResult.count || 0,

            deals:
              dealsResult.count || 0,

            tasks:
              tasksResult.count || 0,

            pipelineValue,

            wonValue,

            overdueTasks:
              overdueTasksResult.count || 0,
          })
        } catch (err) {
          console.error(
            'Dashboard loading error:',
            err
          )

          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load dashboard.'
          )
        } finally {
          setLoading(false)
        }
      }

      loadDashboard()
    }, [organizationId])

    const formatCurrency = (
      value: number
    ) => {
      return new Intl.NumberFormat(
        'en-US',
        {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }
      ).format(value)
    }

    const formatActivityDate = (
      date: string
    ) => {
      const parsed = new Date(date)

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return ''
      }

      return parsed.toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      )
    }

    if (loading) {
      return (
        <div
          style={{
            ...styles.loadingState,
          }}
        >
          <div
            style={
              styles.loadingSpinner
            }
          />

          <h2
            style={{
              margin: 0,
              fontSize: '20px',
            }}
          >
            Loading dashboard
          </h2>

          <p
            style={{
              margin:
                '8px 0 0',
              color: '#64748b',
              fontSize: '13px',
            }}
          >
            Preparing your CRM analytics...
          </p>
        </div>
      )
    }

    if (error) {
      return (
        <div
          style={
            styles.errorPage
          }
        >
          <div
            style={
              styles.errorBox
            }
          >
            <div
              style={
                styles.errorIcon
              }
            >
              !
            </div>

            <h2
              style={{
                margin:
                  '0 0 8px',
              }}
            >
              Dashboard Error
            </h2>

            <p
              style={{
                color: '#94a3b8',
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>

            <button
              onClick={() =>
                window.location.reload()
              }
              style={
                styles.primaryButton
              }
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    const wonPercentage =
      stats.pipelineValue > 0
        ? Math.min(
            Math.round(
              (stats.wonValue /
                stats.pipelineValue) *
                100
            ),
            100
          )
        : 0

    return (
      <div style={styles.page}>
        <main style={styles.container}>

          {/* ----------------------------------------
              WELCOME
          ---------------------------------------- */}

          <section
            style={
              styles.welcomeSection
            }
          >
            <div>
              <span
                style={
                  styles.eyebrow
                }
              >
                {organizationName}
              </span>

              <h1
                style={
                  styles.dashboardTitle
                }
              >
                Good to see you.
              </h1>

              <p
                style={
                  styles.dashboardSubtitle
                }
              >
                Here's what's happening
                across your CRM today.
              </p>
            </div>

            <div
              style={
                styles.liveBadge
              }
            >
              <span
                style={
                  styles.liveDot
                }
              />

              Live CRM
            </div>
          </section>

          {/* ----------------------------------------
              TOP STATS
          ---------------------------------------- */}

          <div style={styles.grid}>
            <StatCard
              title="Companies"
              value={stats.companies}
              icon="🏢"
              to="/companies"
            />

            <StatCard
              title="Contacts"
              value={stats.contacts}
              icon="👥"
              to="/contacts"
            />

            <StatCard
              title="Leads"
              value={stats.leads}
              icon="🎯"
              to="/leads"
            />

            <StatCard
              title="Deals"
              value={stats.deals}
              icon="💼"
              to="/deals"
            />

            <StatCard
              title="Tasks"
              value={stats.tasks}
              icon="📋"
              to="/tasks"
            />
          </div>

          {/* ----------------------------------------
              REVENUE STATS
          ---------------------------------------- */}

          <div
            style={{
              ...styles.grid,
              marginTop: '18px',
            }}
          >
            <MetricCard
              title="Total Pipeline"
              value={formatCurrency(
                stats.pipelineValue
              )}
              icon="💰"
            />

            <MetricCard
              title="Won Revenue"
              value={formatCurrency(
                stats.wonValue
              )}
              icon="🏆"
            />

            <MetricCard
              title="Overdue Tasks"
              value={stats.overdueTasks}
              icon="⚠️"
              danger={
                stats.overdueTasks > 0
              }
              to="/tasks"
            />
          </div>

          {/* ----------------------------------------
              QUICK ACTIONS
          ---------------------------------------- */}

          <section
            style={
              styles.section
            }
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Quick Actions
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Jump directly into
                  your CRM workflow.
                </p>
              </div>
            </div>

            <div
              style={
                styles.quickActions
              }
            >
              <QuickAction
                title="Add Company"
                description="Create a new company"
                to="/companies"
                icon="🏢"
              />

              <QuickAction
                title="Add Contact"
                description="Create a new contact"
                to="/contacts"
                icon="👤"
              />

              <QuickAction
                title="Add Lead"
                description="Create a new lead"
                to="/leads"
                icon="🎯"
              />

              <QuickAction
                title="Manage Deals"
                description="View your pipeline"
                to="/deals"
                icon="💼"
              />

              <QuickAction
                title="Follow-ups"
                description="Manage your tasks"
                to="/tasks"
                icon="📋"
              />
            </div>
          </section>

          {/* ----------------------------------------
              SALES ANALYTICS
          ---------------------------------------- */}

          <section
            style={
              styles.section
            }
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Sales Analytics
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Understand your leads,
                  deals and revenue at a
                  glance.
                </p>
              </div>
            </div>

            <div
              style={
                styles.analyticsGrid
              }
            >

              {/* LEAD PIPELINE */}

              <section
                style={
                  styles.panel
                }
              >
                <div
                  style={
                    styles.panelHeader
                  }
                >
                  <div>
                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Lead Pipeline
                    </h2>

                    <p
                      style={
                        styles.panelSubtitle
                      }
                    >
                      Distribution of
                      leads by status
                    </p>
                  </div>

                  <Link
                    to="/leads"
                    style={
                      styles.viewLink
                    }
                  >
                    View Leads →
                  </Link>
                </div>

                {leadStatuses.length ===
                0 ? (
                  <EmptyState
                    text="No leads yet."
                  />
                ) : (
                  <BarChart
                    items={leadStatuses.map(
                      (item) => ({
                        label:
                          item.status,
                        value:
                          item.count,
                      })
                    )}
                  />
                )}
              </section>

              {/* DEAL PIPELINE */}

              <section
                style={
                  styles.panel
                }
              >
                <div
                  style={
                    styles.panelHeader
                  }
                >
                  <div>
                    <h2
                      style={
                        styles.panelTitle
                      }
                    >
                      Deal Pipeline
                    </h2>

                    <p
                      style={
                        styles.panelSubtitle
                      }
                    >
                      Deals currently
                      sitting at each
                      stage
                    </p>
                  </div>

                  <Link
                    to="/deals"
                    style={
                      styles.viewLink
                    }
                  >
                    View Deals →
                  </Link>
                </div>

                {dealStages.length ===
                0 ? (
                  <EmptyState
                    text="No deals yet."
                  />
                ) : (
                  <BarChart
                    items={dealStages.map(
                      (item) => ({
                        label:
                          item.stage,
                        value:
                          item.count,
                      })
                    )}
                  />
                )}
              </section>
            </div>

            {/* REVENUE OVERVIEW */}

            <section
              style={{
                ...styles.panel,
                marginTop: '20px',
              }}
            >
              <div
                style={
                  styles.panelHeader
                }
              >
                <div>
                  <h2
                    style={
                      styles.panelTitle
                    }
                  >
                    Revenue Overview
                  </h2>

                  <p
                    style={
                      styles.panelSubtitle
                    }
                  >
                    Pipeline value compared
                    with closed-won revenue
                  </p>
                </div>

                <Link
                  to="/deals"
                  style={
                    styles.viewLink
                  }
                >
                  Open Pipeline →
                </Link>
              </div>

              <div
                style={
                  styles.revenueGrid
                }
              >

                {/* PIPELINE */}

                <div>
                  <div
                    style={
                      styles.revenueTop
                    }
                  >
                    <span
                      style={
                        styles.revenueLabel
                      }
                    >
                      Total Pipeline
                    </span>

                    <strong
                      style={
                        styles.revenueValue
                      }
                    >
                      {formatCurrency(
                        stats.pipelineValue
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.revenueTrack
                    }
                  >
                    <div
                      style={{
                        ...styles.revenuePipelineBar,
                        width:
                          stats.pipelineValue >
                          0
                            ? '100%'
                            : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* WON */}

                <div>
                  <div
                    style={
                      styles.revenueTop
                    }
                  >
                    <span
                      style={
                        styles.revenueLabel
                      }
                    >
                      Won Revenue
                    </span>

                    <strong
                      style={
                        styles.revenueWonValue
                      }
                    >
                      {formatCurrency(
                        stats.wonValue
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.revenueTrack
                    }
                  >
                    <div
                      style={{
                        ...styles.revenueWonBar,
                        width: `${wonPercentage}%`,
                        minWidth:
                          stats.wonValue >
                          0
                            ? '6px'
                            : '0',
                      }}
                    />
                  </div>

                  <p
                    style={
                      styles.revenueHint
                    }
                  >
                    {stats.pipelineValue >
                    0
                      ? `${wonPercentage}% of pipeline value is won`
                      : 'No pipeline value yet'}
                  </p>
                </div>
              </div>
            </section>
          </section>

          {/* ----------------------------------------
              RECENT ACTIVITIES
          ---------------------------------------- */}

          <section
            style={
              styles.section
            }
          >
            <div
              style={
                styles.panel
              }
            >
              <div
                style={
                  styles.panelHeader
                }
              >
                <div>
                  <h2
                    style={
                      styles.panelTitle
                    }
                  >
                    Recent Activities
                  </h2>

                  <p
                    style={
                      styles.panelSubtitle
                    }
                  >
                    Latest CRM activity
                  </p>
                </div>

                <Link
                  to="/activities"
                  style={
                    styles.viewLink
                  }
                >
                  View Activities →
                </Link>
              </div>

              {recentActivities.length ===
              0 ? (
                <EmptyState
                  text="No activities yet."
                />
              ) : (
                <div>
                  {recentActivities.map(
                    (activity) => {
                      const contactName =
                        activity
                          .leads
                          ?.contacts
                          ? `${activity.leads.contacts.first_name} ${
                              activity.leads.contacts.last_name ||
                              ''
                            }`.trim()
                          : ''

                      const companyName =
                        activity
                          .leads
                          ?.companies
                          ?.name || ''

                      return (
                        <div
                          key={
                            activity.id
                          }
                          style={
                            styles.activityItem
                          }
                        >
                          <div
                            style={
                              styles.activityIcon
                            }
                          >
                            {getActivityIcon(
                              activity.type
                            )}
                          </div>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={
                                styles.activityTop
                              }
                            >
                              <strong
                                style={{
                                  textTransform:
                                    'capitalize',
                                }}
                              >
                                {
                                  activity.type
                                }
                              </strong>

                              <span
                                style={{
                                  color:
                                    '#64748b',
                                  fontSize:
                                    '12px',
                                }}
                              >
                                {formatActivityDate(
                                  activity.created_at
                                )}
                              </span>
                            </div>

                            {activity.description && (
                              <p
                                style={{
                                  margin:
                                    '5px 0 0',
                                  color:
                                    '#cbd5e1',
                                  lineHeight:
                                    1.5,
                                }}
                              >
                                {
                                  activity.description
                                }
                              </p>
                            )}

                            {(contactName ||
                              companyName) && (
                              <div
                                style={{
                                  marginTop:
                                    '5px',
                                  color:
                                    '#64748b',
                                  fontSize:
                                    '12px',
                                }}
                              >
                                {
                                  contactName
                                }

                                {contactName &&
                                  companyName &&
                                  ' • '}

                                {
                                  companyName
                                }
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
          </section>

          {/* ----------------------------------------
              DATABASE STATUS
          ---------------------------------------- */}

          <section
            style={
              styles.statusSection
            }
          >
            <div
              style={
                styles.status
              }
            >
              <span
                style={
                  styles.statusDot
                }
              />

              Database connected

              <span
                style={{
                  marginLeft:
                    'auto',
                  color:
                    '#64748b',
                  fontSize:
                    '12px',
                }}
              >
                Organization secured
                with RLS
              </span>
            </div>
          </section>
        </main>
      </div>
    )
  }

  /*
  * --------------------------------------------
  * BAR CHART
  * --------------------------------------------
  */

  function BarChart({
    items,
    valueFormatter,
  }: {
    items: {
      label: string
      value: number
    }[]
    valueFormatter?: (
      value: number
    ) => string
  }) {
    const maxValue = Math.max(
      ...items.map(
        (item) => item.value
      ),
      1
    )

    return (
      <div
        style={{
          display: 'flex',
          flexDirection:
            'column',
          gap: '18px',
        }}
      >
        {items.map((item) => {
          const percentage =
            (item.value /
              maxValue) *
            100

          return (
            <div
              key={item.label}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  marginBottom:
                    '8px',
                }}
              >
                <span
                  style={{
                    color:
                      '#cbd5e1',
                    fontSize:
                      '13px',
                    fontWeight:
                      500,
                  }}
                >
                  {item.label}
                </span>

                <strong
                  style={{
                    color:
                      '#f8fafc',
                    fontSize:
                      '13px',
                  }}
                >
                  {valueFormatter
                    ? valueFormatter(
                        item.value
                      )
                    : item.value}
                </strong>
              </div>

              <div
                style={{
                  height:
                    '10px',
                  width:
                    '100%',
                  background:
                    '#172033',
                  borderRadius:
                    '999px',
                  overflow:
                    'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      percentage,
                      item.value >
                        0
                        ? 4
                        : 0
                    )}%`,
                    height:
                      '100%',
                    borderRadius:
                      '999px',
                    background:
                      'linear-gradient(90deg, #6d28d9, #a78bfa)',
                    boxShadow:
                      '0 0 18px rgba(124, 58, 237, 0.35)',
                    transition:
                      'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /*
  * --------------------------------------------
  * STAT CARD
  * --------------------------------------------
  */

  function StatCard({
    title,
    value,
    icon,
    to,
  }: {
    title: string
    value: number
    icon: string
    to: string
  }) {
    return (
      <Link
        to={to}
        style={{
          ...styles.card,
          textDecoration:
            'none',
        }}
      >
        <div
          style={
            styles.cardTop
          }
        >
          <p
            style={
              styles.cardTitle
            }
          >
            {title}
          </p>

          <span
            style={
              styles.cardIcon
            }
          >
            {icon}
          </span>
        </div>

        <h2
          style={
            styles.cardValue
          }
        >
          {value}
        </h2>

        <span
          style={
            styles.cardLink
          }
        >
          Open →
        </span>
      </Link>
    )
  }

  /*
  * --------------------------------------------
  * METRIC CARD
  * --------------------------------------------
  */

  function MetricCard({
    title,
    value,
    icon,
    danger = false,
    to,
  }: {
    title: string
    value: string | number
    icon: string
    danger?: boolean
    to?: string
  }) {
    const content = (
      <div
        style={{
          ...styles.metricCard,
          borderColor:
            danger
              ? 'rgba(239, 68, 68, 0.35)'
              : 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={
            styles.cardTop
          }
        >
          <p
            style={
              styles.cardTitle
            }
          >
            {title}
          </p>

          <span
            style={
              styles.cardIcon
            }
          >
            {icon}
          </span>
        </div>

        <h2
          style={{
            ...styles.metricValue,
            color: danger
              ? '#f87171'
              : '#f8fafc',
          }}
        >
          {value}
        </h2>
      </div>
    )

    if (to) {
      return (
        <Link
          to={to}
          style={{
            textDecoration:
              'none',
          }}
        >
          {content}
        </Link>
      )
    }

    return content
  }

  /*
  * --------------------------------------------
  * QUICK ACTION
  * --------------------------------------------
  */

  function QuickAction({
    title,
    description,
    to,
    icon,
  }: {
    title: string
    description: string
    to: string
    icon: string
  }) {
    return (
      <Link
        to={to}
        style={{
          ...styles.quickAction,
          textDecoration:
            'none',
        }}
      >
        <span
          style={{
            width: '42px',
            height: '42px',
            borderRadius:
              '12px',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            background:
              'rgba(124, 58, 237, 0.10)',
            border:
              '1px solid rgba(139, 92, 246, 0.15)',
            fontSize:
              '21px',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>

        <div>
          <strong
            style={{
              display:
                'block',
              color:
                '#f8fafc',
            }}
          >
            {title}
          </strong>

          <span
            style={{
              display:
                'block',
              marginTop:
                '3px',
              color:
                '#64748b',
              fontSize:
                '12px',
            }}
          >
            {description}
          </span>
        </div>
      </Link>
    )
  }

  /*
  * --------------------------------------------
  * EMPTY STATE
  * --------------------------------------------
  */

  function EmptyState({
    text,
  }: {
    text: string
  }) {
    return (
      <div
        style={
          styles.emptyState
        }
      >
        {text}
      </div>
    )
  }

  /*
  * --------------------------------------------
  * ACTIVITY ICON
  * --------------------------------------------
  */

  function getActivityIcon(
    type: string
  ) {
    switch (
      type.toLowerCase()
    ) {
      case 'call':
        return '📞'

      case 'email':
        return '✉️'

      case 'meeting':
        return '🤝'

      case 'follow-up':
        return '🔄'

      case 'note':
        return '📝'

      default:
        return '📌'
    }
  }

  /*
  * --------------------------------------------
  * APP ROUTES
  * --------------------------------------------
  */

  function App() {
    return (
      <BrowserRouter>
        <Routes>
          {/* ------------------------------------
              PUBLIC ROUTES
          ------------------------------------ */}

          <Route
            path="/login"
            element={
              <Login />
            }
          />

          <Route
            path="/register"
            element={
              <Register />
            }
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* ------------------------------------
              PROTECTED ROUTES
          ------------------------------------ */}

          <Route
            element={
              <ProtectedRoute />
            }
          >
            {/* ----------------------------------
                ORGANIZATION PROVIDER
            ---------------------------------- */}

            <Route
              element={
                <OrganizationProvider>
                  <AppShell />
                </OrganizationProvider>
              }
            >
              <Route
                path="/"
                element={
                  <Dashboard />
                }
              />

              <Route
                path="/companies"
                element={
                  <Companies />
                }
              />

              <Route
                path="/contacts"
                element={
                  <Contacts />
                }
              />

              <Route
                path="/leads"
                element={
                  <Leads />
                }
              />

              <Route
                path="/deals"
                element={
                  <Deals />
                }
              />

              <Route
                path="/activities"
                element={
                  <Activities />
                }
              />

              <Route
                path="/tasks"
                element={
                  <Tasks />
                }
              />

              <Route
                path="/messages"
                element={<Messages />}
              />

              <Route
                path="/team-alerts"
                element={<TeamAlerts />}
              />

              <Route
                path="/team-alerts/:alertId"
                element={<TeamAlertDetails />}
              />

              {/* EMPLOYEES MUST BE INSIDE
                  OrganizationProvider */}

              <Route
                path="/employees"
                element={
                  <Employees />
                }
              />
            </Route>
          </Route>

          {/* ------------------------------------
              FALLBACK
          ------------------------------------ */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
    )
  }

  /*
  * --------------------------------------------
  * STYLES
  * --------------------------------------------
  */

  const styles = {
    page: {
      minHeight:
        '100%',
      color:
        '#f8fafc',
    },

    container: {
      width:
        '100%',
      maxWidth:
        '1500px',
      margin:
        '0 auto',
    },

    welcomeSection: {
      display:
        'flex',
      justifyContent:
        'space-between',
      alignItems:
        'flex-end',
      gap:
        '20px',
      marginBottom:
        '28px',
      flexWrap:
        'wrap' as const,
    },

    eyebrow: {
      display:
        'inline-block',
      marginBottom:
        '7px',
      color:
        '#a78bfa',
      fontSize:
        '12px',
      fontWeight:
        600,
      letterSpacing:
        '0.08em',
      textTransform:
        'uppercase' as const,
    },

    dashboardTitle: {
      margin: 0,
      fontSize:
        '32px',
      lineHeight:
        1.15,
      fontWeight:
        750,
      letterSpacing:
        '-0.8px',
      color:
        '#f8fafc',
    },

    dashboardSubtitle: {
      margin:
        '8px 0 0',
      color:
        '#64748b',
      fontSize:
        '14px',
    },

    liveBadge: {
      display:
        'inline-flex',
      alignItems:
        'center',
      gap:
        '8px',
      padding:
        '8px 12px',
      borderRadius:
        '999px',
      background:
        'rgba(34, 197, 94, 0.07)',
      border:
        '1px solid rgba(34, 197, 94, 0.16)',
      color:
        '#86efac',
      fontSize:
        '12px',
      fontWeight:
        600,
    },

    liveDot: {
      width:
        '7px',
      height:
        '7px',
      borderRadius:
        '50%',
      background:
        '#22c55e',
      boxShadow:
        '0 0 10px rgba(34, 197, 94, 0.65)',
    },

    grid: {
      display:
        'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(180px, 1fr))',
      gap:
        '16px',
    },

    card: {
      background:
        'rgba(15, 23, 42, 0.72)',
      border:
        '1px solid rgba(255,255,255,0.07)',
      borderRadius:
        '16px',
      padding:
        '20px',
      display:
        'block',
      boxShadow:
        '0 18px 45px rgba(0,0,0,0.12)',
      transition:
        'transform 0.2s ease, border-color 0.2s ease',
    },

    metricCard: {
      background:
        'rgba(15, 23, 42, 0.72)',
      border:
        '1px solid rgba(255,255,255,0.07)',
      borderRadius:
        '16px',
      padding:
        '20px',
      display:
        'block',
      boxShadow:
        '0 18px 45px rgba(0,0,0,0.12)',
    },

    cardTop: {
      display:
        'flex',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    cardTitle: {
      margin:
        0,
      color:
        '#94a3b8',
      fontSize:
        '13px',
      fontWeight:
        500,
    },

    cardIcon: {
      fontSize:
        '21px',
    },

    cardValue: {
      margin:
        '12px 0 5px',
      fontSize:
        '32px',
      lineHeight:
        1,
      color:
        '#f8fafc',
    },

    metricValue: {
      margin:
        '13px 0 0',
      fontSize:
        '27px',
      lineHeight:
        1,
    },

    cardLink: {
      color:
        '#a78bfa',
      fontSize:
        '12px',
      fontWeight:
        500,
    },

    section: {
      marginTop:
        '30px',
    },

    sectionHeader: {
      marginBottom:
        '16px',
    },

    sectionTitle: {
      margin:
        0,
      fontSize:
        '19px',
      fontWeight:
        650,
    },

    sectionSubtitle: {
      margin:
        '5px 0 0',
      color:
        '#64748b',
      fontSize:
        '13px',
    },

    quickActions: {
      display:
        'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(200px, 1fr))',
      gap:
        '12px',
    },

    quickAction: {
      padding:
        '15px',
      borderRadius:
        '14px',
      border:
        '1px solid rgba(255,255,255,0.07)',
      background:
        'rgba(15, 23, 42, 0.60)',
      display:
        'flex',
      alignItems:
        'center',
      gap:
        '12px',
      transition:
        'transform 0.2s ease, border-color 0.2s ease',
    },

    analyticsGrid: {
      display:
        'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(350px, 1fr))',
      gap:
        '20px',
    },

    panel: {
      background:
        'rgba(15, 23, 42, 0.72)',
      border:
        '1px solid rgba(255,255,255,0.07)',
      borderRadius:
        '17px',
      padding:
        '22px',
      boxShadow:
        '0 20px 50px rgba(0,0,0,0.14)',
    },

    panelHeader: {
      display:
        'flex',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap:
        '15px',
      marginBottom:
        '22px',
    },

    panelTitle: {
      margin:
        0,
      fontSize:
        '17px',
      fontWeight:
        650,
    },

    panelSubtitle: {
      margin:
        '5px 0 0',
      color:
        '#64748b',
      fontSize:
        '12px',
    },

    viewLink: {
      color:
        '#a78bfa',
      textDecoration:
        'none',
      fontSize:
        '12px',
      fontWeight:
        500,
      whiteSpace:
        'nowrap' as const,
    },

    revenueGrid: {
      display:
        'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(240px, 1fr))',
      gap:
        '26px',
    },

    revenueTop: {
      display:
        'flex',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap:
        '12px',
      marginBottom:
        '10px',
    },

    revenueLabel: {
      color:
        '#94a3b8',
      fontSize:
        '13px',
    },

    revenueValue: {
      color:
        '#f8fafc',
      fontSize:
        '14px',
    },

    revenueWonValue: {
      color:
        '#4ade80',
      fontSize:
        '14px',
    },

    revenueTrack: {
      height:
        '13px',
      borderRadius:
        '999px',
      background:
        '#172033',
      overflow:
        'hidden',
    },

    revenuePipelineBar: {
      height:
        '100%',
      borderRadius:
        '999px',
      background:
        'linear-gradient(90deg, #6d28d9, #a78bfa)',
      boxShadow:
        '0 0 20px rgba(124,58,237,0.3)',
      transition:
        'width 0.6s ease',
    },

    revenueWonBar: {
      height:
        '100%',
      borderRadius:
        '999px',
      background:
        'linear-gradient(90deg, #15803d, #22c55e)',
      boxShadow:
        '0 0 20px rgba(34,197,94,0.25)',
      transition:
        'width 0.6s ease',
    },

    revenueHint: {
      margin:
        '9px 0 0',
      color:
        '#64748b',
      fontSize:
        '12px',
    },

    activityItem: {
      display:
        'flex',
      gap:
        '13px',
      padding:
        '15px 0',
      borderBottom:
        '1px solid rgba(255,255,255,0.06)',
    },

    activityIcon: {
      width:
        '36px',
      height:
        '36px',
      borderRadius:
        '11px',
      background:
        'rgba(124,58,237,0.10)',
      border:
        '1px solid rgba(139,92,246,0.14)',
      display:
        'flex',
      justifyContent:
        'center',
      alignItems:
        'center',
      flexShrink:
        0,
    },

    activityTop: {
      display:
        'flex',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap:
        '10px',
    },

    emptyState: {
      padding:
        '35px 10px',
      textAlign:
        'center' as const,
      color:
        '#64748b',
      fontSize:
        '13px',
    },

    statusSection: {
      marginTop:
        '30px',
      marginBottom:
        '10px',
    },

    status: {
      padding:
        '13px 16px',
      display:
        'flex',
      alignItems:
        'center',
      gap:
        '8px',
      borderRadius:
        '12px',
      background:
        'rgba(15,23,42,0.55)',
      border:
        '1px solid rgba(255,255,255,0.06)',
      color:
        '#cbd5e1',
      fontSize:
        '12px',
    },

    statusDot: {
      width:
        '7px',
      height:
        '7px',
      borderRadius:
        '50%',
      background:
        '#22c55e',
      boxShadow:
        '0 0 8px rgba(34,197,94,0.55)',
    },

    loadingState: {
      minHeight:
        '400px',
      display:
        'flex',
      flexDirection:
        'column' as const,
      alignItems:
        'center',
      justifyContent:
        'center',
      textAlign:
        'center' as const,
    },

    loadingSpinner: {
      width:
        '38px',
      height:
        '38px',
      marginBottom:
        '18px',
      borderRadius:
        '50%',
      border:
        '3px solid rgba(139,92,246,0.15)',
      borderTopColor:
        '#8b5cf6',
      animation:
        'crm-spin 0.8s linear infinite',
    },

    errorPage: {
      minHeight:
        '400px',
      display:
        'flex',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    errorBox: {
      width:
        '100%',
      maxWidth:
        '500px',
      padding:
        '30px',
      background:
        'rgba(15,23,42,0.72)',
      border:
        '1px solid rgba(239,68,68,0.2)',
      borderRadius:
        '17px',
      textAlign:
        'center' as const,
    },

    errorIcon: {
      width:
        '46px',
      height:
        '46px',
      margin:
        '0 auto 16px',
      borderRadius:
        '14px',
      display:
        'flex',
      alignItems:
        'center',
      justifyContent:
        'center',
      background:
        'rgba(239,68,68,0.1)',
      color:
        '#f87171',
      fontSize:
        '20px',
      fontWeight:
        700,
    },

    primaryButton: {
      padding:
        '10px 18px',
      borderRadius:
        '10px',
      border:
        '1px solid #8b5cf6',
      background:
        'linear-gradient(135deg, #7c3aed, #6d28d9)',
      color:
        '#ffffff',
      cursor:
        'pointer',
      fontWeight:
        600,
      boxShadow:
        '0 8px 20px rgba(124,58,237,0.2)',
    },
  }

  export default App

