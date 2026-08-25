import React, { useState } from 'react'
import { Flag, X } from 'lucide-react'

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or symbols',
  'Violence or dangerous content',
  'Nudity or sexual content',
  'Spam or misleading content',
  'Other'
]

function ReportPostModal({ post, currentUser, onClose, onSubmitted }) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const submittedReason = reason === 'Other' ? customReason.trim() : reason
    if (!submittedReason) {
      setError('Select a reason before submitting your report.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onSubmitted({ postId: post.postId, reporter: currentUser, reason: submittedReason })
    } catch (err) {
      setError(err.message || 'Could not submit the report.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <form className="report-modal-box glass-panel" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-icon"><Flag size={20} /></div>
          <div>
            <h2>Report Post</h2>
            <p>Help keep QELEVIXA safe.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close report dialog"><X size={18} /></button>
        </div>
        <label className="report-modal-label" htmlFor="report-reason">Why are you reporting this post?</label>
        <select id="report-reason" className="report-reason-select" value={reason} onChange={(event) => { setReason(event.target.value); setError('') }} disabled={isSubmitting}>
          <option value="">Select a reason</option>
          {REPORT_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {reason === 'Other' && (
          <textarea
            className="report-custom-reason"
            value={customReason}
            onChange={(event) => { setCustomReason(event.target.value); setError('') }}
            placeholder="Tell us why you are reporting this post..."
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
            autoFocus
          />
        )}
        {error && <p className="report-modal-error">{error}</p>}
        <div className="report-modal-actions">
          <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn-modal-delete" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Report'}</button>
        </div>
      </form>
    </div>
  )
}

export default ReportPostModal
