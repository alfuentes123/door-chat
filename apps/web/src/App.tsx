import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch('/api')

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`)
        }

        const data: { message: string } = await response.json()
        setMessage(data.message)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while loading the API message',
        )
      }
    }

    void fetchMessage()
  }, [])

  return (
    <main id="center">
      <h1>DoorChat</h1>
      <p>{error ? `Unable to load API message: ${error}` : (message ?? 'Loading')}</p>
    </main>
  )
}

export default App
