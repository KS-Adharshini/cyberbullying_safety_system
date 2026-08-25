import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Layouts & Protection
import ProtectedRoute from './components/ProtectedRoute'
import UserLayout from './components/UserLayout'
import AdminLayout from './components/AdminLayout'

// Pages
import Login from './pages/Login'
import HomeFeed from './pages/HomeFeed'
import AdminHomeFeed from './pages/AdminHomeFeed'
import Profile from './pages/Profile'
import AdminProfile from './pages/AdminProfile'
import CommentAnalyzer from './pages/CommentAnalyzer'
import ModeratorDashboard from './pages/ModeratorDashboard'
import ImageReports from './pages/ImageReports'
import NotificationCenter from './pages/NotificationCenter'

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.body.classList.toggle('light-theme', savedTheme === 'light')
  }, [])
  const [authenticated, setAuthenticated] = useState(
    localStorage.getItem('authenticated') === 'true'
  )
  const [authRole, setAuthRole] = useState(
    localStorage.getItem('authRole') || ''
  )
  const [authUsername, setAuthUsername] = useState(
    localStorage.getItem('authUsername') || ''
  )

  const handleLogin = (username, role) => {
    localStorage.setItem('authenticated', 'true')
    localStorage.setItem('authRole', role)
    localStorage.setItem('authUsername', username)
    setAuthenticated(true)
    setAuthRole(role)
    setAuthUsername(username)
  }

  const handleLogout = () => {
    localStorage.clear()
    setAuthenticated(false)
    setAuthRole('')
    setAuthUsername('')
  }

  return (
    <Router>
      <Routes>
        {/* Public Login Page */}
        <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />

        {/* Protected User Feed Route */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserLayout username={authUsername} onLogout={handleLogout}>
                <HomeFeed currentUser={authUsername} />
              </UserLayout>
            </ProtectedRoute>
          } 
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserLayout username={authUsername} onLogout={handleLogout}>
                <NotificationCenter currentUser={authUsername} />
              </UserLayout>
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Feed Route */}
        <Route 
          path="/admin-feed" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout username={authUsername} onLogout={handleLogout}>
                <AdminHomeFeed currentUser={authUsername} />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile/:username" 
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              {authRole === 'admin' ? (
                <AdminLayout username={authUsername} onLogout={handleLogout}>
                  <AdminProfile />
                </AdminLayout>
              ) : (
                <UserLayout username={authUsername} onLogout={handleLogout}>
                  <Profile />
                </UserLayout>
              )}
            </ProtectedRoute>
          } 
        />

        {/* Protected ADMIN-only Routes */}
        <Route 
          path="/analyzer" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout username={authUsername} onLogout={handleLogout}>
                <CommentAnalyzer />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/moderator" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout username={authUsername} onLogout={handleLogout}>
                <ModeratorDashboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        <Route
          path="/image-reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout username={authUsername} onLogout={handleLogout}>
                <ImageReports />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route 
          path="/moderator/:username" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout username={authUsername} onLogout={handleLogout}>
                <ModeratorDashboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
