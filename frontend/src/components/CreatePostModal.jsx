import React, { useState, useRef } from 'react'
import { 
  X, Image as ImageIcon, Upload, AlertTriangle, CheckCircle2, 
  MapPin, Loader2, RefreshCw, Sparkles, ShieldCheck, ShieldAlert, Send, FileText
} from 'lucide-react'
import { api } from '../utils/api'

function CreatePostModal({ isOpen, onClose, currentUser, onPostCreated }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null) // { allowed, result, reason, extractedText, language, toxicityScore, translatedText }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setCaption('')
    setLocation('')
    setIsScanning(false)
    setScanResult(null)
    setIsSubmitting(false)
    setErrorMessage('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WebP).')
      return
    }

    setErrorMessage('')
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Data = event.target.result
      setPreviewUrl(base64Data)
      await runImageSafetyScan(file, base64Data)
    }
    reader.readAsDataURL(file)
  }

  const runImageSafetyScan = async (file, base64Data) => {
    setIsScanning(true)
    setScanResult(null)
    try {
      // Analyze with backend endpoint and instant browser OCR fallback
      const analysis = await api.analyzeImage(base64Data || file, '')
      setScanResult(analysis)
    } catch (err) {
      console.warn("Safety scan error:", err)
      try {
        const clientText = await api.performClientOcr(base64Data)
        const fallbackAnalysis = await api.analyzeImage(base64Data, clientText)
        setScanResult(fallbackAnalysis)
      } catch (fallbackErr) {
        console.error("Client fallback error:", fallbackErr)
      }
    } finally {
      setIsScanning(false)
    }
  }

  const handleSubmitPost = async (e) => {
    e.preventDefault()
    
    // Check if there is either an image or a caption
    if (!selectedFile && !caption.trim()) {
      setErrorMessage('Please write a caption or choose a photo to share.')
      return
    }

    // If an image was selected, ensure it has passed the safety scan
    if (selectedFile) {
      if (isScanning) {
        setErrorMessage('Please wait while safety inspection completes.')
        return
      }
      if (scanResult && !scanResult.allowed) {
        setErrorMessage('Cannot post: Image contains harmful content prohibited by safety policy.')
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      // Scan caption text for toxicity if present
      if (caption.trim()) {
        try {
          const textAnalysis = await api.analyzeComment(caption.trim())
          if (textAnalysis.isToxic) {
            setScanResult({
              allowed: false,
              result: "Toxic",
              confidence: textAnalysis.toxicityScore,
              reason: "Harmful or toxic content detected in caption text",
              extractedText: caption.trim(),
              language: textAnalysis.language || "English",
              toxicityScore: textAnalysis.toxicityScore,
              translatedText: textAnalysis.translatedText || caption.trim()
            })
            setErrorMessage('Cannot post: Caption contains toxic or abusive content prohibited by safety policy.')
            setIsSubmitting(false)
            return
          }
        } catch (scanErr) {
          console.warn("Caption text safety scan error:", scanErr)
        }
      }

      const postPayload = {
        username: currentUser,
        caption: caption.trim(),
        location: location.trim() || 'Worldwide',
        postImage: previewUrl || '',
        extractedText: scanResult?.extractedText || ''
      }

      const createdPost = await api.createPost(postPayload)
      if (onPostCreated) {
        onPostCreated(createdPost)
      }
      handleClose()
    } catch (err) {
      console.error("Failed to create post:", err)
      setErrorMessage(err.message || 'Failed to publish post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormEmpty = !selectedFile && !caption.trim()
  const isImageBlocked = selectedFile && scanResult && !scanResult.allowed

  return (
    <div className="modal-overlay post-modal-overlay">
      <div className="modal-content ig-post-modal glass-panel">
        {/* Header */}
        <div className="ig-modal-header">
          <div className="ig-modal-title">
            <Sparkles size={18} className="sparkle-icon" />
            <h3>Create New Post</h3>
          </div>
          <button className="ig-modal-close-btn" onClick={handleClose} title="Close" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="ig-modal-body">
          {/* Left / Top Section: Image Preview or Upload Dropzone */}
          <div className="ig-modal-media-section">
            {!previewUrl ? (
              <div 
                className="ig-upload-dropzone"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <div className="ig-upload-icon-wrapper">
                  <ImageIcon size={44} className="upload-main-icon" />
                  <Upload size={18} className="upload-sub-icon" />
                </div>
                <h4>Drag & Drop or Choose Photo</h4>
                <p>Supports PNG, JPG, WebP (Screenshots, Memes & Photos)</p>
                <button type="button" className="btn-secondary ig-browse-btn">
                  Select from Device
                </button>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <FileText size={13} />
                  <span>Photo is optional — you can also share a text-only post</span>
                </div>
                <span className="ig-safety-micro-badge">
                  <ShieldCheck size={14} /> Multilingual AI Pre-Upload Toxicity Scanner Active
                </span>
              </div>
            ) : (
              <div className="ig-image-preview-wrapper">
                <img src={previewUrl} alt="Post Preview" className="ig-preview-img" />

                {/* Scanning Animation Overlay */}
                {isScanning && (
                  <div className="ig-scanning-overlay">
                    <div className="scan-beam"></div>
                    <Loader2 size={36} className="spinner scanning-spinner" />
                    <h4>Scanning Image for Harassment & Toxicity...</h4>
                    <p>Detecting text inside image in <strong>Tamil, Hindi & English</strong></p>
                  </div>
                )}

                {/* Keep image replacement available while the selected photo remains in place. */}
                {!isScanning && (
                  <button 
                    type="button" 
                    className="ig-change-photo-btn"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Change Image"
                  >
                    <RefreshCw size={13} /> Change Image
                  </button>
                )}
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Right Section: Safety Feedback & Post Details */}
          <div className="ig-modal-details-section">
            {/* User Info Header */}
            <div className="ig-post-author-row">
              <img 
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser || 'user'}`} 
                alt={currentUser}
                className="ig-post-author-avatar" 
              />
              <div>
                <span className="ig-post-author-name">@{currentUser}</span>
                <span className="ig-post-author-sub">Public Post</span>
              </div>
            </div>

            {/* AI Safety Analysis Status Box for Image */}
            {previewUrl && (
              <div className="ig-safety-status-card">
                {isScanning ? (
                  <div className="ig-safety-loading">
                    <Loader2 size={18} className="spinner" />
                    <span>Running pre-upload safety inspection...</span>
                  </div>
                ) : scanResult ? (
                  scanResult.allowed ? (
                    /* SAFE / APPROVED */
                    <div className="ig-safety-banner safe">
                      <div className="ig-safety-banner-title">
                        <CheckCircle2 size={18} className="safe-icon" />
                        <strong>✓ Image Approved</strong>
                      </div>
                      <p className="ig-safety-desc">
                        No harmful or toxic content detected. You can safely share this post.
                      </p>
                      {scanResult.extractedText && (
                        <div className="ig-extracted-text-pill">
                          <small>Detected Text ({scanResult.language}):</small>
                          <span>"{scanResult.extractedText}"</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TOXIC / BLOCKED */
                    <div className="ig-safety-banner toxic">
                      <div className="ig-safety-banner-title">
                        <ShieldAlert size={20} className="toxic-icon" />
                        <strong>⚠️ Image Upload Blocked</strong>
                      </div>
                      <p className="ig-safety-desc">
                        This image contains potentially toxic, abusive, or harmful content. Please choose another image.
                      </p>
                      
                      {scanResult.extractedText && (
                        <div className="ig-toxic-text-details">
                          <span className="toxic-tag">
                            Detected {scanResult.language || 'Multilingual'} Harmful Text
                          </span>
                          <blockquote className="toxic-quote">
                            "{scanResult.extractedText}"
                          </blockquote>
                          {scanResult.translatedText && scanResult.translatedText !== scanResult.extractedText && (
                            <div className="toxic-trans">
                              <small>English Meaning:</small> "{scanResult.translatedText}"
                            </div>
                          )}
                        </div>
                      )}

                      <div className="ig-blocked-footer">
                        <span><strong>Status:</strong> Upload Prohibited</span>
                        <span><strong>Toxicity:</strong> {Math.round((scanResult.toxicityScore || 0.9) * 100)}%</span>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            )}

            {/* Post Meta Form (Caption & Location) */}
            <form onSubmit={handleSubmitPost} className="ig-post-form">
              <div className="ig-form-group">
                <label htmlFor="post-caption-input">Caption</label>
                <textarea 
                  id="post-caption-input"
                  rows={3}
                  placeholder="Write a caption or thought... (e.g. Exploring the hills ✨ #adventure)"
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  disabled={isSubmitting}
                  className="ig-caption-textarea"
                  style={{
                    opacity: 1,
                    cursor: isSubmitting ? 'not-allowed' : 'text'
                  }}
                />
              </div>

              <div className="ig-form-group">
                <label htmlFor="post-location-input">Location</label>
                <div className="ig-input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input 
                    id="post-location-input"
                    type="text"
                    placeholder="Add location (e.g. Chennai, India)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isSubmitting}
                    style={{
                      opacity: 1,
                      cursor: isSubmitting ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="ig-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Modal Actions Footer */}
              <div className="ig-modal-actions">
                <button 
                  type="button" 
                  className="ig-cancel-btn" 
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  <X size={15} />
                  <span>Cancel</span>
                </button>

                <button 
                  type="submit" 
                  className={`ig-submit-btn ${
                    isFormEmpty || isScanning || isImageBlocked
                      ? (isImageBlocked ? 'btn-blocked' : 'btn-disabled') 
                      : 'btn-active'
                  }`}
                  disabled={isFormEmpty || isScanning || isImageBlocked || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Publishing...</span>
                    </>
                  ) : isScanning ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>Inspecting Image...</span>
                    </>
                  ) : isImageBlocked ? (
                    <>
                      <ShieldAlert size={16} />
                      <span>Upload Blocked</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Share Post</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatePostModal
