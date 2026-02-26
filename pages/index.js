// pages/index.js

import Header from "../src/components/layout/header";
import Footer from "../src/components/layout/footer";

export default function Home() {
  return (
    <div>
      <Header />

      {/* Main content of your prototype */}
      <main style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>Welcome to LI-Project!</h1>
        <p>Your prototype is live.</p>

        {/* You can add more sections here as you build them */}
      </main>

      <Footer />
    </div>
  );
}