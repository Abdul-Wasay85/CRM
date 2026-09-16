import { NavLink } from 'react-router-dom'
import { useOrganization } from '../context/OrganizationContext'

type NavigationItem = {
  label: string
  path: string
  icon: string
}

const mainNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: '⌂',
  },
]

const crmNavigation: NavigationItem[] = [
  {
    label: 'Companies',
    path: '/companies',
    icon: '▦',
  },
  {
    label: 'Contacts',
    path: '/contacts',
    icon: '♙',
  },
  {
    label: 'Leads',
    path: '/leads',
    icon: '◎',
  },
  {
    label: 'Deals',
    path: '/deals',
    icon: '◇',
  },
]

const workNavigation: NavigationItem[] = [
  {
    label: 'Activities',
    path: '/activities',
    icon: '◷',
  },
  {
    label: 'Tasks',
    path: '/tasks',
    icon: '✓',
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: '♟',
  },
]

const communicationNavigation: NavigationItem[] = [
  {
    label: 'Messages',
    path: '/messages',
    icon: '✉',
  },
  {
    label: 'Team Alerts',
    path: '/team-alerts',
    icon: '⚠',
  },
]

function NavigationSection({
  title,
  items,
}: {
  title: string
  items: NavigationItem[]
}) {
  return (
    <section className="crm-nav-section">
      <div className="crm-nav-section-title">
        {title}
      </div>

      <div className="crm-nav-items">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `crm-nav-link ${
                isActive
                  ? 'crm-nav-link-active'
                  : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`crm-nav-icon ${
                    isActive
                      ? 'crm-nav-icon-active'
                      : ''
                  }`}
                >
                  {item.icon}
                </span>

                <span className="crm-nav-label">
                  {item.label}
                </span>

                {isActive && (
                  <span className="crm-nav-active-dot" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </section>
  )
}

export default function Sidebar() {
  const {
    organizationName,
    role,
  } = useOrganization()

  return (
    <aside className="crm-sidebar">
      {/* =====================================================
          BRAND / WORKSPACE
      ===================================================== */}

      <div className="crm-sidebar-brand">
        <div className="crm-brand-mark">
          <span>W</span>
        </div>

        <div className="crm-brand-info">
          <div className="crm-brand-name">
            {organizationName || 'Workspace'}
          </div>

          <div className="crm-brand-role">
            {role || 'Member'}
          </div>
        </div>

        <button
          type="button"
          className="crm-workspace-button"
          title="Workspace options"
        >
          ⋮
        </button>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <nav className="crm-sidebar-nav">
        <NavigationSection
          title="Overview"
          items={mainNavigation}
        />

        <NavigationSection
          title="CRM"
          items={crmNavigation}
        />

        <NavigationSection
          title="Workspace"
          items={workNavigation}
        />

        <NavigationSection
          title="Communication"
          items={communicationNavigation}
        />
      </nav>

      {/* =====================================================
          BOTTOM
      ===================================================== */}

      <div className="crm-sidebar-bottom">
        <div className="crm-sidebar-status">
          <span className="crm-status-dot" />

          <span>
            Workspace active
          </span>
        </div>

        <div className="crm-sidebar-version">
          CRM Workspace
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  )
}