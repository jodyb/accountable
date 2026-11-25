import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

type HeaderProps = {
  title: string
  sub?: ReactNode
  crumb?: { label: string; to: string }
  actions?: ReactNode
  children?: ReactNode
}

/** Page title with optional breadcrumb, subtitle and buttons on the right. */
export function PageHeader({ title, sub, crumb, actions, children }: HeaderProps) {
  return (
    <header className="head">
      <div>
        {crumb && (
          <div className="crumbs">
            <Link to={crumb.to}>{crumb.label}</Link> / {title}
          </div>
        )}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
        {children}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  )
}

export function Loading() {
  return <p className="mute">Loading...</p>
}

export function LoadError({ what }: { what: string }) {
  return (
    <div className="panel empty">
      Couldn't load {what}. Check that the app is running, then refresh the page.
    </div>
  )
}
