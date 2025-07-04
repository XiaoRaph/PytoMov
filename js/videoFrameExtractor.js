import { handleError } from './utils.js';

const { FFmpeg } = FFmpegWASM; // Assuming FFmpeg is loaded globally via CDN script
let ffmpeg;
let ffmpegLoaded = false;
let isProcessing = false;

const CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'; // Path to ffmpeg-core.js

/**
 * Initializes the FFmpeg instance and loads the core.
 */
async function initializeFFmpeg() {
    const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
    if (ffmpegLoaded) {
        console.log("[FFmpeg] Already loaded.");
        if (statusMessagesEl) statusMessagesEl.textContent = "Status: FFmpeg ready.";
        return true;
    }
    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
    }

    try {
        if (statusMessagesEl) {
            statusMessagesEl.textContent = "Status: Initializing FFmpeg (this may take a moment)...";
            statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12'; // Warning/loading color
        }
        console.log("[FFmpeg] Initializing FFmpeg...");

        ffmpeg.on('log', ({ message }) => {
            // console.log('[FFmpeg Log]', message); // Optional: for detailed FFmpeg logs
        });

        await ffmpeg.load({ coreURL: CORE_URL });
        ffmpegLoaded = true;
        console.log("[FFmpeg] FFmpeg core loaded successfully.");
        if (statusMessagesEl) {
            statusMessagesEl.textContent = "Status: FFmpeg ready.";
            statusMessagesEl.parentElement.style.borderLeftColor = '#2ecc71'; // Success color
        }
        return true;
    } catch (error) {
        console.error("[FFmpeg] Error loading FFmpeg core:", error);
        if (statusMessagesEl) {
            statusMessagesEl.textContent = `Error: FFmpeg initialization failed. ${error.message}`;
            statusMessagesEl.parentElement.style.borderLeftColor = '#e74c3c'; // Error color
        }
        ffmpegLoaded = false;
        return false;
    }
}

// Call initializeFFmpeg early, perhaps when the tab is shown or on first interaction.
// For now, we can call it from handleVideoUpload or rely on the user clicking extract.

console.log("videoFrameExtractor.js loaded, FFmpeg object available:", typeof FFmpeg !== 'undefined');


/**
 * Handles the video file input and prepares for frame extraction.
 * @param {Event} event - The file input change event.
 * @param {HTMLImageElement} frameImageEl - The image element to display the extracted frame.
 * @param {HTMLButtonElement} downloadFrameLinkEl - The button to download the extracted frame.
 * @param {HTMLElement} framePreviewAreaEl - The container for the frame preview.
 */
export function handleVideoUpload(event, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl) {
    const file = event.target.files[0];
    const videoInfoArea = document.getElementById('videoInfoArea');
    const videoInfoFileName = document.getElementById('videoInfoFileName');
    const videoInfoFileType = document.getElementById('videoInfoFileType');
    const videoInfoFileSize = document.getElementById('videoInfoFileSize');
    const videoInfoDuration = document.getElementById('videoInfoDuration');
    const videoInfoDimensions = document.getElementById('videoInfoDimensions');

    // Reset and hide video info area initially for a new upload
    if (videoInfoArea) videoInfoArea.style.display = 'none';
    if (videoInfoFileName) videoInfoFileName.textContent = '-';
    if (videoInfoFileType) videoInfoFileType.textContent = '-';
    if (videoInfoFileSize) videoInfoFileSize.textContent = '-';
    if (videoInfoDuration) videoInfoDuration.textContent = '-';
    if (videoInfoDimensions) videoInfoDimensions.textContent = '-';
     // Also reset status message for new upload
    const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
    if (statusMessagesEl) {
        statusMessagesEl.textContent = "Status: Idle";
        statusMessagesEl.parentElement.style.borderLeftColor = '#3498db'; // Default color
    }


    if (!file) {
        console.log("No file selected");
        // Optionally hide info area if no file is chosen after one was, though current flow handles this.
        return;
    }

    // Display file-level information
    if (videoInfoArea) videoInfoArea.style.display = 'block';
    if (videoInfoFileName) videoInfoFileName.textContent = file.name;
    if (videoInfoFileType) videoInfoFileType.textContent = file.type || 'N/A';
    if (videoInfoFileSize) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        videoInfoFileSize.textContent = `${sizeInMB} MB (${file.size} bytes)`;
    }

    const reader = new FileReader();
    reader.onload = async function(e) { // Made async to await initializeFFmpeg
        const videoSrc = e.target.result; // This is a data URL

        if (!ffmpegLoaded) {
            const loaded = await initializeFFmpeg();
            if (!loaded) {
                console.error("[FFmpeg] Cannot proceed with extraction, FFmpeg not loaded.");
                // Status already set by initializeFFmpeg on failure
                return;
            }
        }

        // For this step, we just test loading FFmpeg and writing the file.
        // The actual frame extraction will be in the next step.
        if (isProcessing) {
            console.warn("[FFmpeg] Already processing, please wait.");
            // Update status?
            return;
        }
        isProcessing = true;
        const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
        if (statusMessagesEl) {
            statusMessagesEl.textContent = "Status: Preparing video for FFmpeg...";
            statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12';
        }

        try {
            console.log("[FFmpeg] Converting data URL to Uint8Array for FFmpeg...");
            // Helper to convert data URL to Uint8Array - FFmpeg.FS.writeFile needs this or Blob/File
            // For @ffmpeg/ffmpeg v0.12+, it provides `fetchFile` utility
            // If using `ffmpeg.FS` directly, we might need to convert manually for data URLs.
            // Let's assume `FFmpeg.fetchFile` can handle data URLs or we adapt.
            // const data = await FFmpeg.fetchFile(videoSrc); // FFmpeg.fetchFile is part of @ffmpeg/util, ensure it's available or implement conversion

            // Manual conversion for data URL to Uint8Array as fetchFile might not be directly on FFmpeg object
            // and @ffmpeg/util is a separate package.
            let data;
            if (typeof FFmpegWASM.fetchFile === 'function') { // Check if fetchFile is available globally from FFmpeg loaded script
                data = await FFmpegWASM.fetchFile(videoSrc);
            } else {
                // Basic manual conversion for "data:[<mediatype>][;base64],<data>"
                const base64Response = await fetch(videoSrc);
                const blob = await base64Response.blob();
                data = new Uint8Array(await blob.arrayBuffer());
            }

            console.log(`[FFmpeg] Uint8Array created, size: ${data.byteLength}. Writing to FFmpeg FS as inputVideo...`);
            await ffmpeg.writeFile('inputVideo', data);
            console.log("[FFmpeg] File 'inputVideo' written to FFmpeg FS successfully.");
            if (statusMessagesEl) {
                statusMessagesEl.textContent = "Status: Video loaded into FFmpeg. Ready for extraction command (next step).";
                statusMessagesEl.parentElement.style.borderLeftColor = '#2ecc71';
            }

            // In a real scenario, call the extraction command here.
            // For now, this step is complete.
            await extractFrameWithFFmpegCommand('inputVideo', frameImageEl, downloadFrameLinkEl, framePreviewAreaEl, videoInfoDuration.textContent);

        } catch (error) {
            console.error("[FFmpeg] Error in video processing workflow (write or extract):", error);
            if (statusMessagesEl) {
                statusMessagesEl.textContent = `Error: Failed to load video into FFmpeg. ${error.message}`;
                statusMessagesEl.parentElement.style.borderLeftColor = '#e74c3c';
            }
        } finally {
            isProcessing = false;
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Extracts the last frame from a video source using FFmpeg.
 * This function executes the FFmpeg command for frame extraction.
 * @param {string} inputFilename - The name of the video file in FFmpeg's FS.
 * @param {HTMLImageElement} frameImageEl - The image element to display the extracted frame.
 * @param {HTMLButtonElement} downloadFrameLinkEl - The button to download the extracted frame.
 * @param {HTMLElement} framePreviewAreaEl - The container for the frame preview.
 * @param {string} durationString - The string representation of video duration e.g., "5.00 seconds".
 */
async function extractFrameWithFFmpegCommand(inputFilename, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl, durationString) {
    if (!ffmpegLoaded || !ffmpeg) {
        console.error("[FFmpeg] FFmpeg not loaded. Cannot execute command.");
        handleError("FFmpeg is not ready. Please try uploading the video again.", false);
        return;
    }
    if (isProcessing) { // Check isProcessing again, though outer function should also check
        console.warn("[FFmpeg] Still processing another request.");
        return;
    }
    isProcessing = true;

    const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
    const outputFilename = 'output.png';
    let seekTime = 0.1; // Default seek time for very short videos or if duration parsing fails

    try {
        // Attempt to parse duration to seek near the end.
        // durationString is like "5.00 seconds" or "N/A" or "Error loading"
        if (durationString && durationString.includes("seconds")) {
            const duration = parseFloat(durationString);
            if (!isNaN(duration) && duration > 0.2) {
                seekTime = Math.max(0.1, duration - 0.1).toFixed(3); // Seek to 0.1s before end, but not less than 0.1s
            }
        }
        console.log(`[FFmpeg] Determined seekTime: ${seekTime} seconds.`);

        if (statusMessagesEl) {
            statusMessagesEl.textContent = `Status: Extracting frame with FFmpeg (seek time: ${seekTime}s)...`;
            statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12';
        }
        console.log(`[FFmpeg] Executing command: -i ${inputFilename} -ss ${seekTime} -vframes 1 ${outputFilename}`);

        await ffmpeg.exec(['-i', inputFilename, '-ss', String(seekTime), '-vframes', '1', outputFilename]);

        console.log("[FFmpeg] Command executed. Reading output file:", outputFilename);
        const data = await ffmpeg.readFile(outputFilename);

        console.log("[FFmpeg] Frame data read from FS. Converting to displayable image.");
        const blob = new Blob([data.buffer], { type: 'image/png' });
        const dataUrl = URL.createObjectURL(blob);

        frameImageEl.src = dataUrl;
        framePreviewAreaEl.style.display = 'block';
        downloadFrameLinkEl.href = dataUrl;
        downloadFrameLinkEl.style.display = 'block';

        if (statusMessagesEl) {
            statusMessagesEl.textContent = "Status: Frame extracted successfully with FFmpeg!";
            statusMessagesEl.parentElement.style.borderLeftColor = '#2ecc71';
        }
        console.log("[FFmpeg] Frame displayed and download link updated.");

        // Optional: Clean up files from FFmpeg FS
        // await ffmpeg.deleteFile(inputFilename);
        // await ffmpeg.deleteFile(outputFilename);
        // console.log("[FFmpeg] Cleaned up input/output files from FS.");

    } catch (error) {
        console.error("[FFmpeg] Error during FFmpeg command execution or file handling:", error);
        if (statusMessagesEl) {
            statusMessagesEl.textContent = `Error: FFmpeg processing failed. ${error.message || error}`;
            statusMessagesEl.parentElement.style.borderLeftColor = '#e74c3c';
        }
        // Ensure UI is reset for image part if error occurs after file write but during exec/read
        framePreviewAreaEl.style.display = 'none';
        frameImageEl.src = '';
        downloadFrameLinkEl.style.display = 'none';
        downloadFrameLinkEl.href = '#';
    } finally {
        isProcessing = false;
        // Consider if FS cleanup is always needed or only on success.
        // For simplicity, not auto-deleting now to allow inspection if needed, but in prod might be good.
    }
}


// The old extractLastFrame is now effectively replaced by the logic in
// handleVideoUpload (for file loading) and extractFrameWithFFmpegCommand (for exec).
// We can remove the old placeholder `extractLastFrame` or repurpose it if we want a single entry point.
// For clarity, let's assume handleVideoUpload calls extractFrameWithFFmpegCommand directly or indirectly.
// The current structure has reader.onload calling extractFrameWithFFmpegCommand.

// Old canvas-based extraction logic (commented out)
/*
function extractLastFrame_canvas(videoSrc, frameImageEl, downloadFrameLinkEl, framePreviewAreaEl) {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.muted = true;
    video.preload = 'metadata'; // Hint to the browser to load metadata quickly
    const videoInfoDuration = document.getElementById('videoInfoDuration');
    const videoInfoDimensions = document.getElementById('videoInfoDimensions');

    console.log("[FrameExtractor] Video element created, src set. Waiting for metadata...");

    video.onloadedmetadata = function() {
        console.log(`[FrameExtractor] Metadata loaded. Duration: ${video.duration}, Dimensions: ${video.videoWidth}x${video.videoHeight}`);

        if (videoInfoDuration) {
            try {
                videoInfoDuration.textContent = video.duration && !isNaN(video.duration) && video.duration !== Infinity ? `${video.duration.toFixed(2)} seconds` : 'N/A';
            } catch (e) {
                videoInfoDuration.textContent = 'Error reading duration';
                console.warn("[FrameExtractor] Error accessing video.duration", e);
            }
        }
        if (videoInfoDimensions) {
            if (video.videoWidth && video.videoHeight) {
                videoInfoDimensions.textContent = `${video.videoWidth} x ${video.videoHeight} pixels`;
            } else {
                videoInfoDimensions.textContent = 'N/A';
            }
        }

        if (video.duration === Infinity || video.duration === 0 || isNaN(video.duration)) {
            const warningMessage = "Video duration is invalid or streaming. Cannot reliably seek to the last frame. Attempting to capture an early frame.";
            console.warn(`[FrameExtractor] ${warningMessage}`);
            const statusMessagesEl = document.querySelector('#videoToImageStatusMessages .status-messages__message');
            if (statusMessagesEl) {
                statusMessagesEl.textContent = `Warning: ${warningMessage}`;
                statusMessagesEl.parentElement.style.borderLeftColor = '#f39c12'; // Warning color
            } else {
                handleError(warningMessage, false);
            }
            video.currentTime = 0.1; // Attempt to capture an early frame
            console.log(`[FrameExtractor] Seeking to 0.1s due to invalid duration.`);
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
        // Also update video metadata display on error to indicate missing data if appropriate
        if (videoInfoDuration && videoInfoDuration.textContent === '-') videoInfoDuration.textContent = 'Error loading';
        if (videoInfoDimensions && videoInfoDimensions.textContent === '-') videoInfoDimensions.textContent = 'Error loading';
    };

    console.log("[FrameExtractor] Attempting to load video metadata and seek...");
    video.load();
}
