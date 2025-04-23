import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4 text-blue-700">Welcome to ArchiSync</h1>
      <p className="mb-6 text-gray-600">Collaborative design made simple.</p>
      <button
        onClick={() => navigate("/canvas")}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded shadow"
      >
        Go to Canvas
      </button>
    </div>
  );
}
