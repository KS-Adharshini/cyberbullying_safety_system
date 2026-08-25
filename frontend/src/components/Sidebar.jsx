import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ShieldAlert, LayoutDashboard, LogOut, Shield } from 'lucide-react'
import { getLocalUsers } from '../utils/mockData'

function Sidebar({ role, currentUser, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('authenticated')
      localStorage.removeItem('authRole')
      localStorage.removeItem('authUsername')
    }
    navigate('/login')
  }

  const isAdmin = role === 'admin'

  // Retrieve user data for avatar and display name
  const localUsers = getLocalUsers()
  const userObj = localUsers.find(u => u.username === (currentUser || '').toLowerCase())
  const displayName = userObj ? userObj.displayName : (currentUser === 'admin' ? 'Administrator' : currentUser || 'User')
  const profilePic = userObj ? userObj.profilePic : `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser || 'default'}`

  return (
    <aside className="sidebar glass-panel">
      {/* Instagram style header */}
      <div className="sidebar-brand">
        <Shield className="brand-icon" />
        <div>
          <h2>Instagram</h2>
          <span style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--primary)' }}>
            {isAdmin ? 'Safety Admin' : 'Safety Portal'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Home Feed */}
        <NavLink 
          to={isAdmin ? "/admin-feed" : "/"} 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Home className="nav-icon" />
          <span>Home Feed</span>
        </NavLink>

        {/* Admin links */}
        {isAdmin && (
          <>
            <NavLink 
              to="/analyzer" 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert className="nav-icon" />
              <span>Comment Analyzer</span>
            </NavLink>
            <NavLink 
              to="/moderator" 
              className={({ isActive }) => `nav-item ${isActive ? 'active-mod' : ''}`}
            >
              <LayoutDashboard className="nav-icon" />
              <span>Moderator Hub</span>
            </NavLink>
          </>
        )}

        {/* Profile Link - circular avatar icon */}
        <NavLink 
          to={`/profile/${currentUser}`} 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <img 
            src={profilePic} 
            alt="Profile Icon" 
            className="nav-icon-avatar"
            style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          />
          <span>My Profile</span>
        </NavLink>
      </nav>

      {/* Large User Profile Card at the bottom */}
      <div className="sidebar-footer">
        {currentUser && (
          <div 
            className="sidebar-profile-card"
            onClick={() => navigate(`/profile/${currentUser}`)}
            title="View Profile"
          >
            <img 
              src={profilePic} 
              alt={currentUser} 
              className="sidebar-profile-avatar"
            />
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{displayName}</span>
              <span className="sidebar-profile-handle">@{currentUser}</span>
            </div>
          </div>
        )}

        <button className="nav-item logout-btn" onClick={handleLogout} style={{ marginTop: '10px', width: '100%', justifyContent: 'flex-start' }}>
          <LogOut className="nav-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
