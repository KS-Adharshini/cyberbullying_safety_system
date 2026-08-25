import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ShieldAlert, LayoutDashboard, LogOut, Sun, Moon, Bell, Image as ImageIcon } from 'lucide-react'
import { getLocalUsers } from '../utils/mockData'
import QelevixaLogo from './QelevixaLogo'

function Navbar({ role, username, onLogout }) {
  const navigate = useNavigate()
  const isAdmin = role === 'admin'

  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

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

  // Retrieve user data for avatar and display name
  const localUsers = getLocalUsers()
  const userObj = localUsers.find(u => u.username === (username || '').toLowerCase())
  const displayName = userObj ? userObj.displayName : (username === 'admin' ? 'Administrator' : username || 'User')
  const profilePic = userObj ? userObj.profilePic : `https://api.dicebear.com/7.x/adventurer/svg?seed=${username || 'default'}`

  return (
    <header className="top-navbar glass-panel">
      {/* Brand Logo (Left) */}
      <div className="top-navbar-brand" onClick={() => navigate(isAdmin ? '/admin-feed' : '/')} style={{ cursor: 'pointer' }}>
        <QelevixaLogo size={32} className="brand-icon" />
        <div>
          <h2>QELEVIXA</h2>
          <span>{isAdmin ? 'Safety Admin' : 'Connect • Express • Stay Safe'}</span>
        </div>
      </div>

      {/* Nav Links (Middle) */}
      <nav className="top-navbar-nav">
        <NavLink 
          to={isAdmin ? "/admin-feed" : "/"} 
          className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={18} />
          <span>Home Feed</span>
        </NavLink>

        {!isAdmin && (
          <NavLink
            to="/notifications"
            className={({ isActive }) => `top-nav-item notification-nav-item ${isActive ? 'active' : ''}`}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span>Notifications</span>
          </NavLink>
        )}

        {isAdmin && (
          <>
            <NavLink 
              to="/analyzer" 
              className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
            >
              <ShieldAlert size={18} />
              <span>Comment Analyzer</span>
            </NavLink>
            <NavLink 
              to="/moderator" 
              className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Moderator Hub</span>
            </NavLink>
            <NavLink
              to="/image-reports"
              className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
            >
              <ImageIcon size={18} />
              <span>Image Reports</span>
            </NavLink>
          </>
        )}

        {!isAdmin && (
          <NavLink 
            to={`/profile/${username}`} 
            className={({ isActive }) => `top-nav-item ${isActive ? 'active' : ''}`}
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
        )}
      </nav>

      {/* User Badge & Logout (Right) */}
      <div className="top-navbar-right">
        {username && !isAdmin && (
          <div 
            className="top-navbar-profile-card"
            onClick={() => navigate(`/profile/${username}`)}
            title="View Profile"
          >
            <img 
              src={profilePic} 
              alt={username} 
              className="top-navbar-profile-avatar"
            />
            <div className="top-navbar-profile-info">
              <span className="top-navbar-profile-name">{displayName}</span>
              <span className="top-navbar-profile-handle">@{username}</span>
            </div>
          </div>
        )}

        {isAdmin && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: '500' }}>
            System <strong>Admin</strong>
          </span>
        )}

        <button 
          onClick={toggleTheme} 
          title="Toggle Theme" 
          className="top-navbar-theme-btn"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            marginRight: '4px'
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="top-navbar-logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}

export default Navbar
