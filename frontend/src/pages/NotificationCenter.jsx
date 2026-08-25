import React, { useEffect, useState } from 'react'
import { Bell, Check, Heart, MessageCircle, UserPlus, AtSign, ShieldAlert, Repeat2, UserRoundX, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  repost: Repeat2,
  follow: UserPlus,
  mention: AtSign,
  block: UserRoundX,
  report: ShieldAlert,
  activity: MoreHorizontal
}

function NotificationCenter({ currentUser }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.getNotifications(currentUser).then((data) => {
      if (mounted) setNotifications(data)
    }).finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [currentUser])

  const unreadCount = notifications.filter((item) => !item.read).length
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((item) => !item.read)
    : notifications

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await api.markNotificationRead(notification.notificationId)
      setNotifications((items) => items.map((item) => item.notificationId === notification.notificationId ? { ...item, read: true } : item))
    }
    if (notification.postId) {
      navigate(`/profile/${notification.postOwner || notification.actorUsername}?postId=${notification.postId}`)
    } else if (notification.actorUsername) {
      navigate(`/profile/${notification.actorUsername}`)
    }
  }

  const handleActorProfileClick = async (event, notification) => {
    event.stopPropagation()
    if (!notification.read) {
      await api.markNotificationRead(notification.notificationId)
      setNotifications((items) => items.map((item) => item.notificationId === notification.notificationId ? { ...item, read: true } : item))
    }
    if (notification.actorUsername && notification.actorUsername !== 'Safety Team') {
      navigate(`/profile/${notification.actorUsername}`)
    }
  }

  const markAllRead = async () => {
    await api.markAllNotificationsRead(currentUser)
    setNotifications((items) => items.map((item) => ({ ...item, read: true })))
  }

  return (
    <section className="notification-center">
      <div className="notification-page-header">
        <div>
          <p className="eyebrow-label">Your activity</p>
          <h1>Notifications</h1>
          <p>Stay close to the moments and people that matter.</p>
        </div>
        <div className="notification-header-icon"><Bell size={26} /></div>
      </div>
      <div className="notification-toolbar">
        <div className="notification-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread{unreadCount > 0 && <span>{unreadCount}</span>}</button>
        </div>
        {unreadCount > 0 && <button className="mark-read-btn" onClick={markAllRead}><Check size={15} /> Mark all read</button>}
      </div>
      <div className="notification-list glass-panel">
        {loading ? <p className="notification-empty">Loading notifications...</p> : visibleNotifications.length === 0 ? <p className="notification-empty">You are all caught up.</p> : visibleNotifications.map((notification) => {
          const Icon = ICONS[notification.type] || ICONS.activity
          return (
            <button key={notification.notificationId} className={`notification-item ${notification.read ? '' : 'unread'}`} onClick={() => handleNotificationClick(notification)}>
              <span
                className="notification-actor-profile"
                onClick={(event) => handleActorProfileClick(event, notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') handleActorProfileClick(event, notification)
                }}
                role="link"
                tabIndex={notification.actorUsername === 'Safety Team' ? -1 : 0}
                title={notification.actorUsername === 'Safety Team' ? 'Safety Team notification' : `View @${notification.actorUsername}`}
              >
                <img src={notification.actorProfilePic || `https://api.dicebear.com/7.x/adventurer/svg?seed=${notification.actorUsername || 'system'}`} alt="" />
              </span>
              <span className={`notification-type-icon ${notification.type}`}><Icon size={15} /></span>
              <span className="notification-copy"><strong className={notification.actorUsername !== 'Safety Team' ? 'notification-actor-name' : ''} onClick={(event) => notification.actorUsername !== 'Safety Team' && handleActorProfileClick(event, notification)}>{notification.actorUsername || 'Safety Team'}</strong> {notification.message}<small>{new Date(notification.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span>
              {notification.postImage && <img className="notification-post-thumb" src={notification.postImage} alt="Related post" />}
              {!notification.read && <span className="notification-unread-dot" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default NotificationCenter
