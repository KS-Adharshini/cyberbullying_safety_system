import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import AdminLoginForm from '../components/AdminLoginForm'
import { Users, ShieldCheck, Sun, Moon } from 'lucide-react'
import QelevixaLogo from '../components/QelevixaLogo'

function Login({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('user') // 'user' or 'admin'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const handleLoginSuccess = (username, role) => {
    localStorage.setItem('authenticated', 'true')
    localStorage.setItem('authRole', role)
    localStorage.setItem('authUsername', username)
    
    if (onLoginSuccess) {
      onLoginSuccess(username, role)
    }
    
    // Redirect based on role
    if (role === 'admin') {
      navigate('/admin-feed')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="login-page-container">
      {/* Top right theme toggle */}
      <div className="login-theme-toggle-wrap">
        <button 
          onClick={toggleTheme} 
          title="Toggle Theme" 
          className="login-theme-btn"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="login-background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <div className="login-card glass-panel">
        <div className="login-logo-section">
          <div className="login-logo-circle" style={{ width: '84px', height: '84px' }}>
            <QelevixaLogo size={52} />
          </div>
          <h2 className="gradient-text" style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '0.03em', margin: '4px 0' }}>
            QELEVIXA
          </h2>
          <p className="login-subtitle" style={{ fontSize: '0.88rem', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: '600' }}>
            Connect. Express. Stay Safe.
          </p>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            <Users size={16} style={{ marginRight: '6px' }} />
            User
          </button>
          <button 
            className={`login-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <ShieldCheck size={16} style={{ marginRight: '6px' }} />
            Admin
          </button>
        </div>

        <div className="login-form-section">
          {activeTab === 'user' ? (
            <LoginForm onLogin={handleLoginSuccess} />
          ) : (
            <AdminLoginForm onLogin={handleLoginSuccess} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
