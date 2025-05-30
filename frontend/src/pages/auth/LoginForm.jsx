import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

export default function LoginForm() {
  const [accessKey, setAccessKey] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey }),
      });

      if (!res.ok) throw new Error("Login failed");
      const { token, role } = await res.json();

      login(token, role); // context
      navigate("/"); // main page
    } catch (err) {
      alert("Invalid access key, please try again.");
    }
  };

  return (
    <div className="roboto-mono-regular min-h-screen p-8">
      <button className="back-button roboto-mono-medium" onClick={() => navigate("/")}>
        ← Back
      </button>
      <div className="mx-auto mt-16 max-w-md">
        <h1 className="roboto-mono-bold mb-12 text-center text-4xl tracking-tight">
          👔 Employee Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              placeholder="Access Key"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="roboto-mono-regular w-full border border-gray-700 bg-gray-800 p-4 text-gray-100 focus:border-gray-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="roboto-mono-medium w-full border border-gray-700 bg-gray-800 p-4 transition-colors duration-200 hover:bg-gray-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
