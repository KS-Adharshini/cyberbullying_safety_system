import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, Image as ImageIcon, ShieldAlert, Trash2, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../utils/api'

const reasons = ['Harassment or bullying', 'Hate speech or symbols', 'Violence or dangerous content', 'Spam or misleading content', 'Inappropriate content']

function buildFallbackReports(posts) {
  return posts.slice(0, 6).map((post, index) => ({
    reportId: `local-report-${index}`,
    postId: post.postId,
    postImage: post.postImage,
    reportedAccount: post.username,
    reportingAccount: ['anjali_art', 'john_smith', 'foodie_girl'][index % 3],
    reason: reasons[index % reasons.length],
    aiResult: index % 3 === 0 ? 'Harassment detected' : index % 3 === 1 ? 'No harmful content detected' : 'Inappropriate content detected',
    aiCategory: ['harassment', 'safe', 'inappropriate', 'spam', 'hate', 'violence'][index],
    aiConfidence: [0.94, 0.88, 0.79, 0.71, 0.91, 0.67][index],
    severity: ['High', 'Low', 'Medium', 'Medium', 'High', 'Low'][index],
    status: index < 4 ? 'Pending' : 'Resolved',
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    resolutionHours: index < 4 ? null : 6 + index
  }))
}

function ImageReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)

  const loadReports = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError('')
      setReports(await api.getImageReports())
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    const reportsInterval = setInterval(() => loadReports(false), 5000)
    return () => clearInterval(reportsInterval)
  }, [])

  const summary = useMemo(() => ({
    total: reports.length,
    pending: reports.filter(report => report.status === 'Pending').length,
    resolved: reports.filter(report => report.status === 'Resolved').length
  }), [reports])

  const accountData = useMemo(() => Object.entries(reports.reduce((result, report) => {
    result[report.reportedAccount] = (result[report.reportedAccount] || 0) + 1
    return result
  }, {})).map(([name, reportsCount]) => ({ name: `@${name}`, reports: reportsCount })).sort((a, b) => b.reports - a.reports).slice(0, 5), [reports])
  const imageData = useMemo(() => Object.entries(reports.reduce((result, report) => {
    result[report.postId] = (result[report.postId] || { image: report.postImage, reports: 0 })
    result[report.postId].reports += 1
    return result
  }, {})).map(([name, item]) => ({ name, image: item.image, reports: item.reports })).sort((a, b) => b.reports - a.reports).slice(0, 4), [reports])
  const aiData = useMemo(() => ['harassment', 'hate', 'violence', 'sexual', 'spam', 'inappropriate'].map(name => ({ name, score: Math.round((reports.filter(report => report.aiCategory === name).reduce((sum, report) => sum + report.aiConfidence, 0) / (reports.filter(report => report.aiCategory === name).length || 1)) * 100) })), [reports])

  const resolveReport = async (reportId) => {
    await api.updateImageReport(reportId, 'Resolved')
    setReports(items => items.map(item => item.reportId === reportId ? { ...item, status: 'Resolved' } : item))
  }

  const deleteReportImage = async (reportId, postId) => {
    await api.updateImageReport(reportId, 'Resolved', true, postId)
    setReports(items => items.map(item => item.reportId === reportId ? { ...item, status: 'Resolved', postImage: '', deleted: true } : item))
  }

  return (
    <div className="image-reports-page">
      <div className="page-header image-reports-header">
        <div><p className="eyebrow-label">Trust and safety operations</p><h1 className="gradient-text-critical"><ImageIcon size={34} /> Image Reports</h1><p>Monitor user reports and AI-detected image safety signals in one review queue.</p></div>
        <ShieldAlert className="image-reports-header-icon" size={42} />
      </div>
      {error && <div className="error-state glass-panel"><AlertTriangle className="error-icon" /><p>{error}</p></div>}
      {loading ? <div className="loading-state"><div className="spinner" /><p>Loading image reports...</p></div> : (
        <>
          <div className="metrics-grid image-report-metrics">
            {[[ImageIcon, 'Total Image Reports', summary.total, 'All submitted reports'], [Clock3, 'Pending Reports', summary.pending, 'Awaiting review'], [CheckCircle2, 'Resolved Reports', summary.resolved, 'Closed by moderation']].map(([Icon, label, value, detail]) => <div className="metric-card glass-panel" key={label}><Icon className="metric-card-icon" /><h3>{label}</h3><div className="metric-value">{value}</div><span className="metric-subtitle">{detail}</span></div>)}
          </div>
          <div className="image-reports-chart-grid">
            <div className="glass-panel image-report-chart-card"><h3>Most Reported Accounts</h3><ResponsiveContainer width="100%" height={240}><BarChart data={accountData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="name" type="category" width={100} /><Tooltip /><Bar dataKey="reports" fill="var(--secondary)" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
          <div className="image-report-insights"><div className="glass-panel image-report-insight-card"><h3>AI Image Analysis</h3><p>Average confidence by detected category</p><div className="ai-category-list">{aiData.map(item => <div key={item.name}><span>{item.name}</span><strong>{item.score}%</strong><i><b style={{ width: `${item.score}%` }} /></i></div>)}</div></div><div className="glass-panel image-report-insight-card"><h3>Most Reported Images</h3><p>Images receiving the most user reports</p><div className="reported-image-list">{imageData.map(item => <button key={item.name} type="button" onClick={() => setSelectedImage({ src: item.image, title: item.name })}><img src={item.image} alt="Reported post" /><span>{item.name}</span><strong>{item.reports}</strong></button>)}</div></div></div>
          <div className="glass-panel recent-image-reports"><div className="recent-reports-heading"><div><h2>Recent Image Reports</h2><p>Review, resolve, or escalate reported posts.</p></div><span>{reports.length} records</span></div><div className="image-reports-table-wrap"><table className="image-reports-table"><thead><tr><th>Image</th><th>Reported Account</th><th>Reporting Account</th><th>Reason</th><th>Date/Time</th><th>Status</th><th>Action</th></tr></thead><tbody>{reports.map(report => <tr key={report.reportId} className={report.deleted ? 'report-deleted-row' : ''}><td>{report.postImage ? <button type="button" className="reported-image-button" onClick={() => setSelectedImage({ src: report.postImage, title: `@${report.reportedAccount} post` })}><img src={report.postImage} alt="View reported post" /></button> : <span className="deleted-image-label">Image deleted</span>}</td><td>@{report.reportedAccount}</td><td>@{report.reportingAccount}</td><td>{report.reason}</td><td>{new Date(report.createdAt).toLocaleString()}</td><td><span className={`report-status ${report.status.toLowerCase()}`}>{report.status}</span></td><td>{report.status === 'Pending' ? <div className="report-actions"><button className="report-resolve-btn" onClick={() => resolveReport(report.reportId)}><CheckCircle2 size={14} /> Resolve</button><button className="report-delete-btn" onClick={() => deleteReportImage(report.reportId, report.postId)}><Trash2 size={14} /> Delete</button></div> : <span className="resolved-label"><CheckCircle2 size={14} /> Closed</span>}</td></tr>)}</tbody></table></div></div>
          {selectedImage && <div className="image-preview-overlay" onClick={() => setSelectedImage(null)}><div className="image-preview-modal glass-panel" onClick={event => event.stopPropagation()}><button type="button" className="image-preview-close" onClick={() => setSelectedImage(null)} aria-label="Close image preview"><X size={22} /></button><img src={selectedImage.src} alt={selectedImage.title} /><p>{selectedImage.title}</p></div></div>}
        </>
      )}
    </div>
  )
}

export default ImageReports
