import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, ShieldCheck, ShieldAlert, Users, Percent, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from '../utils/api'

function CommentAnalyzer() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filters State
  const [searchAuthor, setSearchAuthor] = useState('')
  const [searchVictim, setSearchVictim] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [toxicityFilter, setToxicityFilter] = useState('all') // 'all', 'toxic', 'normal'
  const [sentimentFilter, setSentimentFilter] = useState('all') // 'all', 'positive', 'negative', 'neutral'

  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const data = await api.getComments()
      setComments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle local delete
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return
    try {
      await api.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.commentId !== commentId))
    } catch (err) {
      alert(`Error deleting comment: ${err.message}`)
    }
  }

  // Filtered comments logic
  const filteredComments = comments.filter(c => {
    const matchesAuthor = c.commentBy.toLowerCase().includes(searchAuthor.toLowerCase().trim())
    const matchesVictim = c.commentTo.toLowerCase().includes(searchVictim.toLowerCase().trim())
    const matchesQuery = c.commentText.toLowerCase().includes(searchQuery.toLowerCase().trim())
    
    let matchesToxicity = true
    if (toxicityFilter === 'toxic') {
      matchesToxicity = c.isToxic === true
    } else if (toxicityFilter === 'normal') {
      matchesToxicity = c.isToxic === false
    }
    
    let matchesSentiment = true
    const currentSentiment = (c.sentiment?.label || c.sentiment || 'Neutral').toLowerCase()
    if (sentimentFilter === 'positive') {
      matchesSentiment = currentSentiment === 'positive'
    } else if (sentimentFilter === 'negative') {
      matchesSentiment = currentSentiment === 'negative'
    } else if (sentimentFilter === 'neutral') {
      matchesSentiment = currentSentiment === 'neutral'
    }
    
    return matchesAuthor && matchesVictim && matchesQuery && matchesToxicity && matchesSentiment
  })

  // Calculate top KPI Metrics from raw comments
  const totalCount = comments.length
  const toxicCount = comments.filter(c => c.isToxic).length
  const normalCount = totalCount - toxicCount
  
  const avgToxicity = totalCount 
    ? Math.round((comments.reduce((sum, c) => sum + c.toxicityScore, 0) / totalCount) * 100)
    : 0

  // Calculate Most Toxic User (highest count of toxic comments)
  const userToxicityCounts = {}
  comments.forEach(c => {
    if (c.isToxic) {
      userToxicityCounts[c.commentBy] = (userToxicityCounts[c.commentBy] || 0) + 1
    }
  })
  
  let mostToxicUser = 'None'
  let maxToxicCount = 0
  Object.keys(userToxicityCounts).forEach(username => {
    if (userToxicityCounts[username] > maxToxicCount) {
      maxToxicCount = userToxicityCounts[username]
      mostToxicUser = username
    }
  })

  // Charts data preparation
  // 1. Pie Chart Data
  const pieData = [
    { name: 'Normal Comments', value: normalCount },
    { name: 'Toxic Comments', value: toxicCount }
  ]
  const PIE_COLORS = ['#38bdf8', '#ef4444']

  // 2. Bar Chart Data (Top 5 Toxic Users)
  const sortedToxicUsers = Object.keys(userToxicityCounts)
    .map(username => ({ name: username, count: userToxicityCounts[username] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="analyzer-page">
      <div className="page-header">
        <h1 className="gradient-text">Comment Analyzer</h1>
        <p>Analyze overall system sentiment, review warning thresholds, and inspect comments database logs.</p>
      </div>

      {/* top statistics cards */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <Users className="metric-card-icon" style={{ color: 'var(--primary)' }} />
          <h3>Total Logs</h3>
          <div className="metric-value">{totalCount}</div>
          <span className="metric-subtitle">Comments processed</span>
        </div>

        <div className="metric-card glass-panel">
          <ShieldAlert className="metric-card-icon" style={{ color: 'var(--danger)' }} />
          <h3>Toxic Flagged</h3>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>{toxicCount}</div>
          <span className="metric-subtitle">
            {totalCount ? Math.round((toxicCount / totalCount) * 100) : 0}% of overall database
          </span>
        </div>

        <div className="metric-card glass-panel">
          <Percent className="metric-card-icon" style={{ color: 'var(--warning)' }} />
          <h3>Avg Toxicity</h3>
          <div className="metric-value">{avgToxicity}%</div>
          <span className="metric-subtitle">System severity score</span>
        </div>

        <div className="metric-card glass-panel">
          <AlertTriangle className="metric-card-icon" style={{ color: 'var(--critical)' }} />
          <h3>Most Toxic</h3>
          <div className="metric-value" style={{ fontSize: '1.4rem', padding: '10px 0' }}>
            {mostToxicUser !== 'None' ? `@${mostToxicUser}` : 'None'}
          </div>
          <span className="metric-subtitle">
            {maxToxicCount > 0 ? `${maxToxicCount} toxic comments posted` : 'No abusive comments'}
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="filters-panel glass-panel">
        <div className="filters-grid">
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search commenter..." 
              value={searchAuthor}
              onChange={(e) => setSearchAuthor(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search victim..." 
              value={searchVictim}
              onChange={(e) => setSearchVictim(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Filter keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          </div>

          <select 
            value={toxicityFilter}
            onChange={(e) => setToxicityFilter(e.target.value)}
            className="user-select-dropdown"
            style={{ height: '45px' }}
          >
            <option value="all">All Toxicity Status</option>
            <option value="toxic">Only Toxic Comments</option>
            <option value="normal">Only Normal Comments</option>
          </select>

          <select 
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="user-select-dropdown"
            style={{ height: '45px' }}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Only Positive Sentiment</option>
            <option value="negative">Only Negative Sentiment</option>
            <option value="neutral">Only Neutral Sentiment</option>
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analyzer-charts-grid">
        {/* Pie Chart Card */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '320px' }}>
          <h3 style={{ marginBottom: '20px' }}>Distribution Ratio</h3>
          <div style={{ width: '100%', height: 220 }}>
            {totalCount === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>
                No database records to visualize.
              </p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border-glass)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart Card */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '320px' }}>
          <h3 style={{ marginBottom: '20px' }}>Top Toxic Profiles</h3>
          <div style={{ width: '100%', height: 220 }}>
            {sortedToxicUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '80px' }}>
                No toxic profiles flagged.
              </p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={sortedToxicUsers} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border-glass)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="url(#colorToxicBar)" name="Toxic Comments">
                    {sortedToxicUsers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#ef4444" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="colorToxicBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Comments List Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Database Logs ({filteredComments.length})</h3>
        
        {loading ? (
          <p>Loading database entries...</p>
        ) : filteredComments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
            No comments match the filter criteria.
          </p>
        ) : (
          <div className="all-comments-table-wrapper">
            <table className="comments-table">
              <thead>
                <tr>
                  <th>Commenter</th>
                  <th>Victim</th>
                  <th>Comment Text</th>
                  <th>Score</th>
                  <th>Sentiment</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComments.map((c) => (
                  <tr key={c.commentId} style={{ borderLeft: c.isToxic ? '4px solid var(--danger)' : 'none' }}>
                    <td>
                      <Link to={`/profile/${c.commentBy}`} style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: '600' }}>
                        @{c.commentBy}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/profile/${c.commentTo}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                        @{c.commentTo}
                      </Link>
                    </td>
                    <td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>
                      <div>"{c.originalText || c.commentText}"</div>
                      {c.language && c.language !== 'English' && c.translatedText && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: '4px' }}>
                          ↳ English: "{c.translatedText}"
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ 
                        color: c.isToxic ? 'var(--danger)' : 'var(--success)', 
                        fontWeight: '600' 
                      }}>
                        {Math.round((c.toxicity?.score !== undefined ? c.toxicity.score : c.toxicityScore) * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge-status ${(c.sentiment?.label || c.sentiment || 'Neutral').toLowerCase()}`}>
                        {c.sentiment?.label || c.sentiment}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatTime(c.timestamp)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-danger" 
                        onClick={() => handleDeleteComment(c.commentId)}
                        style={{ padding: '6px' }}
                        title="Delete Comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default CommentAnalyzer
