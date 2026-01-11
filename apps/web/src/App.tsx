import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>ORBIT Notes</h1>
        <p>Local-first notes with powerful linking and sync</p>
      </header>
      <main className="app-main">
        <p>Welcome to ORBIT Notes - Coming Soon!</p>
        <div className="features">
          <div className="feature">
            <h3>🏠 Local-First</h3>
            <p>Works completely offline</p>
          </div>
          <div className="feature">
            <h3>🔗 Powerful Linking</h3>
            <p>Connect your ideas</p>
          </div>
          <div className="feature">
            <h3>⚡ Fast & Snappy</h3>
            <p>Search in &lt;50ms</p>
          </div>
          <div className="feature">
            <h3>🔒 Privacy First</h3>
            <p>Your data, your control</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
