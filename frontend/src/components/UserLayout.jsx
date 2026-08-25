import React, { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { AlertTriangle } from 'lucide-react'
import { api } from '../utils/api'

function UserLayout({ children, username, onLogout }) {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const profileData = await api.getUserProfile(username)
        if (profileData && profileData.profile.status && profileData.profile.status.toLowerCase() === 'warned') {
          // Check if already acknowledged in this browser session
          const isAcked = sessionStorage.getItem(`warn_acknowledged_${username}`) === 'true'
          if (!isAcked) {
            setShowWarning(true)
          }
        }
      } catch (err) {
        console.error('Error checking user warning status:', err)
      }
    }
    if (username) {
      checkStatus()
    }
  }, [username])

  const handleAcknowledge = async () => {
    try {
      // Dismiss for this session
      sessionStorage.setItem(`warn_acknowledged_${username}`, 'true')
      await api.acknowledgeWarning(username)
      setShowWarning(false)
    } catch (err) {
      console.error('Error acknowledging warning:', err)
      setShowWarning(false)
    }
  }

  return (
    <div className="app-container top-nav-layout">
      <Navbar role="user" username={username} onLogout={onLogout} />
      <div className="content-container full-width-layout">
        <main className="main-content">
          {children}
        </main>
      </div>

      {showWarning && (
        <div className="modal-overlay warning-overlay">
          <div className="modal-content warning-modal glass-panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '440px' }}>
            <AlertTriangle className="warning-icon" size={60} style={{ color: 'var(--warning)', marginBottom: '20px' }} />
            <h2 style={{ color: 'var(--warning)', marginBottom: '15px', fontSize: '1.5rem', fontWeight: '700' }}>Official Account Warning</h2>
            
            <p style={{ lineHeight: '1.6', marginBottom: '20px', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Hello <strong>@{username}</strong>, your account has been flagged by the AI safety moderation system for violating our community guidelines regarding repeated harassment.
            </p>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.5' }}>
              Please review your behavior and comments. Continued violations will lead to the immediate and permanent suspension of your account.
            </p>
            
            <button 
              onClick={handleAcknowledge}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontWeight: '600' }}
            >
              I Understand and Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserLayout
