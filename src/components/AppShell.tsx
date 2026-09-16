import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useOrganization } from '../context/OrganizationContext'

export default function AppShell() {
  const { loading, error } = useOrganization()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070a12',
          color: '#f8fafc',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              margin: '0 auto 18px',
              borderRadius: '50%',
              border: '3px solid rgba(139, 92, 246, 0.2)',
              borderTopColor: '#8b5cf6',
              animation: 'crm-spin 0.8s linear infinite',
            }}
          />

          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#f8fafc',
            }}
          >
            Loading workspace...
          </div>

          <div
            style={{
              marginTop: '6px',
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            Preparing your CRM
          </div>
        </div>

        <style>
          {`
            @keyframes crm-spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070a12',
          color: '#f8fafc',
          padding: '24px',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '32px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 18px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            !
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              fontSize: '22px',
              fontWeight: 700,
            }}
          >
            Unable to load workspace
          </h1>

          <p
            style={{
              margin: 0,
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="crm-app">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />

      {/* =====================================================
          MAIN APPLICATION AREA
      ===================================================== */}

      <div className="crm-main-area">
        {/* ===================================================
            TOPBAR
        =================================================== */}

        <Topbar />

        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main className="crm-page-area">
          <div className="crm-content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}