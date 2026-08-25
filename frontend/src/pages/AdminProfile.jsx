import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertTriangle, ShieldCheck, Heart, MessageCircle, Send, X, ShieldAlert, Trash2, MoreVertical, Link2, CheckCircle2 } from 'lucide-react'
import { api } from '../utils/api'

const GRID_IMAGES = [
  "/photos/164cecaf732f8b069124d966d8563031.jpg",
  "/photos/3b39d7dd5a89209a4f456693ca2efa9d.jpg",
  "/photos/4415c674c7306020ba6cc0853949db8f.jpg",
  "/photos/5f5ad7ba5b95589b119792e5196067a1.jpg",
  "/photos/97be6ca92464446f9df420a40fef2530.jpg",
  "/photos/cb67b417697a3d60ab9c7968786cf403.jpg",
  "/photos/e508c55f4963383cda09d7208fc8b3ea.jpg",
  "/photos/f5f8a45f67da9e79de40e437a3225c1d.jpg"
];

const MOCK_BIO_BIOS = [
  "Adventure seeker & visual storyteller ⛰️📸",
  "Living life one recipe at a time 🍕🍳 | Food Critic",
  "Tech developer, building scalable solutions 💻🤖",
  "Art therapist. Sketching out emotions 🎨✨",
  "Fitness motivator | Gym coach 💪🔥",
  "Capture the world through raw lenses 🌿🗺️",
  "Casual gamer and esports fan 🎮🎧",
  "Lover of fashion, aesthetics, and photography 👗🕶️"
];

function AdminProfile() {
  const { username } = useParams()
  const [profileData, setProfileData] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modal states
  const [selectedPost, setSelectedPost] = useState(null)
  const [postComments, setPostComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [postLikes, setPostLikes] = useState({ count: 0, liked: false })
  const [isModeratorMode, setIsModeratorMode] = useState(true)
  const [openMenuPostId, setOpenMenuPostId] = useState(null)
  const [postToDelete, setPostToDelete] = useState(null)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    fetchProfile()
    setSelectedPost(null)

    const handlePostDeleted = (event) => {
      const deletedPostId = event.detail?.postId
      if (!deletedPostId) return
      setUserPosts(prev => prev.filter(post => post.postId !== deletedPostId))
      setSelectedPost(prev => prev && prev.postId === deletedPostId ? null : prev)
    }

    const handleCommentDeleted = (event) => {
      const deletedCommentId = event.detail?.commentId
      if (!deletedCommentId) return
      setPostComments(prev => prev.filter(c => c.commentId !== deletedCommentId))
    }

    window.addEventListener('post-deleted', handlePostDeleted)
    window.addEventListener('comment-deleted', handleCommentDeleted)

    return () => {
      window.removeEventListener('post-deleted', handlePostDeleted)
      window.removeEventListener('comment-deleted', handleCommentDeleted)
    }
  }, [username])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await api.getUserProfile(username)
      setProfileData(data)
      
      let posts = [...(data.posts || [])]
      posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setUserPosts(posts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePostClick = async (post) => {
    setSelectedPost(post)
    setPostLikes({ count: post.likes, liked: false })
    setNewComment('')
    
    try {
      const allComments = await api.getComments({ postId: post.postId })
      allComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      setPostComments(allComments)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLikeToggle = () => {
    setPostLikes(prev => {
      const nextLiked = !prev.liked
      const nextCount = nextLiked ? prev.count + 1 : prev.count - 1
      return { count: nextCount, liked: nextLiked }
    })
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const savedComment = await api.createComment(selectedPost.postId, username, newComment)
      setPostComments(prev => [...prev, savedComment])
      setNewComment('')
      fetchProfile()
    } catch (err) {
      alert(`Comment rejected: ${err.message}`)
    }
  }

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
    setUserPosts(prev => prev.filter(p => p.postId !== idToDelete))
    setSelectedPost(null)
    setPostToDelete(null)

    try {
      await api.deletePost(idToDelete, 'admin')
      showToast("Post permanently deleted.")
      fetchProfile()
    } catch (err) {
      console.warn("Error deleting post:", err)
    }
  }

  const handleOpenDeleteComment = (commentId) => {
    setCommentToDelete(commentId)
  }

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return
    const commentId = commentToDelete
    setCommentToDelete(null)

    try {
      await api.deleteComment(commentId, 'admin')
      setPostComments(prev => prev.filter(c => c.commentId !== commentId))
      showToast("Comment permanently deleted.")
    } catch (err) {
      alert(`Error deleting comment: ${err.message}`)
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

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading Instagram profile...</p>
      </div>
    )
  }

  if (error || !profileData) {
    return (
      <div className="error-state glass-panel">
        <AlertTriangle className="error-icon" />
        <h3>Failed to Load Profile</h3>
        <p>{error || 'No profile data available'}</p>
        <Link to="/admin-feed" className="btn-primary">Back to Home Feed</Link>
      </div>
    )
  }

  const { profile, toxicPercentage } = profileData
  const userHash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const bioText = MOCK_BIO_BIOS[userHash % MOCK_BIO_BIOS.length]
  const isVerified = profile.verified || username === 'travel_with_me' || username === 'anjali_art' || username === 'fashion_guru'

  return (
    <div className="profile-page">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="toast-notification glass-panel">
          <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Instagram Profile Header */}
      <header className="instagram-profile-header">
        <div className="profile-avatar-container">
          <img 
            src={profile.profilePic || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`} 
            alt={profile.username} 
            className="instagram-avatar"
          />
        </div>
        
        <div className="profile-info-container">
          <div className="profile-username-row">
            <h2 className="profile-username">{profile.username}</h2>
            {isVerified && (
              <ShieldCheck 
                size={18} 
                className="verified-badge-icon" 
                style={{ fill: '#0095f6', color: '#fff', marginLeft: '6px' }}
                title="Verified Account"
              />
            )}
            
            <div className="profile-action-buttons" style={{ marginLeft: '20px', display: 'flex', gap: '10px' }}>
              <Link to={`/moderator/${profile.username}`} className="btn-outline instagram-btn" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                <ShieldAlert size={14} /> Trust Panel
              </Link>
              <span className={`badge-status ${profile.status.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {profile.status}
              </span>
            </div>
          </div>
          
          <ul className="profile-stats-list">
            <li><strong>{userPosts.length}</strong> posts</li>
            <li><strong>{profile.followers}</strong> followers</li>
            <li><strong>{profile.following}</strong> following</li>
            <li style={{ color: 'var(--critical)' }}>
              <strong>{toxicPercentage}%</strong> AI Toxicity
            </li>
          </ul>
          
          <div className="profile-bio-details">
            <h1 className="profile-display-name">{profile.displayName}</h1>
            <p className="profile-bio-text">{bioText}</p>
            <a href={`https://${profile.username}.com`} className="profile-link" target="_blank" rel="noreferrer">
              {profile.username}.com
            </a>
          </div>
        </div>
      </header>

      <div className="profile-tabs-divider">
        <span className="profile-tab active">POSTS</span>
      </div>

      <div className="instagram-grid">
        {userPosts.map(post => (
          <div 
            key={post.postId} 
            className="grid-post-item"
            onClick={() => handlePostClick(post)}
          >
            <img src={post.postImage} alt="Instagram grid click" />
            <div className="grid-post-overlay">
              <span className="overlay-metric">
                <Heart size={18} style={{ fill: '#fff' }} /> {post.likes}
              </span>
              <span className="overlay-metric" style={{ marginLeft: '15px' }}>
                <MessageCircle size={18} style={{ fill: '#fff' }} /> View Detail
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div 
            className="instagram-post-modal glass-panel" 
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal-btn" onClick={() => setSelectedPost(null)}>
              <X size={20} />
            </button>
            
            <div className="modal-image-col">
              <img src={selectedPost.postImage} alt="Post Zoom" className="modal-large-img" />
            </div>
            
            <div className="modal-comments-col">
              <div className="modal-header" style={{ position: 'relative' }}>
                <img 
                  src={selectedPost.profilePic || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPost.username}`} 
                  alt={selectedPost.username} 
                  className="post-avatar"
                />
                <div className="post-header-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <strong>{selectedPost.username}</strong>
                    {isVerified && <ShieldCheck size={12} style={{ fill: '#0095f6', color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedPost.location}</span>
                </div>

                {/* 3-Dot (⋮) Menu on post for Admin in modal */}
                <div className="post-menu-container" style={{ marginLeft: 'auto', marginRight: '8px' }}>
                  <button 
                    className="post-menu-btn"
                    onClick={(e) => handleToggleMenu(selectedPost.postId, e)}
                    title="Post Options"
                    aria-label="Post Options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {openMenuPostId === selectedPost.postId && (
                    <>
                      <div className="post-menu-backdrop" onClick={() => setOpenMenuPostId(null)} />
                      <div className="post-menu-dropdown glass-panel">
                        <button 
                          className="post-menu-item delete-item"
                          onClick={(e) => handleOpenDeleteModal(selectedPost, e)}
                        >
                          <Trash2 size={15} />
                          <span>Delete Post</span>
                        </button>
                        <button 
                          className="post-menu-item share-item"
                          onClick={(e) => handleCopyPostLink(selectedPost, e)}
                        >
                          <Link2 size={15} />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="modal-comments-stream">
                <div className="comment-item" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                  <img 
                    src={selectedPost.profilePic || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPost.username}`} 
                    alt={selectedPost.username} 
                    className="post-avatar"
                    style={{ width: '28px', height: '28px' }}
                  />
                  <div className="comment-item-content">
                    <strong>{selectedPost.username}</strong>
                    <span>{selectedPost.caption}</span>
                    <div className="comment-meta">{formatTime(selectedPost.timestamp)}</div>
                  </div>
                </div>
                
                {postComments.map(comment => (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{comment.commentBy}</strong>
                          {comment.commentBy === 'travel_with_me' && <ShieldCheck size={10} style={{ fill: '#0095f6', color: '#fff' }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {comment.language ? `${comment.language}` : 'English'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteComment(comment.commentId)}
                            title="Delete Comment"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--critical)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
                  </div>
                ))}
              </div>
              
              <div className="modal-actions-area">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button 
                    className={`like-button ${postLikes.liked ? 'liked' : ''}`}
                    onClick={handleLikeToggle}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Heart className="action-icon" size={20} />
                    <strong>{postLikes.count} Likes</strong>
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatTime(selectedPost.timestamp)}
                  </span>
                </div>
                
                <form onSubmit={handleCommentSubmit} className="modal-comment-input-form">
                  <input 
                    type="text" 
                    placeholder="Add a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="glass-input"
                    style={{ borderRadius: 0, border: 'none', background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  />
                  <button type="submit" className="btn-primary" style={{ borderRadius: 0, boxShadow: 'none' }}>
                    <Send size={14} /> Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {postToDelete && (
        <div className="delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="delete-modal-box glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon-wrap">
              <Trash2 size={26} className="delete-modal-icon" />
            </div>
            <h3 className="delete-modal-title">Delete Post?</h3>
            <p className="delete-modal-message">
              As an Administrator, are you sure you want to permanently delete this post? It will be completely removed from all feeds, reposts, and database records.
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

export default AdminProfile
