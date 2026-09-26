// Sändningsfönstret: visar bara utdatabilden (för OBS Fönsterinspelning).
const video = document.querySelector('video');
const msg = document.querySelector('.msg');

function attach() {
  const stream = window.opener?.skepnad?.outputStream?.();
  if (!stream) {
    msg.hidden = false;
    return false;
  }
  msg.hidden = true;
  video.srcObject = stream;
  video.play().catch(() => {});
  return true;
}

if (!attach()) {
  const t = setInterval(() => attach() && clearInterval(t), 1000);
}
document.addEventListener('dblclick', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});
