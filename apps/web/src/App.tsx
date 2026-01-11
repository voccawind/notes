// ORBIT Notes - Main Application
import { useEffect, useState } from 'react'
import { WorkspaceLayout } from './components'
import { db, getAllOrbits } from './db'
import type { UUID } from '@orbit/shared-types'
import './components/layout.css'

function App() {
  const [activeOrbitId, setActiveOrbitId] = useState<UUID | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize: Load or create default orbit
  useEffect(() => {
    async function initialize() {
      try {
        // Ensure database is ready
        await db.open()

        // Get all orbits
        const orbits = await getAllOrbits()

        // Use first orbit or wait for creation
        if (orbits.length > 0) {
          setActiveOrbitId(orbits[0].id)
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  // Handle orbit switching
  const handleOrbitSwitch = (orbitId: UUID) => {
    setActiveOrbitId(orbitId)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.5rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Loading ORBIT Notes...
        </div>
      </div>
    )
  }

  return (
    <WorkspaceLayout
      activeOrbitId={activeOrbitId}
      onOrbitSwitch={handleOrbitSwitch}
    />
  )
}

export default App
