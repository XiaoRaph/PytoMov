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
    const imageFilterInput = document.getElementById('imageFilterInput');
    // const effectActiveDurationInput = document.getElementById('effectActiveDurationInput'); // REMOVED - Replaced by sequence builder
    // const originalFramesInput = document.getElementById('originalFramesInput'); // REMOVED - Replaced by sequence builder
    // const qualityInput = document.getElementById('qualityInput'); // REMOVED - Whammy specific

    // New UI elements for effect sequencing
    const newEffectTypeInput = document.getElementById('newEffectType');
    const newEffectDurationFramesInput = document.getElementById('newEffectDurationFrames');
    const addEffectToSequenceBtn = document.getElementById('addEffectToSequenceBtn');
    const effectSequenceListContainer = document.getElementById('effectSequenceListContainer');

    const previewArea = document.getElementById('previewArea');
    const originalPreviewCanvas = document.getElementById('originalPreviewCanvas');
    const originalCtx = originalPreviewCanvas.getContext('2d');

    let loadedImage = null; // Holds the currently loaded image object
    let effectSequence = []; // Holds the sequence of effects for video generation

    /**
     * Renders the current effect sequence to the UI.
     */
    function renderEffectSequenceList() {
        if (!effectSequenceListContainer) return;
        effectSequenceListContainer.innerHTML = ''; // Clear previous list

        if (effectSequence.length === 0) {
            effectSequenceListContainer.innerHTML = '<p><em>No effects added to sequence yet. Video will be based on total duration using \'None\' filter.</em></p>';
            return;
        }

        const ol = document.createElement('ol');
        effectSequence.forEach((effectItem, index) => {
            const li = document.createElement('li');
            li.textContent = `${effectItem.type.charAt(0).toUpperCase() + effectItem.type.slice(1)} - ${effectItem.frames} frames`;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.marginLeft = '10px';
            removeBtn.dataset.index = index; // Store index for removal
            removeBtn.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index, 10);
                effectSequence.splice(indexToRemove, 1); // Remove from array
                renderEffectSequenceList(); // Re-render the list
                updateStatus(`Effect at position ${indexToRemove + 1} removed from sequence.`);
            });

            li.appendChild(removeBtn);
            ol.appendChild(li);
        });
        effectSequenceListContainer.appendChild(ol);
    }

    // Initial render of the (empty) sequence list
    renderEffectSequenceList();


    // Event listener for adding an effect to the sequence
    if (addEffectToSequenceBtn) {
        addEffectToSequenceBtn.addEventListener('click', () => {
            const effectType = newEffectTypeInput.value;
            const durationFrames = parseInt(newEffectDurationFramesInput.value, 10);

            if (isNaN(durationFrames) || durationFrames <= 0) {
                updateStatus("Error: Please enter a valid positive number for frame duration.");
                alert("Error: Please enter a valid positive number for frame duration.");
                return;
            }

            effectSequence.push({ type: effectType, frames: durationFrames });
            renderEffectSequenceList();
            newEffectDurationFramesInput.value = '24'; // Reset to default or clear
            updateStatus(`Effect "${effectType}" for ${durationFrames} frames added to sequence.`);
        });
    }


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
                        // Set dimensions for both canvases
                        originalPreviewCanvas.width = loadedImage.width;
                        originalPreviewCanvas.height = loadedImage.height;
                        previewCanvas.width = loadedImage.width;
                        previewCanvas.height = loadedImage.height;

                        // Draw the original image onto the originalPreviewCanvas
                        originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                        originalCtx.drawImage(loadedImage, 0, 0);

                        // Show the preview area
                        previewArea.style.display = 'flex'; // Assuming flex is used for layout

                        updateStatus(`Image "${file.name}" loaded.`);
                        // Update the main preview canvas (with filters/text)
                        drawTextOnCanvas();
                    };
                    // Event handler for errors during image loading
                    loadedImage.onerror = () => {
                        updateStatus(`Error loading image: ${file.name}`);
                        loadedImage = null;
                        previewArea.style.display = 'none'; // Hide both canvases
                    };
                    loadedImage.src = e.target.result; // Start loading the image data
                };
                reader.readAsDataURL(file); // Read the file as a data URL
            } else {
                // No file selected or selection cleared
                loadedImage = null;
                previewArea.style.display = 'none'; // Hide both canvases
                originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
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
                data[i]     = 255 - data[i];     // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
                // Alpha (data[i + 3]) remains unchanged
            }
        } else if (filterToApply === 'sepia') {
            // Apply sepia tone
            // For each pixel (R, G, B, A)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Sepia formula
                const newR = Math.min(255, (0.393 * r) + (0.769 * g) + (0.189 * b));
                const newG = Math.min(255, (0.349 * r) + (0.686 * g) + (0.168 * b));
                const newB = Math.min(255, (0.272 * r) + (0.534 * g) + (0.131 * b));

                data[i]     = newR; // Red
                data[i + 1] = newG; // Green
                data[i + 2] = newB; // Blue
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

            updateStatus('Validations passed. Initializing video generation with MediaRecorder...');
            // const logData = { // This logData was primarily for the old FFmpeg approach
            //     imageName: loadedImage.name || "loaded_image",
            //     text: textInput.value,
            //     duration: duration,
            //     fps: fps,
            //     fontSize: fontSizeInput.value,
            //     fontFamily: fontFamilyInput.value,
            //     textColor: textColorInput.value,
            //     bgColor: enableBgColorCheckbox.checked ? bgColorInput.value : "None"
            // };
            // console.log("[Diag] Old FFmpeg related logData commented out:", logData);

            console.log("[Diag] Calling generateVideoWithMediaRecorder()...");
            generateVideoWithMediaRecorder();
            console.log("[Diag] Returned from generateVideoWithMediaRecorder() call site.");
        });
    }

    // --- FFmpeg Integration Removed ---

    /**
     * @deprecated Generates a WebM video from the current canvas content using Whammy.js.
     * It takes the loaded image with text overlay, captures frames,
     * and compiles them into a video.
     */
    async function generateVideoWithWhammy_DEPRECATED() {
        console.log("[Diag][generateVideoWhammy] Entered function.");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            console.error("[Diag][generateVideoCanvas] No loadedImage found. Aborting.");
            alert("Please upload an image first.");
            return;
        }
        console.log("[Diag][generateVideoCanvas] loadedImage check passed.");

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);
        const qualityVal = parseFloat(qualityInput.value);

        console.log(`[Diag][generateVideoCanvas] Parsed duration: ${durationSec}, Parsed FPS: ${fpsVal}, Quality: ${qualityVal}`);

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

            // Pass quality to Whammy.Video constructor
            // Whammy.Video constructor is function WhammyVideo(speed, quality)
            // speed is 1000 / duration, so fps is correct here.
            // quality is a value between 0 and 1 for toDataURL('image/webp', quality)
            const video = new Whammy.Video(fpsVal, qualityVal);
            const currentlySelectedFilter = imageFilterInput.value; // Cache user's choice for post-original frames

            // Define a delay for Android to allow canvas rendering to complete
            // Set to 0 or a small value for non-Android, or if 0 works for Android too.
            // 50ms is a starting point for testing.
            const ANDROID_FRAME_DELAY_MS = 50;
            const isAndroid = /android/i.test(navigator.userAgent);
            const frameDelay = isAndroid ? ANDROID_FRAME_DELAY_MS : 0;

            if (isAndroid) {
                console.log(`[Diag] Android detected. Applying frame delay of ${frameDelay}ms if > 0.`);
            }

            for (let i = 0; i < totalFrames; i++) {
                // Yield to the browser event loop periodically to prevent freezing
                if (i % 10 === 0) { // This yield is for general UI responsiveness
                    updateStatus(`Encoding frame ${i + 1}/${totalFrames}...`);
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                let filterForThisFrame = currentlySelectedFilter;
                if (i < numOriginalFrames) {
                    filterForThisFrame = 'none'; // Force no filter for initial frames
                }

                // Redraw canvas for this specific frame's state (filter + text)
                drawTextOnCanvas(filterForThisFrame);

                // Apply an additional delay specifically for Android before capturing the frame,
                // to give the rendering engine more time to complete drawing.
                if (frameDelay > 0) {
                    if (i % 10 === 0 || i === totalFrames -1) { // Log this delay less frequently
                        console.log(`[Diag][Frame ${i+1}] Applying specific frame delay: ${frameDelay}ms`);
                    }
                    await new Promise(resolve => setTimeout(resolve, frameDelay));
                }

                video.add(previewCanvas); // Add current state of previewCanvas

                if (i % 10 === 0 || i === totalFrames -1) { // Log frame addition less frequently
                    console.log(`[Diag][generateVideoCanvas] Added frame ${i + 1}/${totalFrames}. Filter applied: ${filterForThisFrame}`);
                }
            }

            // After loop, restore preview to user's selected filter for consistency
            drawTextOnCanvas();

            updateStatus("Compiling WebM video... This might take a significant amount of time.");
            console.log("[Diag][generateVideoCanvas] Attempting to compile WebM video...");

            const videoBlob = await new Promise((resolve, reject) => {
                try {
                    console.log("[Diag][generateVideoCanvas] Calling video.compile()...");
                    const result = video.compile(); // This is synchronous
                    console.log("[Diag][generateVideoCanvas] video.compile() finished.");
                    if (!result) {
                        console.error("[Diag][generateVideoCanvas] video.compile() returned null or undefined.");
                        reject(new Error("Compilation resulted in a null/undefined object."));
                        return;
                    }
                    console.log(`[Diag][generateVideoCanvas] video.compile() returned Blob: Size: ${result.size}, Type: ${result.type}`);
                    if (result.size === 0) {
                        console.warn("[Diag][generateVideoCanvas] video.compile() produced a zero-size Blob.");
                        // Not rejecting here, but this is a strong indicator of failure.
                    }
                    resolve(result);
                } catch (compileError) {
                    console.error("[Diag][generateVideoCanvas] Error explicitly thrown during Whammy compile:", compileError);
                    reject(compileError);
                }
            });

            if (!videoBlob) {
                updateStatus("Error: Video compilation failed to produce a valid video Blob.");
                console.error("[Diag][generateVideoCanvas] videoBlob is null or undefined after promise. Aborting download link setup.");
                // generateBtn.disabled = false; // Already handled in finally
                return; // Critical error, stop here
            }

            console.log(`[Diag][generateVideoCanvas] Final videoBlob details: Size: ${videoBlob.size}, Type: ${videoBlob.type}`);
            if (videoBlob.size === 0) {
                updateStatus("Warning: Generated video file is empty (0 bytes). It might not play correctly.");
                // We'll still create a download link to allow inspection of the (empty) file.
            }

            const videoUrl = URL.createObjectURL(videoBlob);
            console.log("[Diag][generateVideoCanvas] WebM video Blob URL created:", videoUrl);

            downloadLink.href = videoUrl;
            downloadLink.download = `video_output_${Date.now()}.webm`;
            downloadLink.style.display = 'block';
            downloadLink.textContent = 'Download Video (WebM)';
            updateStatus("WebM video ready for download!");

        } catch (error) {
            console.error("[Diag][generateVideoCanvas] Error during Canvas video generation:", error);
            updateStatus(`Error during video generation: ${error.message || String(error)}.`);
            alert(`An error occurred during video generation: ${error.message || String(error)}.`);
        } finally {
            console.log("[Diag][generateVideoWhammy] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }


    async function generateVideoWithMediaRecorder() {
        console.log("[Diag][MediaRecorder] Entered generateVideoWithMediaRecorder function.");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            alert("Please upload an image first.");
            return;
        }

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);
        // Quality input is for Whammy's WebP, MediaRecorder uses videoBitsPerSecond or default.
        // const qualityVal = parseFloat(qualityInput.value);

        if (isNaN(durationSec) || durationSec <= 0) {
            updateStatus("Error: Invalid duration. Must be a positive number.");
            alert("Error: Invalid duration. Must be a positive number.");
            return;
        }
        if (isNaN(fpsVal) || fpsVal <= 0) {
            updateStatus("Error: Invalid FPS. Must be a positive integer.");
            alert("Error: Invalid FPS. Must be a positive integer.");
            return;
        }

        // Check for MediaRecorder and canvas.captureStream support
        if (!previewCanvas.captureStream) {
            const errorMsg = "Error: Your browser does not support canvas.captureStream(). Video generation failed.";
            console.error("[CRITICAL CAPABILITY CHECK FAILED]", errorMsg, "Unable to proceed.");
            updateStatus(errorMsg);
            alert(errorMsg);
            return;
        }
        if (!window.MediaRecorder) {
            const errorMsg = "Error: Your browser does not support MediaRecorder API. Video generation failed.";
            console.error("[CRITICAL CAPABILITY CHECK FAILED]", errorMsg, "Unable to proceed.");
            updateStatus(errorMsg);
            alert(errorMsg);
            return;
        }

        // Determine supported MIME type
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

        if (!supportedMimeType) {
            const errorMsg = "Error: No supported WebM MIME type found for MediaRecorder. Video generation failed.";
            console.error("[CRITICAL CAPABILITY CHECK FAILED]", errorMsg, "Supported types checked:", mimeTypes, "Unable to proceed.");
            updateStatus(errorMsg);
            alert(errorMsg);
            return;
        }
        console.log(`[Diag][MediaRecorder] Using MIME type: ${supportedMimeType}`);
        console.log(`[Diag][MediaRecorder] Inputs: durationSec=${durationSec}, fpsVal=${fpsVal}`);

        updateStatus("Starting video generation with MediaRecorder... This may take some time.");
        generateBtn.disabled = true;
        downloadLink.style.display = 'none';

        const recordedChunks = [];
        let mediaRecorder;
        let renderLoopId; // For requestAnimationFrame

        try {
            const stream = previewCanvas.captureStream(fpsVal);
            console.log(`[Diag][MediaRecorder] Canvas stream captured with ${fpsVal} FPS. Stream state: ${stream.active}`);

            if (stream.getVideoTracks().length > 0) {
                const videoTrack = stream.getVideoTracks()[0];
                console.log(`[Diag][MediaRecorder] Video track state: ${videoTrack.readyState}, enabled: ${videoTrack.enabled}, muted: ${videoTrack.muted}`);
                videoTrack.onended = () => {
                    console.warn("[Diag][MediaRecorder] Video track ended unexpectedly!");
                    // If track ends, MediaRecorder might stop.
                    if (mediaRecorder && mediaRecorder.state === "recording") {
                        mediaRecorder.stop(); // Attempt to finalize if not already stopping
                        console.log("[Diag][MediaRecorder] Called mediaRecorder.stop() because video track ended.");
                    }
                };
                videoTrack.onmute = () => console.log("[Diag][MediaRecorder] Video track muted.");
                videoTrack.onunmute = () => console.log("[Diag][MediaRecorder] Video track unmuted.");
            } else {
                console.error("[Diag][MediaRecorder] No video tracks found in captured stream!");
                throw new Error("Failed to capture video track from canvas.");
            }

            // Options for MediaRecorder. We can experiment with videoBitsPerSecond.
            // A common default is 2.5 Mbps (2500000)
            const options = {
                mimeType: supportedMimeType,
                videoBitsPerSecond: 2500000 // Example: 2.5 Mbps
            };
            // The 'qualityInput' previously used for Whammy's WebP quality could be repurposed
            // to select different bitrates here if desired. For now, using a fixed bitrate.
            // For example: if (qualityInput.value === '0.3') options.videoBitsPerSecond = 500000; etc.

            mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                    console.log(`[Diag][MediaRecorder] Data available: chunk size ${event.data.size}`);
                } else {
                    console.log("[Diag][MediaRecorder] Data available: chunk size 0 (ignoring).");
                }
            };

            mediaRecorder.onstop = () => {
                console.log("[Diag][MediaRecorder] Recording stopped.");
                if (renderLoopId) { // Ensure render loop is stopped
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                }

                if (recordedChunks.length === 0) {
                    console.error("[Diag][MediaRecorder] No data chunks recorded. Video will be empty.");
                    updateStatus("Error: No video data was recorded. Output might be empty or invalid.");
                    // generateBtn.disabled = false; // Handled in finally
                    // downloadLink.style.display = 'none'; // Already hidden
                    // return; // Let finally block handle button re-enable
                } else {
                    const videoBlob = new Blob(recordedChunks, { type: supportedMimeType });
                    console.log(`[Diag][MediaRecorder] Video Blob created. Size: ${videoBlob.size}, Type: ${videoBlob.type}`);

                    if (videoBlob.size === 0) {
                         updateStatus("Warning: Generated video file is empty (0 bytes).");
                    }

                    const videoUrl = URL.createObjectURL(videoBlob);
                    downloadLink.href = videoUrl;
                    downloadLink.download = `video_output_mr_${Date.now()}.webm`;
                    downloadLink.style.display = 'block';
                    downloadLink.textContent = 'Download Video (WebM - MediaRecorder)';
                    updateStatus("MediaRecorder video ready for download!");
                }
                // Re-enable button in finally block
            };

            mediaRecorder.onerror = (event) => {
                console.error("[Diag][MediaRecorder] MediaRecorder error:", event.error);
                updateStatus(`MediaRecorder error: ${event.error.name} - ${event.error.message}`);
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                }
                // Button re-enabled in finally block
            };

            let currentFrame = 0;
            const totalFrames = Math.floor(durationSec * fpsVal);
            console.log(`[Diag][MediaRecorder] Calculated totalFrames: ${totalFrames}`);
            console.log(`[Diag][MediaRecorder] Effect sequence for video:`, JSON.parse(JSON.stringify(effectSequence))); // Log a deep copy

            // Function to determine filter for a given frame based on the effectSequence
            function getFilterForFrame(frameIndex, sequence) {
                let cumulativeFrames = 0;
                for (const effect of sequence) {
                    if (frameIndex >= cumulativeFrames && frameIndex < cumulativeFrames + effect.frames) {
                        return effect.type;
                    }
                    cumulativeFrames += effect.frames;
                }
                return 'none'; // Default if frameIndex is past all defined effects in sequence
            }

            // --- Pre-draw frame 0 before starting recorder ---
            const filterForFrameZero = getFilterForFrame(0, effectSequence);
            console.log(`[Diag][MediaRecorder] Pre-drawing frame 0 with filter: ${filterForFrameZero}`);
            drawTextOnCanvas(filterForFrameZero);
            // --- End Pre-draw ---

            currentFrame = 0; // Reset/initialize for the renderLoop.

            function renderFrame() {
                // It's crucial to check recorder state here too, as rAF might fire once more
                // even after stop() is called and before onstop clears renderLoopId.
                if (!mediaRecorder || mediaRecorder.state !== "recording") {
                    console.warn(`[Diag][MediaRecorder] renderFrame called but recorder state is '${mediaRecorder ? mediaRecorder.state : "null"}'. Halting rAF.`);
                    if(renderLoopId) {
                        cancelAnimationFrame(renderLoopId);
                        renderLoopId = null;
                    }
                    return;
                }

                if (currentFrame < totalFrames) {
                    const filterForThisFrame = getFilterForFrame(currentFrame, effectSequence);
                    drawTextOnCanvas(filterForThisFrame); // Update canvas content

                    if(currentFrame % fpsVal === 0) { // Update status roughly every second
                         updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterForThisFrame})`);
                    }
                    // console.log(`[Diag][MediaRecorder] renderFrame loop: Drawing frame content for index ${currentFrame}. Filter: ${filterForThisFrame}`); // Potentially too verbose
                    currentFrame++;
                    renderLoopId = requestAnimationFrame(renderFrame);
                } else {
                    console.log(`[Diag][MediaRecorder] renderFrame loop: Target totalFrames (${totalFrames}) reached or exceeded by currentFrame (${currentFrame}).`);
                    // The loop will stop naturally as currentFrame will no longer be < totalFrames.
                    // If mediaRecorder.stop() hasn't been called by timeout yet, it will continue recording 'empty' time.
                    // The timeout for stop() is the primary mechanism for ending recording.
                    // No need to explicitly set renderLoopId = null here as rAF won't schedule new calls.
                }
            }

            mediaRecorder.onstart = () => {
                console.log(`[Diag][MediaRecorder] MediaRecorder.onstart event. State: ${mediaRecorder.state}. Timestamp: ${Date.now()}`);
                if (mediaRecorder.state === "recording") {
                    updateStatus("Recording in progress...");
                    currentFrame = 0; // Ensure frame count starts from 0 for this recording session
                    renderLoopId = requestAnimationFrame(renderFrame); // Start rendering loop

                    // Schedule stop command only after recording has started
                    const timeoutId = setTimeout(() => {
                        console.log(`[Diag][MediaRecorder] setTimeout for stop() fired. Current state: ${mediaRecorder.state}. Timestamp: ${Date.now()}`);
                        if (mediaRecorder && mediaRecorder.state === "recording") {
                            console.log("[Diag][MediaRecorder] Calling mediaRecorder.stop() from setTimeout.");
                            mediaRecorder.stop(); // This should trigger mediaRecorder.onstop
                        }
                        // No need to cancel rAF here; onstop will handle it, or renderFrame will stop itself if state changes.
                    }, durationSec * 1000);
                    console.log(`[Diag][MediaRecorder] setTimeout for stop() scheduled for ${durationSec * 1000}ms. ID: ${timeoutId}. Timestamp: ${Date.now()}`);
                } else {
                    console.error(`[Diag][MediaRecorder] onstart event fired but state is not 'recording' (${mediaRecorder.state}). Video generation may fail.`);
                    updateStatus(`Error: Recording could not start properly (state: ${mediaRecorder.state}).`);
                    // Consider cleaning up / re-enabling button if this path is hit
                    generateBtn.disabled = false;
                }
            };

            // Note: Frame 0 content was pre-drawn before this point.
            console.log(`[Diag][MediaRecorder] Calling mediaRecorder.start() (after pre-drawing frame 0). Current state: ${mediaRecorder.state}. Timestamp: ${Date.now()}`);
            mediaRecorder.start(); // Request to start recording. onstart will confirm.

        } catch (error) {
            console.error("[Diag][MediaRecorder] Error during MediaRecorder video generation setup:", error);
            updateStatus(`Error: ${error.message || error}`);
            if (renderLoopId) {
                cancelAnimationFrame(renderLoopId);
            }
        } finally {
            console.log("[Diag][MediaRecorder] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }

});
