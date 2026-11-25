import { NavLink } from 'react-router'
import { NAV } from './nav'

export function Sidebar() {
  return (
    <aside className="side">
      <div className="brand">
        <span className="mark">A</span>Accountable
      </div>
      <nav aria-label="Sections">
        {NAV.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={16} strokeWidth={2} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="side-foot">
        <div className="who">Y</div>
        <div>
          <div>Your workspace</div>
          <div className="dim">Local</div>
        </div>
      </div>
    </aside>
  )
}
