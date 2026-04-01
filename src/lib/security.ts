export function initSecurity() {
  // Disable right-click
  document.addEventListener('contextmenu', (e) => e.preventDefault())

  // Block dev tools keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
      e.preventDefault()
      return false
    }
    // Ctrl+U (view source)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault()
      return false
    }
    // Ctrl+S (save page)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      return false
    }
  })

  // Clear console periodically
  const consoleClear = setInterval(() => {
    console.clear()
  }, 2000)

  // DevTools detection via window size
  let devtoolsOpen = false
  const threshold = 160

  function checkDevTools() {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold

    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050403;color:#8b673f;font-family:monospace;font-size:18px;text-align:center;padding:20px;">Developer tools detected. Please close them to continue.</div>'
      }
    } else {
      if (devtoolsOpen) {
        devtoolsOpen = false
        window.location.reload()
      }
    }
  }

  window.addEventListener('resize', checkDevTools)
  setInterval(checkDevTools, 1000)

  // Debugger trap (slows down devtools)
  setInterval(() => {
    const start = performance.now()
    // @ts-ignore
    debugger
    const end = performance.now()
    if (end - start > 100) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050403;color:#8b673f;font-family:monospace;font-size:18px;text-align:center;padding:20px;">Developer tools detected. Please close them to continue.</div>'
    }
  }, 1000)

  // Cleanup on unmount (for SPA navigation)
  return () => {
    clearInterval(consoleClear)
    window.removeEventListener('resize', checkDevTools)
  }
}
