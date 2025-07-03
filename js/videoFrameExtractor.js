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

    video.onloadedmetadata = function() {
        video.currentTime = video.duration; // Seek to the end
    };

    video.onseeked = function() {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frameDataUrl = canvas.toDataURL('image/png');
        frameImageEl.src = frameDataUrl;
        framePreviewAreaEl.style.display = 'block';

        downloadFrameLinkEl.href = frameDataUrl;
        downloadFrameLinkEl.style.display = 'block';

        // Clean up video element
        video.src = ""; // Release video resources
        video.remove();
        console.log("Last frame extracted and displayed.");
    };

    video.onerror = function(e) {
        console.error("Error loading video for frame extraction:", e);
        alert("Error loading video. Please ensure it's a supported format and not corrupted.");
        // Clean up video element
        video.src = "";
        video.remove();
    };

    // Start loading the video
    video.load();
}
