/**
 * Site Preview and Responsive Device Simulator Module
 */
class PreviewManager {
  openPreview(url, _slug) {
    const input = document.getElementById('preview-url-input');
    const iframe = document.getElementById('site-preview-iframe');
    const link = document.getElementById('preview-external-link');

    if (input) input.value = url;
    if (iframe) iframe.src = url;
    if (link) link.href = url;
  }

  reloadPreview() {
    const iframe = document.getElementById('site-preview-iframe');
    if (iframe && iframe.src) {
      iframe.src = iframe.src;
    }
  }

  setDeviceWidth(width, btn) {
    document.querySelectorAll('.device-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const iframe = document.getElementById('site-preview-iframe');
    if (iframe) iframe.style.width = width;
  }
}

window.PreviewManager = PreviewManager;
