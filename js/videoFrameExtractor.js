import { handleError } from './utils.js'; // Import handleError

// Placeholder for video frame extraction logic
console.log("videoFrameExtractor.js loaded");

/**
 * Handles the video file input and prepares for frame extraction.
 * @param {Event} event - The file input change event.
 * @param {HTMLImageElement} frameImageEl - The image element to display the extracted frame.
 * @param {HTMLButtonElement} downloadFrameLinkEl - The button to download the extracted frame.
 * @param {HTMLElement} framePreviewAreaEl - The container for the frame preview.
 */
export function handleVideoUpload(event, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl) {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const videoSrc = e.target.result;
        extractLastFrame(videoSrc, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl);
    };
    reader.readAsDataURL(file);
}

/**
 * Extracts the last frame from a video source.
 * @param {string} videoSrc - The source URL of the video.
 * @param {HTMLImageElement} frameImageEl - The image element to display the extracted frame.
 * @param {HTMLButtonElement} downloadFrameLinkEl - The button to download the extracted frame.
 * @param {HTMLElement} framePreviewAreaEl - The container for the frame preview.
 */
function extractLastFrame(videoSrc, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl) {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.muted = true; // Mute to avoid issues with autoplay policies
    video.preload = 'metadata'; // Hint to the browser to load metadata quickly

    console.log("[FrameExtractor] Video element created, src set. Waiting for metadata...");

    video.onloadedmetadata = function() {
        console.log(`[FrameExtractor] Metadata loaded. Duration: ${video.duration}, Dimensions: ${video.videoWidth}x${video.videoHeight}`);
        if (video.duration === Infinity || video.duration === 0 || isNaN(video.duration)) {
            const warningMessage = "Video duration is invalid or streaming. Cannot reliably seek to the last frame.";
            console.warn(`[FrameExtractor] ${warningMessage}`);
            const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
            if (statusMessagesEl) {
                statusMessagesEl.textContent = `Warning: ${warningMessage}`;
                statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12'; // Warning color
            } else {
                handleError(warningMessage, false);
            }
            // Attempt to capture frame at a very early point if duration is problematic, e.g., 0.1s
            video.currentTime = 0.1;
            // Or, simply don't proceed if a valid duration isn't found, depending on desired behavior.
            // For now, we'll try to capture an early frame.
            // If this is not desired, clean up and return here.
        } else {
            video.currentTime = video.duration; // Seek to the end
            console.log(`[FrameExtractor] Seeking to end of video (currentTime set to ${video.duration})`);
        }
    };

    video.onseeked = function() {
        console.log(`[FrameExtractor] Seeked to time: ${video.currentTime}. Video readyState: ${video.readyState}`);
        // Ensure the video has enough data to draw the frame. readyState >= 2 (HAVE_CURRENT_DATA) or ideally >=3 (HAVE_ENOUGH_DATA)
        if (video.readyState < 2) {
            console.warn(`[FrameExtractor] Video readyState is ${video.readyState}, might not have enough data. Waiting...`);
            // Optionally, wait a bit more or use requestAnimationFrame.
            // For simplicity now, we proceed, but this could be a point of failure.
            // A more robust solution might involve waiting for HAVE_ENOUGH_DATA or using 'canplay'/'canplaythrough' events.
        }

        const canvas = document.createElement('canvas');
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn("[FrameExtractor] Video dimensions are zero. Cannot create canvas for frame extraction.");
            handleError("Video dimensions are reported as zero. Cannot extract frame.", false);
            video.src = "";
            try { video.remove(); } catch (e) { console.warn("Error removing video on zero dimension error", e); }
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameDataUrl = canvas.toDataURL('image/png');
            frameImageEl.src = frameDataUrl;
            framePreviewAreaEl.style.display = 'block';

            downloadFrameLinkEl.href = frameDataUrl;
            downloadFrameLinkEl.style.display = 'block';

            const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
            if (statusMessagesEl) {
                statusMessagesEl.textContent = "Status: Last frame extracted successfully.";
                statusMessagesEl.parentElement.style.borderLeftColor = '#2ecc71'; // Success color
            }
            console.log("[FrameExtractor] Last frame extracted and displayed successfully.");

        } catch (drawError) {
            console.error("[FrameExtractor] Error drawing video frame to canvas:", drawError);
            const drawErrMsg = "Could not draw video frame. Video might be corrupted or in an unsupported format.";
            // handleError(drawErrMsg, false); // This will be handled by the generic video.onerror usually, or if not, this is a fallback
            const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
            if (statusMessagesEl) {
                statusMessagesEl.textContent = `Error: ${drawErrMsg}`;
                statusMessagesEl.parentElement.style.borderLeftColor = '#e74c3c';
            }
        } finally {
            // Clean up video element
            console.log("[FrameExtractor] Cleaning up video element after attempt to draw frame.");
            video.src = ""; // Release video resources
            try {
                video.remove();
            } catch (removeError) {
                console.warn("[FrameExtractor] Error trying to remove video element post-extraction attempt:", removeError);
            }
        }
    };

    video.onstalled = function() {
        console.warn("[FrameExtractor] Video stalled during loading/seeking. This might lead to issues if not recovered.");
        // This event indicates that the browser is trying to get media data, but data is unexpectedly not forthcoming.
        // It might not always be a fatal error, but it's good to log.
        const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
        if (statusMessagesEl && !statusMessagesEl.textContent.startsWith("Error:")) { // Don't overwrite an existing error
            statusMessagesEl.textContent = "Status: Video loading stalled. Trying to continue...";
            statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12'; // Warning color
        }
    };

    video.onerror = function(e) {
        let errorDetail = "Unknown error.";
        if (e.target && e.target.error) {
            switch (e.target.error.code) {
                case e.target.error.MEDIA_ERR_ABORTED:
                    errorDetail = 'Video loading aborted.'; // Simplified message
                    break;
                case e.target.error.MEDIA_ERR_NETWORK:
                    errorDetail = 'A network error occurred while loading the video.';
                    break;
                case e.target.error.MEDIA_ERR_DECODE:
                    errorDetail = 'The video could not be decoded, or the format is unsupported.';
                    break;
                case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorDetail = 'The video format or source is not supported.';
                    break;
                default:
                    errorDetail = `An unknown error occurred with the video (code: ${e.target.error.code}).`;
            }
        }
        const userMessage = `Error processing video: ${errorDetail}`;
        console.error(`[FrameExtractor] Video Error. Code: ${e.target && e.target.error ? e.target.error.code : 'N/A'}, Message: ${e.target && e.target.error ? e.target.error.message : 'N/A'}. Event object:`, e);

        const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
        if (statusMessagesEl) {
            statusMessagesEl.textContent = userMessage; // Display the detailed user message
            statusMessagesEl.parentElement.style.borderLeftColor = '#e74c3c'; // Error color
        } else {
            // Fallback if the specific status element isn't found (though it should be)
            handleError(userMessage, false);
        }

        console.log("[FrameExtractor] Cleaning up video element due to error.");
        video.src = "";
        try {
            video.remove();
        } catch (removeError) {
            console.warn("[FrameExtractor] Error trying to remove video element during error handling:", removeError);
        }

        // Ensure UI is reset (e.g., hide preview, disable download)
        if (framePreviewAreaEl) framePreviewAreaEl.style.display = 'none';
        if (frameImageEl) frameImageEl.src = ''; // Clear any previous image
        if (downloadFrameLinkEl) {
            downloadFrameLinkEl.style.display = 'none';
            downloadFrameLinkEl.href = '#'; // Reset href
        }
    };

    console.log("[FrameExtractor] Attempting to load video metadata and seek...");
    video.load();
}
