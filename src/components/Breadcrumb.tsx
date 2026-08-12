'use client'

interface Crumb {
  label: string
  href?: string
  onClick?: () => void
}

interface BreadcrumbProps {
  crumbs: Crumb[]
}

export default function Breadcrumb({ crumbs }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className="bc-sep">›</span>}
            {isLast ? (
              <span className="bc-current">{c.label}</span>
            ) : (
              <button
                className="bc-link"
                onClick={c.onClick}
              >
                {c.label}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
