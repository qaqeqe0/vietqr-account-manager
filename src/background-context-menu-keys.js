// Shared between the service worker (which stores a right-click scan) and the popup
// (which picks it up). Kept separate so pages do not load the worker's listeners.
export const PENDING_SCAN_KEY = 'vietqrPendingScan';
