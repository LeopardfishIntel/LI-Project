import React from 'react';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold' }}>LEOPARDFISH INTEL</h1>
      <div style={{ padding: '2rem', border: '1px solid #334155', margin: '2rem' }}>
        <p>Due Diligence Row - Online</p>
      </div>
      <button style={{ backgroundColor: '#007FFF', color: 'white', padding: '1rem 3rem', borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
        Azure Blue Button
      </button>
    </div>
  );
}
