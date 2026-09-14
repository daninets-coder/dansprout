(() => {
  const token = localStorage.getItem('storySproutToken');
  if (!token) return;
  try {
    const payload = token.split('.')[1];
    const session = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (session.childMode === true) window.__storySproutChildMode = true;
  } catch {
    // The normal auth flow handles invalid or expired sessions.
  }
})();
