import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { User, Lock } from 'lucide-react'

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testUsers, setTestUsers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    // Fetch users list to populate test profile selector
    const fetchUsers = async () => {
      try {
        const users = await api.getUsers()
        // Filter out admin if any, keep active ones
        setTestUsers(users.filter(u => u.username !== 'admin'))
      } catch (err) {
        console.error('Error fetching seeded users:', err)
      }
    }
    fetchUsers()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter a username.')
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    
    // Check if user is suspended locally/db before allowing login
    const checkUserStatus = async () => {
      try {
        const users = await api.getUsers()
        const found = users.find(u => u.username === cleanUsername)
        if (found && found.status && found.status.toLowerCase() === 'suspended') {
          setError('This account has been suspended by a moderator for repeated harassment.')
          return
        }
        
        setError('')
        onLogin(cleanUsername, 'user')
      } catch (err) {
        // Fallback login
        onLogin(cleanUsername, 'user')
      }
    }
    checkUserStatus()
  }

  const handleQuickSelect = (e) => {
    const selected = e.target.value
    setUsername(selected)
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error-msg">{error}</div>}

      <div className="input-group-icon">
        <User className="input-icon" size={18} />
        <input 
          type="text" 
          placeholder="Username" 
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(''); }}
          className="glass-input"
          required
        />
      </div>

      <div className="input-group-icon">
        <Lock className="input-icon" size={18} />
        <input 
          type="password" 
          placeholder="Password (any for test)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="glass-input"
        />
      </div>

      {testUsers.length > 0 && (
        <div className="quick-select-wrapper">
          <label>Or Quick-Select Test Profile:</label>
          <select onChange={handleQuickSelect} value={username} className="glass-input select-user-dropdown">
            <option value="">-- Choose Profile --</option>
            {testUsers.map(u => (
              <option key={u.username} value={u.username}>
                @{u.username} ({u.displayName})
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="btn-primary auth-submit-btn">
        Login
      </button>
    </form>
  )
}

export default LoginForm
