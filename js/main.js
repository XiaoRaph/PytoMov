import { initializeCustomConsole, handleError } from './utils.js';
import { initializeUI } from './ui.js';
import { handleVideoUpload } from './videoFrameExtractor.js';

/**
 * Initializes the tab switching functionality.
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate the clicked tab and its content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeContent = document.getElementById(tabId);
            if (activeContent) {
                activeContent.classList.add('active');
                console.log(`Switched to tab: ${tabId}`);
            } else {
                console.error(`Content for tab ${tabId} not found.`);
            }
        });
    });
    // Ensure the first tab is active by default if not already set in HTML
    if (document.querySelector('.tab-button.active') === null && tabButtons.length > 0) {
        tabButtons[0].click(); // Simulate a click on the first tab button
    } else if (document.querySelector('.tab-content.active') === null && tabContents.length > 0){
        // If active class is on button but not content, sync it.
        const activeButton = document.querySelector('.tab-button.active');
        if(activeButton) {
            const activeContentId = activeButton.getAttribute('data-tab');
            const activeContentElement = document.getElementById(activeContentId);
            if (activeContentElement) {
                activeContentElement.classList.add('active');
            }
        }
    }
}

/**
 * Initializes the video frame extractor functionality.
 */
function initializeVideoFrameExtractor() {
    const videoUploadInput = document.getElementById('videoUpload');
    const extractFrameBtn = document.getElementById('extractFrameBtn'); // Added this line
    const extractedFrameImage = document.getElementById('extractedFrameImage');
    const downloadFrameLink = document.getElementById('downloadFrameLink');
    const framePreviewArea = document.getElementById('framePreviewArea');

    if (videoUploadInput && extractFrameBtn && extractedFrameImage && downloadFrameLink && framePreviewArea) {
        // The event listener for extraction should be on the button,
        // and it should use the currently selected file from videoUploadInput.
        extractFrameBtn.addEventListener('click', () => {
            if (videoUploadInput.files && videoUploadInput.files[0]) {
                // Create a pseudo event object for handleVideoUpload
                const pseudoEvent = { target: { files: videoUploadInput.files } };
                handleVideoUpload(pseudoEvent, extractedFrameImage, downloadFrameLink, framePreviewArea);
            } else {
                alert("Please select a video file first.");
                console.log("No video file selected for frame extraction.");
            }
        });
        console.log("Video frame extractor UI elements found and event listener attached to extract button.");
    } else {
        console.warn("One or more UI elements for video frame extraction are missing. Functionality may be affected.");
        if (!videoUploadInput) console.warn("Missing: videoUpload input");
        if (!extractFrameBtn) console.warn("Missing: extractFrameBtn button");
        if (!extractedFrameImage) console.warn("Missing: extractedFrameImage img");
        if (!downloadFrameLink) console.warn("Missing: downloadFrameLink a");
        if (!framePreviewArea) console.warn("Missing: framePreviewArea div");
    }
}


document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeCustomConsole();
        console.log("Custom console initialized from main.js.");

        initializeUI(); // For the "Image to Video Creator" tab
        console.log("Image to Video UI initialized from main.js.");

        initializeTabs(); // Initialize tab switching
        console.log("Tabs initialized.");

        initializeVideoFrameExtractor(); // Initialize "Video to Image Extractor" tab functionality
        console.log("Video Frame Extractor initialized.");


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
