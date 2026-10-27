import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from './lib/api'
import './App.css'
import { socket } from './lib/socket';


type User = {
  id: string
  username: string
  displayName: string
}

type Message = {
  id: string
  senderId: string
  recipientId: string
  clientMessageId: string
  content: string
  createdAt: string
}

type PendingSend = {
  recipientId: string
  clientMessageId: string
  content: string
}

type AuthMode = 'register' | 'login' | null

function errorMessage(error: unknown, fallback = 'An unexpected error occurred') {
  return error instanceof Error ? error.message : fallback
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const [authenticated, setAuthenticated] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [registerForm, setRegisterForm] = useState({
    username: '',
    displayName: '',
    password: '',
  })
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [draft, setDraft] = useState('')
  const [startupError, setStartupError] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null)
  const [sendNeedsCorrection, setSendNeedsCorrection] = useState(false)
  const [socketConnected, setSocketConnected] = useState(socket.connected)
  const sendRequest = useRef<PendingSend | null>(null)
  const activeChatUserId = useRef<string | undefined>(undefined)
  const historyRequestId = useRef(0)

  const signedInUserId = currentUser?.id
  const openChatUserId = selectedUser?.id

  useEffect(() => {
    let active = true

    const onConnect = () => {
      setSocketConnected(true)
      if (!signedInUserId || !openChatUserId) return

      const requestId = ++historyRequestId.current
      void api<Message[]>(`/chat/${openChatUserId}/messages`)
        .then((saved) => {
          if (!active || requestId !== historyRequestId.current) return
          setMessages(saved)
          setMessagesError(null)
          setLoadingMessages(false)
        })
        .catch((error) => {
          if (active && requestId === historyRequestId.current) {
            setMessagesError(errorMessage(error, 'Could not load messages'))
            setLoadingMessages(false)
          }
        })
    }
    const onDisconnect = () => setSocketConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      active = false
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [signedInUserId, openChatUserId])

  useEffect(() => {
    if (!signedInUserId) return

    socket.connect()
    return () => {
      sendRequest.current = null
      socket.disconnect()
    }
  }, [signedInUserId])

  useEffect(() => {
    if (!signedInUserId || !openChatUserId) return

    let active = true

    const refreshOpenChat = () => {
      const requestId = ++historyRequestId.current
      void api<Message[]>(`/chat/${openChatUserId}/messages`)
        .then((updatedMessages) => {
          if (!active || requestId !== historyRequestId.current) return
          setMessages(updatedMessages)
          setMessagesError(null)
          setLoadingMessages(false)
        })
        .catch((error) => {
          if (active && requestId === historyRequestId.current) {
            setMessagesError(errorMessage(error, 'Could not load messages'))
            setLoadingMessages(false)
          }
        })
    }

    socket.on('messages.changed', refreshOpenChat)
    return () => {
      active = false
      socket.off('messages.changed', refreshOpenChat)
    }
  }, [signedInUserId, openChatUserId])

  const loadUsers = async () => {
    setUsersError(null)

    try {
      const availableUsers = await api<User[]>('/users')
      setUsers(availableUsers)
      setSelectedUser(availableUsers[0] ?? null)
    } catch (error) {
      setUsersError(errorMessage(error))
    }
  }

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await api<User | null>('/auth/me')

        if (!user) {
          setAuthenticated(false)
          return
        }

        setCurrentUser(user)
        setAuthenticated(true)
        await loadUsers()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setAuthenticated(false)
        } else {
          setStartupError(errorMessage(error))
        }
      } finally {
        setInitializing(false)
      }
    }

    void loadCurrentUser()
  }, [])

  useEffect(() => {
    activeChatUserId.current = openChatUserId
    if (!signedInUserId || !openChatUserId) return

    let active = true

    const loadMessages = async () => {
      setLoadingMessages(true)
      setMessagesError(null)
      setMessages([])
      const requestId = ++historyRequestId.current

      try {
        const history = await api<Message[]>(`/chat/${openChatUserId}/messages`)
        if (active && requestId === historyRequestId.current) setMessages(history)
      } catch (error) {
        if (active && requestId === historyRequestId.current) {
          setMessagesError(errorMessage(error, 'Could not load messages'))
        }
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [signedInUserId, openChatUserId])

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRegisterError(null)

    try {
      await api('/auth/register', 'POST', registerForm)
      const user = await api<User | null>('/auth/me')
      if (!user) throw new Error('Unable to load your account')

      setCurrentUser(user)
      setAuthenticated(true)
      await loadUsers()
    } catch (error) {
      setRegisterError(errorMessage(error))
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSigningIn) return

    setIsSigningIn(true)
    setLoginError(null)

    try {
      await api('/auth/login', 'POST', loginForm)
      const user = await api<User | null>('/auth/me')
      if (!user) throw new Error('Unable to load your account')

      setCurrentUser(user)
      setAuthenticated(true)
      await loadUsers()
    } catch (error) {
      setLoginError(errorMessage(error, 'Sign-in failed'))
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleLogout = async () => {
    setLogoutError(null)

    try {
      await api('/auth/logout', 'POST')
      sendRequest.current = null
      setCurrentUser(null)
      setUsers([])
      setSelectedUser(null)
      setMessages([])
      setAuthenticated(false)
      setAuthMode(null)
      setDraft('')
      setPendingSend(null)
      setSending(false)
      setSendError(null)
      setSendNeedsCorrection(false)
      setLoadingMessages(false)
      setMessagesError(null)
      setSocketConnected(false)
    } catch (error) {
      setLogoutError(errorMessage(error))
    }
  }

  const submitPendingSend = async (payload: PendingSend) => {
    if (!signedInUserId || sending || sendRequest.current || sendNeedsCorrection) return

    sendRequest.current = payload
    setSending(true)
    setSendError(null)

    try {
      const savedMessage = await api<Message>('/chat/messages', 'POST', payload)
      if (sendRequest.current !== payload) return

      if (activeChatUserId.current === payload.recipientId) {
        setMessages((currentMessages) => (
          currentMessages.some((message) => message.id === savedMessage.id)
            ? currentMessages
            : [...currentMessages, savedMessage]
        ))
      }
      setDraft('')
      setPendingSend(null)
      setSendNeedsCorrection(false)
    } catch (error) {
      if (sendRequest.current !== payload) return
      setSendError(errorMessage(error, 'Send failed'))
      setSendNeedsCorrection(error instanceof ApiError && (error.status === 400 || error.status === 409))
    } finally {
      if (sendRequest.current === payload) {
        sendRequest.current = null
        setSending(false)
      }
    }
  }

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signedInUserId || !selectedUser || !draft.trim() || pendingSend || sending || sendRequest.current) return

    const payload: PendingSend = {
      recipientId: selectedUser.id,
      clientMessageId: crypto.randomUUID(),
      content: draft,
    }
    setPendingSend(payload)
    void submitPendingSend(payload)
  }

  if (initializing) {
    return (
      <main className="app app--centered">
        <h1>DoorChat</h1>
        <p>Loading your account…</p>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="app app--centered">
        <h1>DoorChat</h1>
        {startupError && <p className="error" role="alert">{startupError}</p>}
        <div className="auth-choices" aria-label="Account actions">
          <button type="button" onClick={() => setAuthMode('register')}>Register</button>
          <button type="button" onClick={() => setAuthMode('login')}>Sign in</button>
        </div>

        {authMode === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2>Register</h2>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              name="username"
              autoComplete="username"
              required
              value={registerForm.username}
              onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })}
            />
            <label htmlFor="register-display-name">Display name</label>
            <input
              id="register-display-name"
              name="displayName"
              required
              value={registerForm.displayName}
              onChange={(event) => setRegisterForm({ ...registerForm, displayName: event.target.value })}
            />
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={registerForm.password}
              onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
            />
            <button type="submit">Create account</button>
            {registerError && <p className="error" role="alert">{registerError}</p>}
          </form>
        )}

        {authMode === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              name="username"
              autoComplete="username"
              required
              value={loginForm.username}
              onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={loginForm.password}
              onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
            />
            <button type="submit" disabled={isSigningIn}>
              {isSigningIn ? 'Signing in...' : 'Sign in'}
            </button>
            {loginError && <p className="error" role="alert">{loginError}</p>}
          </form>
        )}
      </main>
    )
  }

  return (
    <main className="app chat-layout">
      <aside className="sidebar">
        <h1>DoorChat</h1>
        <h2>Available users</h2>
        {usersError && <p className="error" role="alert">{usersError}</p>}
        {!usersError && users.length === 0 && <p>No other users are available.</p>}
        <div className="user-list">
          {users.map((user) => (
            <button
              type="button"
              key={user.id}
              aria-label={`Chat with ${user.displayName}`}
              aria-pressed={selectedUser?.id === user.id}
              onClick={() => setSelectedUser(user)}
            >
              {user.displayName}
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-panel" aria-label="Selected chat">
        <header className="chat-header">
          {currentUser && <p className="current-user">Signed in as {currentUser.displayName}</p>}
          <p role="status">{socketConnected ? 'Live updates connected' : 'Reconnecting...'}</p>
          <button className="logout-button" type="button" onClick={handleLogout}>Log out</button>
        </header>
        {logoutError && <p className="error logout-error" role="alert">{logoutError}</p>}
        {selectedUser ? (
          <>
            <div className="messages" aria-live="polite">
              <h2 className="chat-recipient">{selectedUser.displayName}</h2>
              {loadingMessages && <p>Loading messages…</p>}
              {messagesError && <p className="error" role="alert">{messagesError}</p>}
              {!loadingMessages && !messagesError && messages.length === 0 && (
                <p>No messages yet.</p>
              )}
              {!loadingMessages && messages.map((message) => (
                <article
                  className={`message ${message.senderId === currentUser?.id ? 'message--own' : ''}`}
                  key={message.id}
                >
                  <p>{message.content}</p>
                </article>
              ))}
            </div>
            <form className="composer" onSubmit={handleSend}>
              <label htmlFor="message-content">Message</label>
              <div className="composer-row">
                <input
                  id="message-content"
                  name="content"
                  required
                  maxLength={2000}
                  value={draft}
                  disabled={!!pendingSend}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" disabled={sending || !!pendingSend}>
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </div>
              {sendError && <p className="error" role="alert">{sendError}</p>}
              {pendingSend && (
                <p>Pending message to {users.find((user) => user.id === pendingSend.recipientId)?.displayName ?? 'the original recipient'}.</p>
              )}
              {pendingSend && !sending && (
                <>
                  {sendNeedsCorrection ? (
                    <p>Discard this attempt to correct the message before sending again.</p>
                  ) : (
                    <button type="button" onClick={() => void submitPendingSend(pendingSend)}>Retry</button>
                  )}
                  <button type="button" onClick={() => {
                    setPendingSend(null)
                    setSendError(null)
                    setSendNeedsCorrection(false)
                  }}>Discard retry</button>
                </>
              )}
            </form>
          </>
        ) : (
          <p>Select a user to start chatting.</p>
        )}
      </section>
    </main>
  )
}

export default App
