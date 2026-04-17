// Error tracking utility for MzansiChat
// Replace with Sentry/Datadog in production when ready

const isProduction = import.meta.env.PROD;

// In-memory error log (capped at 50 entries) for debugging
const errorLog = [];
const MAX_LOG_SIZE = 50;

const logError = (error, context = {}) => {
    const entry = {
        message: error?.message || String(error),
        stack: error?.stack || null,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
    };

    // Add to in-memory log
    errorLog.push(entry);
    if (errorLog.length > MAX_LOG_SIZE) errorLog.shift();

    // In production, you would send this to Sentry/Datadog:
    // if (isProduction && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: context });
    // }

    // Always log to console in development
    if (!isProduction) {
        console.error('[ErrorTracker]', entry.message, context);
    }
};

// Get recent errors for debugging
const getRecentErrors = () => [...errorLog];

// Global error handler
const setupGlobalErrorHandler = () => {
    window.addEventListener('error', (event) => {
        logError(event.error || new Error(event.message), {
            type: 'global',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        // Suppress expected AbortError from Supabase navigator lock contention
        // in React StrictMode — this is a known gotrue-js behavior, not a real error
        const reason = event.reason;
        const isAbortError = reason?.name === 'AbortError' ||
            String(reason?.message || '').includes('Lock broken') ||
            String(reason?.message || '').includes('steal');
        if (isAbortError) {
            console.warn('[ErrorTracker] Suppressed expected AbortError (lock contention):', reason?.message || reason);
            event.preventDefault(); // Prevent default console.error
            return;
        }
        logError(new Error(reason), { type: 'unhandled_promise' });
    });
};

export { logError, getRecentErrors, setupGlobalErrorHandler };