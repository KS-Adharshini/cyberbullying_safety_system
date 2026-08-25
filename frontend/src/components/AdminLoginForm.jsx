import React, { useState } from 'react'
import { Shield, Lock } from 'lucide-react'

function AdminLoginForm({ onLogin }) {
  const [adminUsername, setAdminUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const cleanUsername = adminUsername.trim().toLowerCase()
    const cleanPassword = password.trim()
    // Dummy authentication
    if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
      setError('')
      onLogin('admin', 'admin')
    } else {
      setError('Invalid Admin credentials. Use admin / admin123.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error-msg">{error}</div>}

      <div className="input-group-icon">
        <Shield className="input-icon" size={18} />
        <input 
          type="text" 
          placeholder="Admin Username" 
          value={adminUsername}
          onChange={(e) => { setAdminUsername(e.target.value); setError(''); }}
          className="glass-input"
          required
        />
      </div>

      <div className="input-group-icon">
        <Lock className="input-icon" size={18} />
        <input 
          type="password" 
          placeholder="Admin Password" 
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          className="glass-input"
          required
        />
      </div>

      <div className="admin-credentials-hint">
        Hint: Use <strong>admin</strong> & <strong>admin123</strong>
      </div>

      <button type="submit" className="btn-primary auth-submit-btn admin-btn-color">
        Login
      </button>
    </form>
  )
}

export default AdminLoginForm
