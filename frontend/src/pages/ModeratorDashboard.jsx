import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Shield, AlertTriangle, AlertOctagon, UserX, UserMinus, UserCheck, ShieldAlert, MessageCircle, Calendar, Users, EyeOff, CheckCircle } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../utils/api'

function ModeratorDashboard() {
  const { username: routeUsername } = useParams()
  const navigate = useNavigate()
  
  const [usersList, setUsersList] = useState([])
  const [selectedUser, setSelectedUser] = useState(routeUsername || '')
  const [modData, setModData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Modals state
  const [activeModal, setActiveModal] = useState(null) // 'warn', 'suspend', 'delete'
  const [modalCommentId, setModalCommentId] = useState(null)
  const [actionReason, setActionReason] = useState('')
  const [actionDetails, setActionDetails] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchModeratorData(selectedUser)
      // Update URL if user changes via dropdown, without refreshing
      navigate(`/moderator/${selectedUser}`, { replace: true })
    } else {
      setModData(null)
    }
  }, [selectedUser])

  // If URL changes, sync the dropdown
  useEffect(() => {
    if (routeUsername && routeUsername !== selectedUser) {
      setSelectedUser(routeUsername)
    }
  }, [routeUsername])

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsersList(data)
      
      // Auto select first user if none selected
      if (!selectedUser && data.length > 0) {
        setSelectedUser(data[0].username)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchModeratorData = async (username) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getModeratorSummary(username)
      setModData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Moderator Action Handlers
  const handleWarnUserSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.warnUser(selectedUser, actionReason, actionDetails)
      alert(`User @${selectedUser} has been officially warned.`)
      setActiveModal(null)
      fetchModeratorData(selectedUser)
      fetchUsers() // refresh list to update badges
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSuspendUserSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.suspendUser(selectedUser, actionReason, actionDetails)
      alert(`User @${selectedUser} has been suspended.`)
      setActiveModal(null)
      fetchModeratorData(selectedUser)
      fetchUsers() // refresh list to update badges
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUnsuspendUserSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.unsuspendUser(selectedUser, actionReason, actionDetails)
      alert(`User @${selectedUser} has been unsuspended.`)
      setActiveModal(null)
      fetchModeratorData(selectedUser)
      fetchUsers() // refresh list to update badges
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteCommentSubmit = async () => {
    try {
      await api.deleteComment(modalCommentId, 'admin')
      
      // Update local state
      setModData(prev => ({
        ...prev,
        commentsHistory: prev.commentsHistory.filter(c => c.commentId !== modalCommentId)
      }))
      
      setActiveModal(null)
      fetchModeratorData(selectedUser) // Recalculate metrics
    } catch (err) {
      alert(err.message)
    }
  }

  const handleHideComment = (commentId) => {
    alert("Comment has been hidden on the post feed.")
    setModData(prev => ({
      ...prev,
      commentsHistory: prev.commentsHistory.map(c => 
        c.commentId === commentId ? { ...c, commentText: "[Hidden by Moderator]", isToxic: false, toxicityScore: 0.0 } : c
      )
    }))
  }

  const handleIgnoreComment = (commentId) => {
    alert("Toxicity flag ignored for this comment.")
    setModData(prev => ({
      ...prev,
      commentsHistory: prev.commentsHistory.map(c => 
        c.commentId === commentId ? { ...c, isToxic: false, toxicityScore: 0.0 } : c
      )
    }))
  }

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Find most targeted victim
  const getMostTargetedVictim = (victims) => {
    if (!victims || victims.length === 0) return 'None'
    return victims[0].username
  }

  return (
    <div className="moderator-page">
      <div className="page-header">
        <h1 className="gradient-text-critical" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={36} /> Moderator Dashboard
        </h1>
        <p>AI Repeated Harassment engine & trust moderation operations suite.</p>
      </div>

      <div className="mod-dashboard-layout">
        {/* User Selection Panel */}
        <div className="user-search-panel glass-panel">
          <label htmlFor="user-select">Select Profile to Review:</label>
          <select
            id="user-select"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="glass-select user-search-select"
          >
            <option value="">-- Choose User --</option>
            {usersList.map(u => (
              <option key={u.username} value={u.username}>
                @{u.username} ({u.displayName}) - Status: {u.status}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing profiles...</p>
          </div>
        )}

        {error && (
          <div className="error-state glass-panel">
            <AlertTriangle className="error-icon" />
            <h3>Error Loading Moderation Metrics</h3>
            <p>{error}</p>
          </div>
        )}

        {modData && !loading && (
          <>
            {/* Repeated Harassment Warnings (Critical Indicator) */}
            {modData.repeatedHarassment.detected && (
              <div className="alert-harassment alert-danger">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertOctagon size={24} style={{ color: 'var(--critical)' }} />
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem' }}>
                    ⚠ Repeated Harassment Detected
                  </h3>
                </div>
                <p style={{ margin: '8px 0 0 34px', fontSize: '0.95rem', color: '#ffc8d2' }}>
                  <strong>Reason:</strong> {modData.repeatedHarassment.reason}
                </p>
                <div style={{ margin: '10px 0 0 34px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => {
                      setActionReason(modData.repeatedHarassment.reason)
                      setActionDetails("Automated AI Repeated Harassment detection flag.")
                      setActiveModal('warn')
                    }}
                    className="btn-primary btn-warn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Issue Warning
                  </button>
                  <button 
                    onClick={() => {
                      setActionReason(modData.repeatedHarassment.reason)
                      setActionDetails("Automated AI Repeated Harassment detection flag.")
                      setActiveModal('suspend')
                    }}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Suspend Account
                  </button>
                </div>
              </div>
            )}

            {/* Dashboard Cards Grid */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <MessageCircle className="metric-card-icon" />
                <h3>Total Comments</h3>
                <div className="metric-value">{modData.metrics.totalComments}</div>
                <span className="metric-subtitle">Comments posted</span>
              </div>

              <div className="metric-card glass-panel">
                <ShieldAlert className="metric-card-icon" style={{ color: 'var(--danger)' }} />
                <h3>Toxic Flagged</h3>
                <div className="metric-value" style={{ color: 'var(--danger)' }}>{modData.metrics.toxicCommentsCount}</div>
                <span className="metric-subtitle">
                  {modData.metrics.toxicRatio}% toxicity ratio
                </span>
              </div>

              <div className="metric-card glass-panel">
                <Users className="metric-card-icon" />
                <h3>Top Victim</h3>
                <div className="metric-value" style={{ fontSize: '1.4rem', padding: '10px 0' }}>
                  {getMostTargetedVictim(modData.victimAnalysis) !== 'None' 
                    ? `@${getMostTargetedVictim(modData.victimAnalysis)}` 
                    : 'None'}
                </div>
                <span className="metric-subtitle">Most targeted profile</span>
              </div>

              <div className="metric-card glass-panel" style={{ borderLeft: `4px solid var(--${modData.metrics.riskLevel.toLowerCase() === 'low' ? 'success' : modData.metrics.riskLevel.toLowerCase() === 'medium' ? 'warning' : 'danger'})` }}>
                <AlertTriangle className="metric-card-icon" style={{ color: 'var(--danger)' }} />
                <h3>Risk Score</h3>
                <div className="metric-value" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {modData.metrics.riskScore}
                  <span className={`badge-risk ${modData.metrics.riskLevel.toLowerCase()}`} style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}>
                    {modData.metrics.riskLevel}
                  </span>
                </div>
                <span className="metric-subtitle">Harassment Threat Level</span>
              </div>
            </div>

            {/* Graph & Victim Section */}
            <div className="dashboard-details-grid">
              {/* Chart Pane */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Toxicity Trend Over Time
                </h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <AreaChart data={modData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderColor: 'var(--border-glass)',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area name="Toxic Comments" type="monotone" dataKey="toxic" stroke="#ef4444" fill="rgba(239, 68, 68, 0.2)" />
                      <Area name="Total Comments" type="monotone" dataKey="total" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.1)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Victim Analysis Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} /> Targeted Accounts breakdown
                </h3>
                {modData.victimAnalysis.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '80px 0' }}>
                    No targeted toxic comments detected.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {modData.victimAnalysis.map((v, i) => (
                      <div 
                        key={v.username} 
                        className={`victim-item ${i === 0 ? 'highlighted-victim' : ''}`}
                      >
                        <span style={{ fontWeight: '500' }}>@{v.username}</span>
                        <span>
                          {v.toxicCount} toxic comments {i === 0 && '🔥 (Principal Victim)'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Review and Moderator Actions */}
            <div className="dashboard-details-grid" style={{ marginTop: '30px' }}>
              {/* User Account State */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3>Review Profile Summary</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '20px 0' }}>
                  <img 
                    src={modData.profile.profilePic} 
                    alt={modData.profile.username} 
                    style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-glass)' }}
                  />
                  <div>
                    <h4>{modData.profile.displayName}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{modData.profile.username}</p>
                    <div style={{ marginTop: '6px' }}>
                      Status: <span className={`badge-status ${modData.profile.status.toLowerCase()}`}>{modData.profile.status}</span>
                    </div>
                  </div>
                </div>

                <div className="moderator-action-buttons">
                  <button 
                    onClick={() => {
                      setActionReason("Harassment/abusive behavior in comments.")
                      setActionDetails("")
                      setActiveModal('warn')
                    }}
                    className="btn-outline btn-warn"
                  >
                    <AlertTriangle size={16} /> Warn Account
                  </button>
                  {modData.profile.status.toLowerCase() === 'suspended' ? (
                    <button 
                      onClick={() => {
                        setActionReason("Request for account reinstatement approved.")
                        setActionDetails("")
                        setActiveModal('unsuspend')
                      }}
                      className="btn-outline btn-success"
                      style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                    >
                      <UserCheck size={16} /> Unsuspend Account
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setActionReason("Repeated harassment violation.")
                        setActionDetails("")
                        setActiveModal('suspend')
                      }}
                      className="btn-outline btn-suspend"
                    >
                      <UserX size={16} /> Suspend Account
                    </button>
                  )}
                </div>

                {/* Audit Logs */}
                <div style={{ marginTop: '25px' }}>
                  <h4>Safety Log History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                    {modData.logs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No action logs registered.</p>
                    ) : (
                      modData.logs.map(log => (
                        <div key={log.logId} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                            <span style={{ color: log.action.includes('WARN') ? 'var(--warning)' : 'var(--danger)' }}>{log.action}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{formatTime(log.timestamp)}</span>
                          </div>
                          <p style={{ marginTop: '4px' }}><strong>Reason:</strong> {log.reason}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Comments moderation history */}
              <div className="glass-panel mod-history-panel">
                <h3>Comments Review Stream</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', maxHeight: '420px', paddingRight: '5px' }}>
                  {modData.commentsHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
                      No comments posted by this profile.
                    </p>
                  ) : (
                    modData.commentsHistory.map(comment => (
                      <div 
                        key={comment.commentId} 
                        className={`toxic-comment-card`}
                        style={{ 
                          background: comment.isToxic ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255,255,255,0.02)',
                          borderColor: comment.isToxic ? 'rgba(239,68,68,0.2)' : 'var(--border-glass)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <span>Target: @{comment.commentTo} ({comment.language || 'English'})</span>
                          <span>{formatTime(comment.timestamp)}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', marginBottom: '6px' }}>"{comment.originalText || comment.commentText}"</p>
                        {comment.language && comment.language !== 'English' && comment.translatedText && (
                          <div style={{ margin: '6px 0 10px 0', paddingLeft: '8px', borderLeft: '2px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase' }}>
                              ↓ Translated English
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                              "{comment.translatedText}"
                            </span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            {comment.isToxic ? (
                              <span className="comment-tag-toxic" style={{ padding: '2px 6px' }}>
                                TOXIC ({Math.round((comment.toxicity?.score !== undefined ? comment.toxicity.score : comment.toxicityScore) * 100)}%)
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: '600' }}>
                                Safe ({Math.round((comment.toxicity?.score !== undefined ? comment.toxicity.score : comment.toxicityScore) * 100)}%)
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-danger" 
                              onClick={() => {
                                setModalCommentId(comment.commentId)
                                setActiveModal('delete')
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                            <button 
                              className="btn-outline" 
                              onClick={() => handleHideComment(comment.commentId)}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              <EyeOff size={12} /> Hide
                            </button>
                            {comment.isToxic && (
                              <button 
                                className="btn-outline"
                                onClick={() => handleIgnoreComment(comment.commentId)}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--success)' }}
                              >
                                <CheckCircle size={12} /> Ignore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Popups / Confirmation Modals */}
      {activeModal === 'delete' && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 className="modal-title">Delete Toxic Comment?</h3>
            <p className="modal-body">
              This action will permanently delete the comment from the database logs. An audit log entry will be created.
            </p>
            <div className="modal-footer">
              <button onClick={() => setActiveModal(null)} className="btn-outline">Cancel</button>
              <button onClick={handleDeleteCommentSubmit} className="btn-primary btn-danger">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'warn' && (
        <div className="modal-overlay">
          <form onSubmit={handleWarnUserSubmit} className="modal-content glass-panel">
            <h3 className="modal-title">Warn User @{selectedUser}</h3>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p>Issue an official warning badge to this user. This updates their system security profile.</p>
              
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Reason for Warning</label>
                <input 
                  type="text" 
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Repeatedly posting toxic insults to other users"
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Details / Evidentiary Comments</label>
                <textarea 
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="e.g. Targeted rahul multiple times."
                  className="glass-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setActiveModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary btn-warn">Submit Warning</button>
            </div>
          </form>
        </div>
      )}

      {activeModal === 'suspend' && (
        <div className="modal-overlay">
          <form onSubmit={handleSuspendUserSubmit} className="modal-content glass-panel">
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Suspend User @{selectedUser}</h3>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p>
                <strong>Warning:</strong> Suspending this account blocks this user from making any future comments on the home feed.
              </p>
              
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Justification for Suspension</label>
                <input 
                  type="text" 
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Triggered Critical Harassment Risk Score"
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Safety Details</label>
                <textarea 
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="e.g. User did not respond to initial warning badge."
                  className="glass-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setActiveModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary">Confirm Suspension</button>
            </div>
          </form>
        </div>
      )}
      {activeModal === 'unsuspend' && (
        <div className="modal-overlay">
          <form onSubmit={handleUnsuspendUserSubmit} className="modal-content glass-panel">
            <h3 className="modal-title" style={{ color: 'var(--success)' }}>Unsuspend User @{selectedUser}</h3>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p>
                This action will restore the user's status to **Normal** and allow them to post comments again.
              </p>
              
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Justification for Unsuspension</label>
                <input 
                  type="text" 
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Account appeal accepted / Good behavior"
                  className="glass-input"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Additional Details</label>
                <textarea 
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="e.g. Restored user status after review."
                  className="glass-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setActiveModal(null)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary" style={{ background: 'var(--success)' }}>Confirm Unsuspension</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default ModeratorDashboard
