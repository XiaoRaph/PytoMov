// --- On-page console logger ---
const onPageConsole = document.getElementById('onPageConsole');

const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
};

function createLogMessageElement(message, level) {
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry', `log-${level}`);

    let displayMessage = '';
    if (typeof message === 'object') {
        try {
            displayMessage = JSON.stringify(message, null, 2);
            logEntry.innerHTML = `<pre>${displayMessage}</pre>`; // Use pre for formatted JSON
        } catch (e) {
            displayMessage = '[Unserializable Object]';
            logEntry.textContent = displayMessage;
        }
    } else {
        displayMessage = String(message);
        logEntry.textContent = displayMessage;
    }

    if (onPageConsole) {
        onPageConsole.appendChild(logEntry);
        onPageConsole.scrollTop = onPageConsole.scrollHeight; // Auto-scroll to bottom
    }
    return displayMessage; // Return string representation for original console
}

export function initializeCustomConsole() {
    console.log = function(...args) {
        const messageStr = args.map(arg => createLogMessageElement(arg, 'log')).join(' ');
        originalConsole.log(...args); // Call original console.log with all arguments
    };

    console.warn = function(...args) {
        const messageStr = args.map(arg => createLogMessageElement(arg, 'warn')).join(' ');
        originalConsole.warn(...args);
    };

    console.error = function(...args) {
        const messageStr = args.map(arg => createLogMessageElement(arg, 'error')).join(' ');
        originalConsole.error(...args);
    };

    console.info = function(...args) {
        const messageStr = args.map(arg => createLogMessageElement(arg, 'info')).join(' ');
        originalConsole.info(...args);
    };

    console.debug = function(...args) {
        // Debug messages might be too verbose for on-page, but we'll include them
        const messageStr = args.map(arg => createLogMessageElement(arg, 'debug')).join(' ');
        originalConsole.debug(...args);
    };

    // Catch global errors and log them too
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("Uncaught Error:", { message, source, lineno, colno, errorObj: error ? error.stack || error : 'N/A' });
        return false; // Let default handler run as well
    };

    window.onunhandledrejection = function(event) {
        console.error("Unhandled Promise Rejection:", event.reason ? event.reason.stack || event.reason : 'N/A');
    };
    originalConsole.log("Custom console initialized.");
}
// --- End On-page console logger ---

// --- Standardized Error Handler ---
export function handleError(message, shouldAlert = false) {
    /**
     * Handles errors consistently across the application.
     * Updates the status message, logs to console, and optionally shows an alert.
     * @param {string} message - The error message to display and log.
     * @param {boolean} [shouldAlert=false] - Whether to show a browser alert.
     */
    const errorMessage = `Error: ${message}`;
    // Assuming updateStatus is available globally or passed/imported if needed
    if (typeof window.updateStatus === 'function') {
        window.updateStatus(errorMessage);
    } else {
        originalConsole.error("updateStatus function not available. Error message:", errorMessage);
    }
    originalConsole.error(message); // Log the original message for cleaner console if needed, or errorMessage
    if (shouldAlert) {
        alert(errorMessage);
    }
}
// --- End Standardized Error Handler ---

export function updateStatus(message, statusMessagesElement) {
    if (statusMessagesElement) {
        statusMessagesElement.textContent = message;
    }
    console.log(message); // Keep console log as a fallback
}
