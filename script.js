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

// Main script execution starts after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Ensure onPageConsole is re-fetched after DOM is loaded, if it wasn't available globally at script start
    // const onPageConsole = document.getElementById('onPageConsole'); // Already defined globally

    // Get references to all relevant DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const textInput = document.getElementById('textInput');
    const durationInput = document.getElementById('durationInput');
    const fpsInput = document.getElementById('fpsInput');
    const originalFramesInput = document.getElementById('originalFramesInput'); // New input for original frames
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
    const textPositionInput = document.getElementById('textPositionInput');
    const imageFilterInput = document.getElementById('imageFilterInput'); // New image filter dropdown

    let loadedImage = null; // Holds the currently loaded image object

    // Event listener for image file selection
    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedImage = new Image();
                    // Event handler for when the image data has been loaded
                    loadedImage.onload = () => {
                        // Set canvas dimensions to match the loaded image
                        previewCanvas.width = loadedImage.width;
                        previewCanvas.height = loadedImage.height;
                        // Draw the image onto the canvas
                        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear previous content
                        ctx.drawImage(loadedImage, 0, 0);
                        previewCanvas.style.display = 'block'; // Make canvas visible
                        updateStatus(`Image "${file.name}" loaded.`);
                        // Update the canvas with text overlay now that the image is loaded
                        drawTextOnCanvas();
                    };
                    // Event handler for errors during image loading
                    loadedImage.onerror = () => {
                        updateStatus(`Error loading image: ${file.name}`);
                        loadedImage = null;
                        previewCanvas.style.display = 'none';
                    };
                    loadedImage.src = e.target.result; // Start loading the image data
                };
                reader.readAsDataURL(file); // Read the file as a data URL
            } else {
                // No file selected or selection cleared
                loadedImage = null;
                previewCanvas.style.display = 'none';
                updateStatus("Image selection cleared.");
            }
        });
    }

    /**
     * Updates the status message displayed on the page and logs to console.
     * @param {string} message - The message to display.
     */
    function updateStatus(message) {
        statusMessages.textContent = message;
        console.log(message); // Also logs to the on-page console via overridden console.log
    }

    /**
     * Applies an image filter to the loaded image on the preview canvas.
     * @param {string} [forceFilterType=null] - If provided, this filter type will be used instead of the UI selection.
     *                                        Use 'none' to force drawing the original image.
     */
    function applyImageFilter(forceFilterType = null) {
        if (!loadedImage || !previewCanvas || !ctx) {
            return;
        }

        // Always draw the original image first as a base
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(loadedImage, 0, 0, previewCanvas.width, previewCanvas.height);

        const filterToApply = forceFilterType !== null ? forceFilterType : imageFilterInput.value;

        if (filterToApply === 'none') {
            // No filter to apply, original image is already drawn
            if (forceFilterType !== null) console.log("Forcing no filter for this frame.");
            return;
        }

        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        const data = imageData.data;

        if (filterToApply === 'invert') {
            for (let i = 0; i < data.length; i += 4) {
                data[i]     = 255 - data[i];     // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
                // Alpha (data[i + 3]) remains unchanged
            }
        }
        // Future filters can be added here as else if (filterToApply === '...')

        ctx.putImageData(imageData, 0, 0);
        if (forceFilterType !== null) {
            console.log(`Applied forced filter for frame: ${filterToApply}`);
        } else {
            console.log(`Applied UI selected filter: ${filterToApply}`);
        }
    }

    /**
     * Draws the (potentially filtered) image and the overlay text onto the preview canvas.
     * This function is primarily for the live preview.
     * @param {string} [overrideFilter=null] - Optional. If provided, forces a specific filter for this draw call.
     *                                         Used by generateVideoWithCanvas to render specific frame states.
     */
    function drawTextOnCanvas(overrideFilter = null) {
        if (!loadedImage) {
            return;
        }
        if (!previewCanvas || !ctx) return;

        // Apply the image filter. If overrideFilter is provided, use that. Otherwise, use UI selection.
        applyImageFilter(overrideFilter);

        // Now draw text on top of the (potentially) filtered image
        const text = textInput.value;
        const fontSize = fontSizeInput.value;
        const fontFamily = fontFamilyInput.value || 'sans-serif'; // Use specified or fallback
        const textColor = textColorInput.value;
        const useBgColor = enableBgColorCheckbox.checked;
        const textBgColor = bgColorInput.value;
        const position = textPositionInput.value;

        // Construct font string for canvas
        ctx.font = `${fontSize} ${fontFamily}`;
        ctx.fillStyle = textColor;

        // Determine text alignment and position based on selection
        let x, y;
        const canvasWidth = previewCanvas.width;
        const canvasHeight = previewCanvas.height;
        const textMargin = 20; // Margin from edges

        switch (position) {
            case 'top_left':
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                x = textMargin;
                y = textMargin;
                break;
            case 'top_center':
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                x = canvasWidth / 2;
                y = textMargin;
                break;
            case 'top_right':
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                x = canvasWidth - textMargin;
                y = textMargin;
                break;
            case 'center_left':
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                x = textMargin;
                y = canvasHeight / 2;
                break;
            case 'center':
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                x = canvasWidth / 2;
                y = canvasHeight / 2;
                break;
            case 'center_right':
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                x = canvasWidth - textMargin;
                y = canvasHeight / 2;
                break;
            case 'bottom_left':
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                x = textMargin;
                y = canvasHeight - textMargin;
                break;
            case 'bottom_center':
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                x = canvasWidth / 2;
                y = canvasHeight - textMargin;
                break;
            case 'bottom_right':
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                x = canvasWidth - textMargin;
                y = canvasHeight - textMargin;
                break;
            default: // Center (fallback)
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                x = canvasWidth / 2;
                y = canvasHeight / 2;
        }

        if (useBgColor && textBgColor) {
            const textMetrics = ctx.measureText(text);
            let actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
            let actualWidth = textMetrics.width;

            if (isNaN(actualHeight) || isNaN(actualWidth)) {
                const sizeMatch = fontSize.match(/(\d+)/);
                actualHeight = sizeMatch ? parseInt(sizeMatch[1], 10) * 1.2 : 50 * 1.2; // Approximation
                actualWidth = textMetrics.width || (text.length * (actualHeight / 2)); // Very rough width
            }

            const padding = 10;
            let bgX = x;
            let bgY = y;

            // Adjust background position based on textAlign and textBaseline
            if (ctx.textAlign === 'center') {
                bgX -= actualWidth / 2;
            } else if (ctx.textAlign === 'right') {
                bgX -= actualWidth;
            }
            // For textAlign 'left', bgX is already correct (x is the left edge)

            if (ctx.textBaseline === 'middle') {
                bgY -= actualHeight / 2;
            } else if (ctx.textBaseline === 'bottom') {
                bgY -= actualHeight;
            }
            // For textBaseline 'top', bgY is already correct (y is the top edge)

            ctx.fillStyle = textBgColor;
            ctx.fillRect(bgX - padding, bgY - padding, actualWidth + padding * 2, actualHeight + padding * 2);
            ctx.fillStyle = textColor; // Reset to text color for fillText
        }

        ctx.fillText(text, x, y);
        updateStatus("Preview updated.");
    }

    // Add event listeners to various input fields.
    // When any of these inputs change, redraw the text on the canvas to update the preview.
    [textInput, fontSizeInput, textColorInput, fontFamilyInput, bgColorInput, enableBgColorCheckbox, textPositionInput, imageFilterInput].forEach(input => {
        if (input) {
            // Use 'input' event for text fields for immediate feedback, 'change' for color pickers, checkboxes, and select.
            const eventType = (input.type === 'color' || input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
            input.addEventListener(eventType, drawTextOnCanvas);
        }
    });
    // Ensure fontFamilyInput also updates on 'change' (e.g., when user types and blurs)
    // as 'input' might not cover all ways its value changes.
    if(fontFamilyInput) fontFamilyInput.addEventListener('change', drawTextOnCanvas);

    // Event listener for the "No BG" button for text background color
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

    /**
     * Generates a WebM video from the current canvas content using Whammy.js.
     * It takes the loaded image with text overlay, captures frames,
     * and compiles them into a video.
     */
    async function generateVideoWithCanvas() { // Renamed from generateVideoWithFFmpeg
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
            const numOriginalFrames = parseInt(originalFramesInput.value, 10) || 0;
            console.log(`[Diag][generateVideoCanvas] Number of initial original frames: ${numOriginalFrames}`);

            const video = new Whammy.Video(fpsVal);
            const currentlySelectedFilter = imageFilterInput.value; // Cache user's choice for post-original frames

            for (let i = 0; i < totalFrames; i++) {
                let filterForThisFrame = currentlySelectedFilter;
                if (i < numOriginalFrames) {
                    filterForThisFrame = 'none'; // Force no filter for initial frames
                }

                // Redraw canvas for this specific frame's state (filter + text)
                // The drawTextOnCanvas function now handles applying the filter before drawing text.
                // We pass overrideFilter to ensure the correct filter state for this frame.
                drawTextOnCanvas(filterForThisFrame);

                video.add(previewCanvas); // Add current state of previewCanvas
                updateStatus(`Encoding frame ${i + 1}/${totalFrames} (Filter: ${filterForThisFrame})`);
                console.log(`[Diag][generateVideoCanvas] Added frame ${i + 1}/${totalFrames}. Filter applied: ${filterForThisFrame}`);
            }

            // After loop, restore preview to user's selected filter for consistency
            drawTextOnCanvas();

            console.log("[Diag][generateVideoCanvas] Compiling WebM video...");
            updateStatus("Compiling WebM video... This might take a moment.");
            // Whammy's compile() method returns a Blob directly when called without arguments (outputAsArray is false).
            const videoBlob = video.compile();
            const videoUrl = URL.createObjectURL(videoBlob);

            console.log("[Diag][generateVideoCanvas] WebM video Blob received from compile(). Blob URL created.");

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
