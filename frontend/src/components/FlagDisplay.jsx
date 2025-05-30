import React from "react";
import PropTypes from "prop-types";

const FLAG_DETAILS = {
  SAFE: { label: "🟢 SAFE" },
  HAZARD: { label: "🟡 HAZARD" },
  DANGER: { label: "🔴 DANGER" },
  FINISH: { label: "🏁 FINISH" },
};

const FlagDisplay = ({ flag = "SAFE" }) => {
  const { label } = FLAG_DETAILS[flag] || FLAG_DETAILS["SAFE"];

  return <span>{label}</span>;
};

FlagDisplay.propTypes = {
  flag: PropTypes.string,
};

export default FlagDisplay;
