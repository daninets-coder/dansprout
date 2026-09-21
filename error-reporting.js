// Reports uncaught browser errors to the server so they land in logs/error.log
// instead of only ever being visible to someone with devtools open at the
// exact moment the bug happens. Loaded first, before any other script, so it
// can catch errors thrown while those scripts themselves are loading.
(() => {
  const ENDPOINT = '/api/client-error';
  const reported = new Set();

  const report = (message, stack, source) => {
    const key = `${source}:${String(message).slice(0, 200)}`;
    if (reported.has(key)) return; // avoid flooding the log if one bug fires repeatedly
    reported.add(key);
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(message ?? 'Unknown error').slice(0, 500),
          stack: String(stack ?? '').slice(0, 4000),
          url: String(location.href).slice(0, 500),
          userAgent: String(navigator.userAgent).slice(0, 300),
          source,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // If fetch itself is unavailable/broken, there is nothing else to do here.
    }
  };

  window.addEventListener('error', event => {
    report(event.message, event.error && event.error.stack, 'window.onerror');
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    const message = reason && reason.message ? reason.message : String(reason);
    const stack = reason && reason.stack;
    report(message, stack, 'unhandledrejection');
  });
})();
