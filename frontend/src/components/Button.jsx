import PropTypes from "prop-types";

const Button = ({ onClick, label, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="roboto-mono-medium w-full border border-gray-700 bg-gray-800 p-4 transition-colors duration-200 hover:bg-gray-700"
    >
      {label}
    </button>
  );
};

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default Button;
