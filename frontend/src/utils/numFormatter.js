function numFormatter(int) {
  if (int >= 1 && int <= 9) {
    return "0" + int;
  }
  return int;
}

export default numFormatter;
