import React from 'react'
import { Navigate } from 'react-router-dom'
import { AlertOctagon } from 'lucide-react'
import { getLocalUsers } from '../utils/mockData'
function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = localStorage.getItem('authenticated') === 'true'
  const userRole = localStorage.getItem('authRole') // 'user' or 'admin'
  const username = localStorage.getItem('authUsername')

  if (isAuthenticated && userRole === 'user' && username) {
    const localUsers = getLocalUsers()
    const found = localUsers.find(u => u.username === username.toLowerCase())
    if (found && found.status && found.status.toLowerCase() === 'suspended') {
      localStorage.clear()
      return <Navigate to="/login" replace />
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If admin is trying to access user-only routes, redirect to admin-feed
    if (userRole === 'admin') {
      return <Navigate to="/admin-feed" replace />
    }

    // If user is a normal user trying to access admin pages, show Access Denied
    return (
      <div className="access-denied-container glass-panel">
        <AlertOctagon className="denied-icon" size={64} />
        <h2>Access Denied</h2>
        <p>You do not have the required administrative permissions to view this dashboard.</p>
        <button 
          onClick={() => {
            localStorage.clear()
            window.location.href = '#/login'
          }}
          className="btn-primary"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
