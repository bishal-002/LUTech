import Navbar from "../components/Navbar";

function Home() {
  return (
    <>
      <Navbar />

      <div className="container mt-5 text-center">
        <h1>Welcome to LUTech</h1>

        <p className="lead">
          Your Electronics E-Commerce Platform
        </p>

        <hr />

        <h3>Pre-Defense Demo Version</h3>

        <p>
          Registration, Login and Authentication are working.
        </p>
      </div>
    </>
  );
}

export default Home;