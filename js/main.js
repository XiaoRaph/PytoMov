import { initializeCustomConsole, handleError } from './utils.js';
import { initializeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeCustomConsole();
        console.log("Custom console initialized from main.js.");

        initializeUI();
        console.log("UI initialized from main.js.");

        // Any other initializations or checks can go here.
        console.log("Application setup complete.");

    } catch (error) {
        // Use the original console if our custom one failed or if handleError relies on it
        // and it's not yet fully set up.
        const fallbackError = console.error || window.originalConsole?.error || console.log;
        fallbackError("Critical error during application initialization:", error);

        // Attempt to use our custom handler if it's available, otherwise alert.
        if (typeof handleError === 'function') {
            handleError("A critical error occurred while starting the application. Some features may not work. Check the browser console for details.", true);
        } else {
            alert("A critical error occurred while starting the application. Check the browser console for details.");
        }
    }
});
