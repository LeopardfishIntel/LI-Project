export default function Home() {
  return (
    <main style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: 'hsl(222, 47%, 11%)',
      color: 'white',
      fontFamily: 'monospace',
      textAlign: 'center'
    }}>
      <div>
        <h1 style={{ fontSize: '3rem', color: 'hsl(16, 100%, 50%)', marginBottom: '1rem' }}>It's Alive!</h1>
        <p style={{ fontSize: '1.5rem', color: 'hsl(210, 40%, 98%)' }}>
          This is the homepage in the <code style={{ backgroundColor: 'hsl(215, 28%, 17%)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>Desktop/leopardfish-project-live</code> directory.
        </p>
        <p style={{ fontSize: '1.2rem', color: 'hsl(215, 16%, 78%)', marginTop: '2rem' }}>
          We can now be sure we're in the right place. I will build out the rest of the application here.
        </p>
      </div>
    </main>
  );
}
