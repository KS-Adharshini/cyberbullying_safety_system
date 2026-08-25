import React from 'react'
import Navbar from './Navbar'

function AdminLayout({ children, username, onLogout }) {
  return (
    <div className="app-container top-nav-layout">
      <Navbar role="admin" username={username} onLogout={onLogout} />
      <div className="content-container full-width-layout">
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
