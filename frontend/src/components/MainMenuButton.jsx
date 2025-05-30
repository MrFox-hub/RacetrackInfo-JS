import { useNavigate } from "react-router-dom";

const MainMenuButton = () => {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/")} className="back-button roboto-mono-medium">
      ← Back
    </button>
  );
};

export default MainMenuButton;
