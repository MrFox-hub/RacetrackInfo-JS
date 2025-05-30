// At the top of your NextRace.jsx (or in a utils file)
function toggleFullScreen() {
  const doc = window.document;
  const docEl = doc.documentElement;

  const requestFullScreen =
    docEl.requestFullscreen ||
    docEl.webkitRequestFullScreen ||
    docEl.mozRequestFullScreen ||
    docEl.msRequestFullscreen;
  const exitFullScreen =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;

  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    requestFullScreen.call(docEl).catch((err) => {
      console.error("Error attempting to enable full-screen mode:", err);
    });
  } else {
    exitFullScreen.call(doc).catch((err) => {
      console.error("Error attempting to exit full-screen mode:", err);
    });
  }
}

export default toggleFullScreen;
