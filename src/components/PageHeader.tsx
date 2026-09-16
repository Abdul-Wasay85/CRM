import { Link } from 'react-router-dom'

type PageHeaderProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: '28px',
      }}
    >
      {/* Back to Dashboard */}
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#a78bfa',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '18px',
          transition: 'color 0.2s ease',
        }}
      >
        <span style={{ fontSize: '18px' }}>←</span>
        Dashboard
      </Link>

      {/* Title + Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#f8fafc',
              fontSize: '30px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </h1>

          {description && (
            <p
              style={{
                margin: '8px 0 0',
                color: '#94a3b8',
                fontSize: '15px',
                lineHeight: 1.6,
              }}
            >
              {description}
            </p>
          )}
        </div>

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              padding: '11px 18px',
              borderRadius: '10px',
              border: '1px solid #8b5cf6',
              background:
                'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}