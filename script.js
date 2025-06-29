console.log("script.js loaded");

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
// --- End On-page console logger ---

document.addEventListener('DOMContentLoaded', () => {
    // Ensure onPageConsole is re-fetched after DOM is loaded, if it wasn't available globally at script start
    // const onPageConsole = document.getElementById('onPageConsole'); // Already defined globally

    const imageUpload = document.getElementById('imageUpload');
    const textInput = document.getElementById('textInput');
    const durationInput = document.getElementById('durationInput');
    const fpsInput = document.getElementById('fpsInput');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const textColorInput = document.getElementById('textColorInput');
    const fontFamilyInput = document.getElementById('fontFamilyInput'); // New font family input
    const generateBtn = document.getElementById('generateBtn');
    const statusMessages = document.getElementById('statusMessages');
    const downloadLink = document.getElementById('downloadLink');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const bgColorInput = document.getElementById('bgColorInput');
    const clearBgColorBtn = document.getElementById('clearBgColorBtn');
    const enableBgColorCheckbox = document.getElementById('enableBgColor');

    let loadedImage = null;

    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedImage = new Image();
                    loadedImage.onload = () => {
                        // Set canvas dimensions to image dimensions
                        previewCanvas.width = loadedImage.width;
                        previewCanvas.height = loadedImage.height;
                        // Draw image on canvas
                        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear previous
                        ctx.drawImage(loadedImage, 0, 0);
                        previewCanvas.style.display = 'block'; // Show canvas
                        updateStatus(`Image "${file.name}" loaded.`);
                        // Trigger a preview render with current text settings
                        drawTextOnCanvas();
                    };
                    loadedImage.onerror = () => {
                        updateStatus(`Error loading image: ${file.name}`);
                        loadedImage = null;
                        previewCanvas.style.display = 'none';
                    };
                    loadedImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                loadedImage = null;
                previewCanvas.style.display = 'none';
                updateStatus("Image selection cleared.");
            }
        });
    }

    // Function to update status messages
    function updateStatus(message) {
        statusMessages.textContent = message;
        console.log(message);
    }

    // Function to draw text on canvas (will be called on input changes too)
    function drawTextOnCanvas() {
        if (!loadedImage) {
            // updateStatus("Please upload an image first."); // This can be annoying if called too often
            return;
        }
        if (!previewCanvas || !ctx) return;

        // Clear canvas and redraw image (in case text settings changed)
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(loadedImage, 0, 0);

        const text = textInput.value;
        const fontSize = fontSizeInput.value; // e.g., "50px"
        const fontFamily = fontFamilyInput.value || 'sans-serif'; // Use specified or fallback
        const textColor = textColorInput.value;
        const useBgColor = enableBgColorCheckbox.checked;
        const textBgColor = bgColorInput.value;

        // Construct font string for canvas
        // Handles cases like "50px", "3em", etc. if browser supports.
        // For simplicity, we assume CSS-like font size string.
        ctx.font = `${fontSize} ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center'; // Simple centering for now, can be expanded
        ctx.textBaseline = 'middle'; // Good for vertical centering

        const x = previewCanvas.width / 2;
        const y = previewCanvas.height / 2;

        if (useBgColor && textBgColor) {
            // Simple background: measure text and draw rect
            const textMetrics = ctx.measureText(text);
            // These metrics can be tricky; this is a basic approximation
            let actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
            let actualWidth = textMetrics.width;

            // Fallback if actualBoundingBox is not fully supported
            if (isNaN(actualHeight) || isNaN(actualWidth)) {
                 // Estimate height based on font size string (e.g. "50px" -> 50)
                const sizeMatch = fontSize.match(/(\d+)/);
                actualHeight = sizeMatch ? parseInt(sizeMatch[1], 10) * 1.2 : 50 * 1.2;
                actualWidth = textMetrics.width || (text.length * (actualHeight / 2)); // Very rough width
            }

            const padding = 10;
            ctx.fillStyle = textBgColor;
            ctx.fillRect(x - actualWidth / 2 - padding, y - actualHeight / 2 - padding, actualWidth + padding * 2, actualHeight + padding * 2);
            ctx.fillStyle = textColor; // Reset to text color
        }

        ctx.fillText(text, x, y);
        updateStatus("Preview updated.");
    }

    // Add event listeners to update canvas preview when text or style changes
    [textInput, fontSizeInput, textColorInput, fontFamilyInput, bgColorInput, enableBgColorCheckbox].forEach(input => {
        if (input) {
            const eventType = (input.type === 'color' || input.type === 'checkbox') ? 'change' : 'input';
            input.addEventListener(eventType, drawTextOnCanvas);
        }
    });
    // Ensure fontFamilyInput also updates on 'change' if user blurs after typing
    if(fontFamilyInput) fontFamilyInput.addEventListener('change', drawTextOnCanvas);


    if (clearBgColorBtn) {
        clearBgColorBtn.addEventListener('click', () => {
            if (bgColorInput) bgColorInput.value = "#000000";
            if (enableBgColorCheckbox) enableBgColorCheckbox.checked = false;
            updateStatus("Text background color disabled.");
            drawTextOnCanvas(); // Update preview
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log("[Diag] Generate button clicked.");

            console.log("[Diag] Checking loadedImage...");
            if (!loadedImage) {
                updateStatus("Error: Please upload an image first.");
                console.error("[Diag] loadedImage is null or undefined. Aborting.");
                return;
            }
            console.log("[Diag] loadedImage is present:", loadedImage.src.substring(0, 50) + "..."); // Log first 50 chars of src

            const durationStr = durationInput.value;
            const fpsStr = fpsInput.value;
            console.log(`[Diag] Duration input string: "${durationStr}", FPS input string: "${fpsStr}"`);

            const duration = parseFloat(durationStr);
            const fps = parseInt(fpsStr, 10);
            console.log(`[Diag] Parsed duration: ${duration}, Parsed FPS: ${fps}`);

            if (isNaN(duration) || duration <= 0) {
                updateStatus("Error: Please enter a valid positive duration.");
                console.error(`[Diag] Invalid duration: ${duration}. Aborting.`);
                return;
            }
            if (isNaN(fps) || fps <= 0) {
                updateStatus("Error: Please enter a valid positive FPS.");
                console.error(`[Diag] Invalid FPS: ${fps}. Aborting.`);
                return;
            }

            updateStatus('Generate button click validated. Preparing data for FFmpeg...');
            const logData = {
                imageName: loadedImage.name || "loaded_image",
                text: textInput.value,
                duration: duration,
                fps: fps,
                fontSize: fontSizeInput.value,
                fontFamily: fontFamilyInput.value,
                textColor: textColorInput.value,
                bgColor: enableBgColorCheckbox.checked ? bgColorInput.value : "None"
            };
            console.log("[Diag] Data for FFmpeg:", logData);

            console.log("[Diag] Calling generateVideoWithCanvas()..."); // Will be renamed/refactored
            generateVideoWithCanvas();
            console.log("[Diag] Returned from generateVideoWithCanvas() call site.");
        });
    }

    // --- FFmpeg Integration Removed ---



    async function generateVideoWithCanvas() { // Renamed from generateVideoWithFFmpeg, content to be replaced
        console.log("[Diag][generateVideoCanvas] Entered function.");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            console.error("[Diag][generateVideoCanvas] No loadedImage found. Aborting.");
            alert("Please upload an image first.");
            return;
        }
        console.log("[Diag][generateVideoCanvas] loadedImage check passed.");

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);
        console.log(`[Diag][generateVideoCanvas] Parsed duration: ${durationSec}, Parsed FPS: ${fpsVal}`);

        if (isNaN(durationSec) || durationSec <= 0) {
            updateStatus("Error: Invalid duration. Must be a positive number.");
            console.error(`[Diag][generateVideoCanvas] Invalid duration: ${durationSec}. Aborting.`);
            alert("Error: Invalid duration. Must be a positive number.");
            return;
        }
        if (isNaN(fpsVal) || fpsVal <= 0) {
            updateStatus("Error: Invalid FPS. Must be a positive integer.");
            console.error(`[Diag][generateVideoCanvas] Invalid FPS: ${fpsVal}. Aborting.`);
            alert("Error: Invalid FPS. Must be a positive integer.");
            return;
        }
        console.log("[Diag][generateVideoCanvas] Duration and FPS validation passed.");

        updateStatus("Starting video generation with Canvas... This may take some time.");
        console.log("[Diag][generateVideoCanvas] Disabling generate button and hiding download link.");
        generateBtn.disabled = true;
        downloadLink.style.display = 'none';

        try {
            console.log("[Diag][generateVideoCanvas] Entering Canvas processing try block.");

            const totalFrames = Math.floor(durationSec * fpsVal);
            const frameDelay = 1000 / fpsVal; // delay in ms

            // Ensure the preview canvas is up-to-date with the latest text and image
            // This is important because drawTextOnCanvas updates the previewCanvas
            // which we will be using to grab frames.
            drawTextOnCanvas();

            const video = new Whammy.Video(fpsVal);

            for (let i = 0; i < totalFrames; i++) {
                // The previewCanvas should already have the static image and text drawn on it.
                // If text/image were dynamic per frame, we'd redraw here.
                // For this project, the content is static throughout the video.
                video.add(previewCanvas); // Add current state of previewCanvas
                updateStatus(`Encoding frame ${i + 1}/${totalFrames}`);
                console.log(`[Diag][generateVideoCanvas] Added frame ${i + 1}/${totalFrames}`);
                // Whammy doesn't require a delay here, it just collects frames.
                // If we needed to display the frame being processed, we might await a short delay.
            }

            console.log("[Diag][generateVideoCanvas] Compiling WebM video...");
            updateStatus("Compiling WebM video... This might take a moment.");
            // Whammy's compile is synchronous for the array output, then we make it a blob.
            const output = video.compile();
            const videoBlob = new Blob(output, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);

            console.log("[Diag][generateVideoCanvas] WebM video compiled. Blob URL created.");

            downloadLink.href = videoUrl;
            downloadLink.download = `video_output_${Date.now()}.webm`;
            downloadLink.style.display = 'block';
            downloadLink.textContent = 'Download Video (WebM)';
            updateStatus("WebM video ready for download!");

        } catch (error) {
            console.error("[Diag][generateVideoCanvas] Error during Canvas video generation:", error);
            updateStatus(`Error during video generation: ${error.message || error}.`);
            alert(`An error occurred during video generation: ${error.message || error}.`);
        } finally {
            console.log("[Diag][generateVideoCanvas] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }

});
