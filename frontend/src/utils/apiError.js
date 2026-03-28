/**
 * Maps Axios/network errors to a user-visible string.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;

  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Unable to reach the server. Check your connection and that the API is running.';
  }

  const status = err.response?.status;
  const data = err.response?.data;

  if (status === 404 && !data?.message) {
    return 'The requested resource was not found.';
  }
  if (status === 403 && !data?.message) {
    return 'You do not have permission to do that.';
  }
  if (status === 401 && !data?.message) {
    return 'Please sign in again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return data?.message || 'The server had a problem. Please try again later.';
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const msgs = data.errors.map((e) => e.msg || e.message).filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }

  return fallback;
}
