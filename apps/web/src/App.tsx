import { useEffect, useState, type FormEvent } from 'react'
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

type AuthMode = 'register' | 'login' | null

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred'
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

  const signedInUserId = currentUser?.id
  const openChatUserId = selectedUser?.id

  useEffect(() => {
    if (!signedInUserId) return

    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [signedInUserId])

  useEffect(() => {
    if (!signedInUserId || !openChatUserId) return

    let active = true

    const refreshOpenChat = () => {
      void api<Message[]>(`/chat/${openChatUserId}/messages`)
        .then((updatedMessages) => {
          if (!active) return
          setMessages(updatedMessages)
          setMessagesError(null)
        })
        .catch((error) => {
          if (active) setMessagesError(errorMessage(error))
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
    if (!selectedUser) return

    let active = true

    const loadMessages = async () => {
      setLoadingMessages(true)
      setMessagesError(null)
      setSendError(null)

      try {
        const history = await api<Message[]>(`/chat/${selectedUser.id}/messages`)
        if (active) setMessages(history)
      } catch (error) {
        if (active) setMessagesError(errorMessage(error))
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [selectedUser])

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
    setLoginError(null)

    try {
      await api('/auth/login', 'POST', loginForm)
      const user = await api<User | null>('/auth/me')
      if (!user) throw new Error('Unable to load your account')

      setCurrentUser(user)
      setAuthenticated(true)
      await loadUsers()
    } catch (error) {
      setLoginError(errorMessage(error))
    }
  }

  const handleLogout = async () => {
    setLogoutError(null)

    try {
      await api('/auth/logout', 'POST')
      setCurrentUser(null)
      setUsers([])
      setSelectedUser(null)
      setMessages([])
      setAuthenticated(false)
      setAuthMode(null)
      setDraft('')
    } catch (error) {
      setLogoutError(errorMessage(error))
    }
  }

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedUser || sending) return

    setSending(true)
    setSendError(null)

    try {
      const clientMessageId = crypto.randomUUID()
      const savedMessage = await api<Message>('/chat/messages', 'POST', {
        recipientId: selectedUser.id,
        clientMessageId,
        content: draft,
      })

      setMessages((currentMessages) => (
        currentMessages.some((message) => message.id === savedMessage.id)
          ? currentMessages
          : [...currentMessages, savedMessage]
      ))
      setDraft('')
    } catch (error) {
      setSendError(errorMessage(error))
    } finally {
      setSending(false)
    }
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
            <button type="submit">Sign in</button>
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
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </div>
              {sendError && <p className="error" role="alert">{sendError}</p>}
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
