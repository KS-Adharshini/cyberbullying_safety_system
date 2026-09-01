import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, MapPin, AlertTriangle, Send, ShieldCheck, Trash2, EyeOff, MoreVertical, Link2, CheckCircle2, X } from 'lucide-react'
import { api } from '../utils/api'

function AdminHomeFeed({ currentUser }) {
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState({}) // mapped by postId
  const [newCommentText, setNewCommentText] = useState({}) // mapped by postId
  const [likesState, setLikesState] = useState({}) // mapped by postId
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hiddenComments, setHiddenComments] = useState([]) // admin hidden comments list
  const [aiStatus, setAiStatus] = useState({ isLoading: false, status: '', isReady: false })
  const [reposts, setReposts] = useState([])
  const [openMenuPostId, setOpenMenuPostId] = useState(null)
  const [postToDelete, setPostToDelete] = useState(null)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    fetchPosts()
    fetchComments()
    fetchAdminReposts()

    const handlePostDeleted = (event) => {
      const deletedPostId = event.detail?.postId
      if (!deletedPostId) return
      setPosts(prev => prev.filter(post => post.postId !== deletedPostId))
      setReposts(prev => prev.filter(repost => repost.postId !== deletedPostId))
      setComments(prev => {
        const next = { ...prev }
        delete next[deletedPostId]
        return next
      })
      setLikesState(prev => {
        const next = { ...prev }
        delete next[deletedPostId]
        return next
      })
    }

    const handleCommentDeleted = (event) => {
      const deletedCommentId = event.detail?.commentId
      if (!deletedCommentId) return
      setComments(prev => {
        const next = {}
        Object.keys(prev).forEach(postId => {
          next[postId] = prev[postId].filter(c => c.commentId !== deletedCommentId)
        })
        return next
      })
    }

    window.addEventListener('post-deleted', handlePostDeleted)
    window.addEventListener('comment-deleted', handleCommentDeleted)

    // Check initial AI model status
    try {
      const status = api.getAiStatus()
      setAiStatus(status)
    } catch (err) {
      console.error(err)
    }

    return () => {
      window.removeEventListener('post-deleted', handlePostDeleted)
      window.removeEventListener('comment-deleted', handleCommentDeleted)
    }
  }, [])

  const fetchAdminReposts = () => {
    api.getAdminReposts().then(setReposts).catch(err => console.error('Error fetching reposts:', err))
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const data = await api.getPosts()
      setPosts(data)
      
      // Initialize likes state
      const initialLikes = {}
      data.forEach(p => {
        initialLikes[p.postId] = { count: p.likes, liked: false }
      })
      setLikesState(initialLikes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const data = await api.getComments()
      
      // Group comments by postId
      const grouped = {}
      data.forEach(c => {
        if (!grouped[c.postId]) grouped[c.postId] = []
        grouped[c.postId].push(c)
      })
      
      // Sort comments inside each post chronologically (oldest first)
      Object.keys(grouped).forEach(postId => {
        grouped[postId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      })
      
      setComments(grouped)
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  const handleLike = (postId) => {
    setLikesState(prev => {
      const current = prev[postId]
      if (current.liked) {
        return { ...prev, [postId]: { count: current.count - 1, liked: false } }
      } else {
        return { ...prev, [postId]: { count: current.count + 1, liked: true } }
      }
    })
  }

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault()
    const text = newCommentText[postId]
    if (!text || !text.trim()) return

    try {
      const savedComment = await api.createComment(postId, currentUser, text)
      
      // Add new comment to UI immediately
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), savedComment]
      }))

      // Clear input
      setNewCommentText(prev => ({ ...prev, [postId]: '' }))
    } catch (err) {
      alert(`Error posting comment: ${err.message}`)
    }
  }

  const handleTextChange = (postId, val) => {
    setNewCommentText(prev => ({ ...prev, [postId]: val }))
  }

  // Admin action: Delete Comment
  const handleOpenDeleteComment = (postId, commentId) => {
    setCommentToDelete({ postId, commentId })
  }

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return
    const { postId, commentId } = commentToDelete
    setCommentToDelete(null)

    try {
      await api.deleteComment(commentId, currentUser || 'admin')
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.commentId !== commentId)
      }))
      showToast("Comment permanently deleted.")
    } catch (err) {
      alert(`Error deleting comment: ${err.message}`)
    }
  }

  // Admin action: Delete Post
  const handleToggleMenu = (postId, e) => {
    if (e) e.stopPropagation()
    setOpenMenuPostId(prev => prev === postId ? null : postId)
  }

  const handleOpenDeleteModal = (post, e) => {
    if (e) e.stopPropagation()
    setOpenMenuPostId(null)
    setPostToDelete(post)
  }

  const handleCancelDelete = () => {
    setPostToDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!postToDelete) return
    const idToDelete = postToDelete.postId
    setPosts(prev => prev.filter(p => p.postId !== idToDelete))
    setReposts(prev => prev.filter(r => r.postId !== idToDelete))
    setPostToDelete(null)
    
    try {
      await api.deletePost(idToDelete, currentUser || 'admin')
      showToast("Post and all references permanently deleted.")
    } catch (err) {
      console.warn("Error deleting post:", err)
    }
  }

  const handleCopyPostLink = (post, e) => {
    if (e) e.stopPropagation()
    setOpenMenuPostId(null)
    try {
      navigator.clipboard?.writeText?.(window.location.origin + `/#/profile/${post.username}`)
    } catch (err) {
      console.warn(err)
    }
    showToast('Post link copied to clipboard!')
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  // Admin action: Visually hide comment
  const handleAdminHideComment = (commentId) => {
    if (!window.confirm("Do you want to hide this comment from the feed?")) return
    setHiddenComments(prev => [...prev, commentId])
  }

  // Admin action: Warn User
  const handleAdminWarnUser = async (username, commentText) => {
    const reason = window.prompt(`Issue an official warning to @${username} for comment: "${commentText}". Reason:`, "Repeated Harassment / Abusive behavior.")
    if (!reason) return
    try {
      await api.warnUser(username, reason, `Flagged on feed for posting: "${commentText}"`)
      alert(`Warning issued successfully to @${username}.`)
    } catch (err) {
      alert(`Error warning user: ${err.message}`)
    }
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your feed...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state glass-panel">
        <AlertTriangle className="error-icon" />
        <h3>Failed to Load Feed</h3>
        <p>{error}</p>
        <button onClick={fetchPosts} className="btn-primary">Try Again</button>
      </div>
    )
  }

  return (
    <div className="feed-page">
      <div className="page-header">
        <h1 className="gradient-text">Admin Home Feed</h1>
        <p>Moderation View: Highlighted posts and inline moderation actions.</p>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="toast-notification glass-panel">
          <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Model Loading Status Indicator */}
      {aiStatus.isLoading && (
        <div style={{ padding: '10px 16px', background: 'rgba(235, 140, 0, 0.1)', border: '1px solid rgba(235, 140, 0, 0.2)', borderRadius: '8px', color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="spinner-mini" style={{ width: '14px', height: '14px', border: '2px solid var(--warning)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span><strong>AI Models Loading:</strong> {aiStatus.status} (Downloading from Hugging Face Hub... Once complete, this comment section is fully protected.)</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {aiStatus.status.includes("Failed") && (
        <div style={{ padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
          <span><strong>AI Models Loading Failed:</strong> {aiStatus.status}. Fallback rules active.</span>
        </div>
      )}
      {aiStatus.isReady && (
        <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', color: 'var(--success)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
          <span>Translation and Classifier active.</span>
        </div>
      )}

      {reposts.length > 0 && (
        <div className="admin-reposts-panel glass-panel">
          <div className="admin-reposts-heading"><h2><Repeat2 size={20} /> Recent Reposts</h2><span>{reposts.length} activities</span></div>
          <div className="admin-reposts-list">
            {reposts.map(repost => (
              <div className="admin-repost-item" key={repost.repostId}>
                <img src={repost.postImage} alt="Reposted post" />
                <div><strong>@{repost.reposter}</strong> reposted <strong>@{repost.originalOwner}</strong>'s post<small>{new Date(repost.timestamp).toLocaleString()}</small></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="feed-layout">
        {posts.map(post => {
          const postComments = comments[post.postId] || []
          // Filter comments that have been hidden by the admin session
          const visibleComments = postComments.filter(c => !hiddenComments.includes(c.commentId))
          const likeInfo = likesState[post.postId] || { count: post.likes, liked: false }
          
          return (
            <article key={post.postId} className="post-card glass-panel">
              {/* Header */}
              <div className="post-header">
                <img 
                  src={post.profilePic || `https://api.dicebear.com/7.x/adventurer/svg?seed=${post.username}`} 
                  alt={post.username} 
                  className="post-avatar"
                />
                <div className="post-user-info">
                  <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <h4>{post.username}</h4>
                    {(post.username === 'travel_with_me' || post.username === 'anjali_art' || post.username === 'fashion_guru') && (
                      <ShieldCheck size={14} className="verified-badge-icon" style={{ fill: '#0095f6', color: '#fff' }} />
                    )}
                  </Link>
                  <span>{post.location}</span>
                </div>

                {/* 3-Dot (⋮) Menu on EVERY post for Admin */}
                <div className="post-menu-container">
                  <button 
                    className="post-menu-btn"
                    onClick={(e) => handleToggleMenu(post.postId, e)}
                    title="Post Options"
                    aria-label="Post Options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {openMenuPostId === post.postId && (
                    <>
                      <div className="post-menu-backdrop" onClick={() => setOpenMenuPostId(null)} />
                      <div className="post-menu-dropdown glass-panel">
                        <button 
                          className="post-menu-item delete-item"
                          onClick={(e) => handleOpenDeleteModal(post, e)}
                        >
                          <Trash2 size={15} />
                          <span>Delete Post</span>
                        </button>
                        <button 
                          className="post-menu-item share-item"
                          onClick={(e) => handleCopyPostLink(post, e)}
                        >
                          <Link2 size={15} />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Image or Text Body */}
              {post.postImage ? (
                <div className="post-image-container">
                  <img 
                    src={post.postImage} 
                    alt="Post Image" 
                    className="post-image"
                  />
                </div>
              ) : (
                <div className="post-text-body-card">
                  <p className="post-text-body-content">{post.caption}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="post-actions">
                <button 
                  className={`like-button ${likeInfo.liked ? 'liked' : ''}`}
                  onClick={() => handleLike(post.postId)}
                >
                  <Heart className="action-icon" />
                  <span>{likeInfo.count} Likes</span>
                </button>
                <div className="like-button">
                  <MessageCircle className="action-icon" />
                  <span>{visibleComments.length} Comments</span>
                </div>
              </div>

              {/* Caption */}
              <div className="post-caption">
                <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <strong>{post.username}</strong>
                </Link>
                <span>{post.caption}</span>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>
                  {formatTime(post.timestamp)}
                </div>
              </div>

              {/* Comments Subsection */}
              <div className="post-comments-section">
                <div className="comment-list">
                  {visibleComments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px 0' }}>
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  ) : (
                    visibleComments.map(comment => (
                      <div 
                        key={comment.commentId} 
                        className={`comment-item ${comment.isToxic ? 'toxic-highlight' : ''}`}
                        style={{ alignItems: 'flex-start', padding: '12px 0' }}
                      >
                        <img 
                          src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.commentBy}`}
                          alt={comment.commentBy}
                          className="post-avatar"
                          style={{ width: '28px', height: '28px' }}
                        />
                        <div className="comment-item-content" style={{ width: '100%', marginLeft: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Link to={`/profile/${comment.commentBy}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              <strong style={{ fontSize: '0.9rem' }}>{comment.commentBy}</strong>
                            </Link>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {comment.language ? `${comment.language}` : 'English'}
                            </span>
                          </div>
                          
                          {/* 1. Original text */}
                          <div style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            "{comment.originalText || comment.commentText}"
                          </div>
                          
                          {/* 2. Translation block */}
                          {comment.language && comment.language !== 'English' && comment.translatedText && (
                            <div style={{ margin: '6px 0', paddingLeft: '8px', borderLeft: '2px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase' }}>
                                ↓ Translated English
                              </span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                "{comment.translatedText}"
                              </span>
                            </div>
                          )}
                          
                          {/* 3. Badges (Toxicity, Sentiment, Emotion) */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {/* Toxicity */}
                            <span className={`badge-status ${comment.isToxic ? 'warned' : 'normal'}`} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                              Toxicity: {comment.toxicity?.score !== undefined ? `${(comment.toxicity.score * 100).toFixed(0)}%` : (comment.toxicityScore !== undefined ? `${(comment.toxicityScore * 100).toFixed(0)}%` : '0%')} ({comment.isToxic ? 'Toxic' : 'Safe'})
                            </span>
                            
                            {/* Sentiment */}
                            {comment.sentiment && (
                              <span className="badge-status" style={{ 
                                fontSize: '0.65rem', 
                                padding: '1px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(255, 255, 255, 0.04)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: (comment.sentiment.label || comment.sentiment).toLowerCase() === 'negative' ? 'var(--critical)' : ((comment.sentiment.label || comment.sentiment).toLowerCase() === 'positive' ? 'var(--success)' : 'var(--text-secondary)')
                              }}>
                                Sentiment: {comment.sentiment.label || comment.sentiment}
                                {comment.sentiment.confidence !== undefined ? ` (${(comment.sentiment.confidence * 100).toFixed(0)}%)` : ''}
                              </span>
                            )}
                            
                            {/* Emotion */}
                            {comment.emotion && (
                              <span className="badge-status" style={{ 
                                fontSize: '0.65rem', 
                                padding: '1px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(255, 255, 255, 0.04)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-primary)'
                              }}>
                                Emotion: {comment.emotion.emotion || comment.emotion}
                                {comment.emotion.confidence !== undefined ? ` (${(comment.emotion.confidence * 100).toFixed(0)}%)` : ''}
                              </span>
                            )}
                          </div>
                          
                          <div className="comment-meta" style={{ marginTop: '6px' }}>
                            <span>{formatTime(comment.timestamp)}</span>
                          </div>
                        </div>

                        {/* Admin Actions */}
                        <div className="comment-admin-actions" style={{ marginLeft: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-danger-outline"
                              onClick={() => handleOpenDeleteComment(post.postId, comment.commentId)}
                              style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Permanently Delete Comment"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleAdminHideComment(comment.commentId)}
                              style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Hide from regular feed"
                            >
                              <EyeOff size={12} /> Hide
                            </button>
                          </div>
                          <button 
                            onClick={() => handleAdminWarnUser(comment.commentBy, comment.originalText || comment.commentText)}
                            title="Warn User"
                            className="admin-action-btn warn-btn"
                          >
                            <AlertTriangle size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Form */}
                <form 
                  onSubmit={(e) => handleCommentSubmit(e, post.postId)}
                  className="comment-form"
                >
                  <input 
                    type="text" 
                    placeholder="Write a comment..." 
                    value={newCommentText[post.postId] || ''}
                    onChange={(e) => handleTextChange(post.postId, e.target.value)}
                    className="glass-input"
                  />
                  <button type="submit" className="btn-primary">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </article>
          )
        })}
      </div>

      {/* Delete Post Confirmation Modal */}
      {postToDelete && (
        <div className="delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="delete-modal-box glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon-wrap">
              <Trash2 size={26} className="delete-modal-icon" />
            </div>
            <h3 className="delete-modal-title">Delete Post?</h3>
            <p className="delete-modal-message">
              As an Administrator, are you sure you want to permanently delete this post? It will be removed from all feeds, reposts, and database records.
            </p>
            <div className="delete-modal-actions">
              <button className="btn-modal-delete" onClick={handleConfirmDelete}>
                Delete Post
              </button>
              <button className="btn-modal-cancel" onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {commentToDelete && (
        <div className="delete-modal-overlay" onClick={() => setCommentToDelete(null)}>
          <div className="delete-modal-box glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon-wrap">
              <Trash2 size={26} className="delete-modal-icon" />
            </div>
            <h3 className="delete-modal-title">Delete Comment?</h3>
            <p className="delete-modal-message">
              As an Administrator, are you sure you want to permanently delete this comment?
            </p>
            <div className="delete-modal-actions">
              <button className="btn-modal-delete" onClick={handleConfirmDeleteComment}>
                Delete Comment
              </button>
              <button className="btn-modal-cancel" onClick={() => setCommentToDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminHomeFeed
