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
    const imageUpload = document.getElementById('imageUpload');
    const textInput = document.getElementById('textInput');
    const durationInput = document.getElementById('durationInput');
    const fpsInput = document.getElementById('fpsInput');
    const originalFramesInput = document.getElementById('originalFramesInput'); // This will be null if element is missing
    const fontSizeInput = document.getElementById('fontSizeInput');
    const textColorInput = document.getElementById('textColorInput');
    const fontFamilyInput = document.getElementById('fontFamilyInput');
    const generateBtn = document.getElementById('generateBtn');
    const statusMessages = document.getElementById('statusMessages');
    const downloadLink = document.getElementById('downloadLink');
    const previewCanvas = document.getElementById('previewCanvas');
    let ctx = null;
    if (previewCanvas) {
        ctx = previewCanvas.getContext('2d');
    } else {
        console.error("Element with ID 'previewCanvas' not found. Preview will not work.");
    }
    const bgColorInput = document.getElementById('bgColorInput');
    const clearBgColorBtn = document.getElementById('clearBgColorBtn');
    const enableBgColorCheckbox = document.getElementById('enableBgColor');
    const textPositionInput = document.getElementById('textPositionInput');
    const imageFilterInput = document.getElementById('imageFilterInput');

    const newEffectTypeInput = document.getElementById('newEffectType');
    const newEffectDurationFramesInput = document.getElementById('newEffectDurationFrames');
    const addEffectToSequenceBtn = document.getElementById('addEffectToSequenceBtn');
    const effectSequenceListContainer = document.getElementById('effectSequenceListContainer');

    const previewArea = document.getElementById('previewArea');
    const originalPreviewCanvas = document.getElementById('originalPreviewCanvas');
    let originalCtx = null;
    if (originalPreviewCanvas) {
        originalCtx = originalPreviewCanvas.getContext('2d');
    } else {
        console.error("Element with ID 'originalPreviewCanvas' not found. Original image preview will not work.");
    }
    const audioUpload = document.getElementById('audioUpload');

    let loadedImage = null;
    let loadedAudioArrayBuffer = null;
    let effectSequence = [];

    if (audioUpload) {
        audioUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedAudioArrayBuffer = e.target.result;
                    updateStatus(`Audio file "${file.name}" loaded.`);
                    console.log(`Audio file "${file.name}" loaded, size: ${loadedAudioArrayBuffer.byteLength} bytes.`);
                };
                reader.onerror = (e) => {
                    loadedAudioArrayBuffer = null;
                    updateStatus(`Error loading audio file: ${file.name}. Error: ${e.target.error}`);
                    console.error(`Error loading audio file: ${file.name}`, e.target.error);
                };
                reader.readAsArrayBuffer(file);
            } else {
                loadedAudioArrayBuffer = null;
                updateStatus("Audio selection cleared.");
                console.log("Audio selection cleared.");
            }
        });
    }

    function renderEffectSequenceList() {
        if (!effectSequenceListContainer) {
            console.warn("renderEffectSequenceList: effectSequenceListContainer not found.");
            return;
        }
        effectSequenceListContainer.innerHTML = '';
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
            removeBtn.dataset.index = index;
            removeBtn.addEventListener('click', (event) => {
                const indexToRemove = parseInt(event.target.dataset.index, 10);
                effectSequence.splice(indexToRemove, 1);
                renderEffectSequenceList();
                updateStatus(`Effect at position ${indexToRemove + 1} removed from sequence.`);
            });
            li.appendChild(removeBtn);
            ol.appendChild(li);
        });
        effectSequenceListContainer.appendChild(ol);
    }
    renderEffectSequenceList(); // Call it once to initialize the list display

    if (addEffectToSequenceBtn) {
        addEffectToSequenceBtn.addEventListener('click', () => {
            if (!newEffectTypeInput || !newEffectDurationFramesInput) {
                console.error("Effect type or duration input elements not found.");
                updateStatus("Error: UI elements for adding effects are missing.");
                return;
            }
            const effectType = newEffectTypeInput.value;
            const durationFrames = parseInt(newEffectDurationFramesInput.value, 10);
            if (isNaN(durationFrames) || durationFrames <= 0) {
                updateStatus("Error: Please enter a valid positive number for frame duration.");
                alert("Error: Please enter a valid positive number for frame duration.");
                return;
            }
            effectSequence.push({ type: effectType, frames: durationFrames });
            renderEffectSequenceList();
            if (newEffectDurationFramesInput) newEffectDurationFramesInput.value = '24'; // Reset after adding
            updateStatus(`Effect "${effectType}" for ${durationFrames} frames added to sequence.`);
        });
    } else {
        console.warn("Element with ID 'addEffectToSequenceBtn' not found. Adding effects to sequence will not work.");
        if (newEffectTypeInput) newEffectTypeInput.disabled = true;
        if (newEffectDurationFramesInput) newEffectDurationFramesInput.disabled = true;
    }

    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedImage = new Image();
                    loadedImage.onload = () => {
                        if (originalPreviewCanvas && previewCanvas && originalCtx && ctx && previewArea) {
                            originalPreviewCanvas.width = loadedImage.width;
                            originalPreviewCanvas.height = loadedImage.height;
                            previewCanvas.width = loadedImage.width;
                            previewCanvas.height = loadedImage.height;
                            originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                            originalCtx.drawImage(loadedImage, 0, 0);
                            previewArea.style.display = 'flex';
                            updateStatus(`Image "${file.name}" loaded.`);
                            drawTextOnCanvas();
                        } else {
                            console.error("One or more canvas elements (previewCanvas, originalPreviewCanvas, ctx, originalCtx, previewArea) are missing.");
                            updateStatus("Error: Canvas elements missing, cannot display image.");
                            loadedImage = null;
                        }
                    };
                    loadedImage.onerror = () => {
                        updateStatus(`Error loading image: ${file.name}`);
                        loadedImage = null;
                        if (previewArea) previewArea.style.display = 'none';
                    };
                    loadedImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                loadedImage = null;
                if (previewArea) previewArea.style.display = 'none';
                if (originalCtx && originalPreviewCanvas) originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                if (ctx && previewCanvas) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                updateStatus("Image selection cleared.");
            }
        });
    } else {
        console.error("Element with ID 'imageUpload' not found. Image uploading will not work.");
    }

    function updateStatus(message) {
        if (statusMessages) {
            statusMessages.textContent = message;
        }
        console.log(message); // Keep console log as a fallback
    }

    function applyImageFilter(forceFilterType = null) {
        if (!loadedImage) {
            // console.debug("applyImageFilter: No loaded image, returning.");
            return;
        }
        if (!previewCanvas || !ctx) {
            console.error("applyImageFilter: previewCanvas or ctx is missing.");
            return;
        }
        // Ensure image is drawn on canvas before filter application
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(loadedImage, 0, 0, previewCanvas.width, previewCanvas.height);

        const currentFilterValue = imageFilterInput ? imageFilterInput.value : 'none';
        const filterToApply = forceFilterType !== null ? forceFilterType : currentFilterValue;

        if (filterToApply === 'none') {
            // if (forceFilterType !== null) console.log("Forcing no filter for this frame.");
            // No actual filter to apply, image is already drawn.
            return;
        }
        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        const data = imageData.data;
        // Apply selected filter to the image data
        if (filterToApply === 'invert') {
            // Invert: Inverts the colors of the image.
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i]; // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
            }
        } else if (filterToApply === 'sepia') {
            // Sepia: Applies a sepia tone to the image.
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                data[i] = Math.min(255, (0.393*r) + (0.769*g) + (0.189*b)); // Red
                data[i+1] = Math.min(255, (0.349*r) + (0.686*g) + (0.168*b)); // Green
                data[i+2] = Math.min(255, (0.272*r) + (0.534*g) + (0.131*b)); // Blue
            }
        } else if (filterToApply === 'remove_red_channel') {
            // Remove Red Channel: Sets the red component of each pixel to 0.
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 0; // Red channel to 0
            }
        } else if (filterToApply === 'remove_green_channel') {
            // Remove Green Channel: Sets the green component of each pixel to 0.
            for (let i = 0; i < data.length; i += 4) {
                data[i + 1] = 0; // Green channel to 0
            }
        } else if (filterToApply === 'remove_blue_channel') {
            // Remove Blue Channel: Sets the blue component of each pixel to 0.
            for (let i = 0; i < data.length; i += 4) {
                data[i + 2] = 0; // Blue channel to 0
            }
        } else if (filterToApply === 'permute_rgb_grb') {
            // Permute RGB > GRB: Swaps red and green channels. (R,G,B) -> (G,R,B)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                // const b = data[i + 2]; // Blue remains in place
                data[i] = g;     // Red channel gets original green value
                data[i + 1] = r; // Green channel gets original red value
            }
        } else if (filterToApply === 'permute_rgb_brg') {
            // Permute RGB > BRG: Swaps red and blue channels. (R,G,B) -> (B,G,R)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                // const g = data[i + 1]; // Green remains in place
                const b = data[i + 2];
                data[i] = b;     // Red channel gets original blue value
                data[i + 2] = r; // Blue channel gets original red value
            }
        } else if (filterToApply === 'posterize') {
            // Posterize: Reduces the number of distinct colors in the image.
            const levels = 4; // Number of color levels per channel.
            const step = 255 / (levels - 1); // Calculate the size of each color step.
            for (let i = 0; i < data.length; i += 4) {
                // For each channel, quantize the color value to the nearest lower step.
                data[i] = Math.round(Math.round(data[i] / step) * step);     // Red
                data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step); // Green
                data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step); // Blue
            }
        } else if (filterToApply === 'solarize') {
            // Solarize: Inverts pixel values above a certain threshold.
            const threshold = 128; // Threshold for inversion (0-255).
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > threshold) data[i] = 255 - data[i];             // Red
                if (data[i + 1] > threshold) data[i + 1] = 255 - data[i + 1]; // Green
                if (data[i + 2] > threshold) data[i + 2] = 255 - data[i + 2]; // Blue
            }
        }
        ctx.putImageData(imageData, 0, 0);
        if (forceFilterType !== null) console.log(`Applied forced filter for frame: ${filterToApply}`);
        else console.log(`Applied UI selected filter: ${filterToApply}`);
    }

    function drawTextOnCanvas(overrideFilter = null) {
        if (!loadedImage) {
            // updateStatus("Cannot draw text: No image loaded."); // Optional: too noisy
            return;
        }
        if (!previewCanvas || !ctx) {
            console.error("drawTextOnCanvas: previewCanvas or ctx is missing.");
            updateStatus("Error: Preview canvas not available for drawing text.");
            return;
        }

        applyImageFilter(overrideFilter); // This will draw the image, then apply filter if any

        const text = textInput ? textInput.value : "Text input missing";
        const fontSize = fontSizeInput ? fontSizeInput.value : "30px";
        const fontFamily = fontFamilyInput ? (fontFamilyInput.value || 'sans-serif') : 'sans-serif';
        const textColor = textColorInput ? textColorInput.value : "#FFFFFF";
        const useBgColor = enableBgColorCheckbox ? enableBgColorCheckbox.checked : false;
        const textBgColor = bgColorInput ? bgColorInput.value : "#000000";
        const position = textPositionInput ? textPositionInput.value : "center";

        ctx.font = `${fontSize} ${fontFamily}`;
        ctx.fillStyle = textColor;

        let x, y;
        const canvasWidth = previewCanvas.width, canvasHeight = previewCanvas.height, textMargin = 20;

        switch (position) {
            case 'top_left': x = textMargin; y = textMargin; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; break;
            case 'top_center': x = canvasWidth / 2; y = textMargin; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; break;
            case 'top_right': x = canvasWidth - textMargin; y = textMargin; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; break;
            case 'center_left': x = textMargin; y = canvasHeight / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; break;
            case 'center': x = canvasWidth / 2; y = canvasHeight / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; break;
            case 'center_right': x = canvasWidth - textMargin; y = canvasHeight / 2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; break;
            case 'bottom_left': x = textMargin; y = canvasHeight - textMargin; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; break;
            case 'bottom_center': x = canvasWidth / 2; y = canvasHeight - textMargin; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; break;
            case 'bottom_right': x = canvasWidth - textMargin; y = canvasHeight - textMargin; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; break;
            default: x = canvasWidth / 2; y = canvasHeight / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        }

        if (useBgColor && textBgColor) { // textBgColor check is important if input is missing
            const textMetrics = ctx.measureText(text);
            let actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
            let actualWidth = textMetrics.width;
            // Check for NaN or Infinity which can occur if canvas is not properly sized or text is empty
            if (isNaN(actualHeight) || isNaN(actualWidth) || !isFinite(actualHeight) || !isFinite(actualWidth)) {
                const sizeMatch = fontSize.match(/(\d+)/); // Extract number from fontSize string
                actualHeight = sizeMatch ? parseInt(sizeMatch[1], 10) * 1.2 : 50 * 1.2; // Default height based on font size
                actualWidth = textMetrics.width || (text.length * (actualHeight / 1.5)); // Estimate width if not available
            }
            const padding = 10;
            let bgX = x;
            let bgY = y;

            if (ctx.textAlign === 'center') bgX -= actualWidth / 2;
            else if (ctx.textAlign === 'right') bgX -= actualWidth;

            if (ctx.textBaseline === 'middle') bgY -= actualHeight / 2;
            else if (ctx.textBaseline === 'bottom') bgY -= actualHeight;

            ctx.fillStyle = textBgColor;
            ctx.fillRect(bgX - padding, bgY - padding, actualWidth + (padding * 2), actualHeight + (padding * 2));
            ctx.fillStyle = textColor; // Reset fillStyle for the text itself
        }

        ctx.fillText(text, x, y);
        // updateStatus("Preview updated."); // Consider moving to specific user actions to avoid too frequent updates
    }

    // Centralized event handling for dynamic preview updates
    const inputsForPreviewUpdate = [
        textInput, fontSizeInput, textColorInput, fontFamilyInput,
        bgColorInput, enableBgColorCheckbox, textPositionInput, imageFilterInput
    ];

    inputsForPreviewUpdate.forEach(input => {
        if (input) {
            const eventType = (input.type === 'color' || input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                drawTextOnCanvas();
                updateStatus("Preview updated due to input change.");
            });
        } else {
            // console.warn(`An input element for preview update was not found.`); // Optional: log if an expected input is missing
        }
    });
    // fontFamilyInput was previously added twice, this loop covers it if it's a SELECT. If it needs 'input' and 'change', specific handling might be needed.

    if (clearBgColorBtn) {
        clearBgColorBtn.addEventListener('click', () => {
            if (bgColorInput) {
                bgColorInput.value = "#000000"; // Default to black
            } else {
                console.warn("Background color input (bgColorInput) not found for clearing.");
            }
            if (enableBgColorCheckbox) {
                enableBgColorCheckbox.checked = false;
            } else {
                console.warn("Enable background color checkbox (enableBgColorCheckbox) not found for clearing.");
            }
            updateStatus("Text background color disabled.");
            drawTextOnCanvas();
        });
    } else {
        console.warn("Element with ID 'clearBgColorBtn' not found. Clearing background color will not work.");
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log("[Diag] Generate button clicked.");
            if (!loadedImage) {
                updateStatus("Error: Please upload an image first.");
                alert("Error: Please upload an image first.");
                return;
            }
            if (!durationInput || !fpsInput) {
                updateStatus("Error: Duration or FPS input elements are missing. Cannot generate video.");
                console.error("Duration or FPS input elements are missing.");
                alert("Error: Duration or FPS input elements are missing. Cannot generate video.");
                return;
            }
            const duration = parseFloat(durationInput.value);
            const fps = parseInt(fpsInput.value, 10);
            if (isNaN(duration) || duration <= 0) {
                updateStatus("Error: Please enter a valid positive duration.");
                alert("Error: Please enter a valid positive duration.");
                return;
            }
            if (isNaN(fps) || fps <= 0) {
                updateStatus("Error: Please enter a valid positive FPS.");
                alert("Error: Please enter a valid positive FPS.");
                return;
            }
            console.log("[Diag] Calling generateVideoWithMediaRecorder()...");
            generateVideoWithMediaRecorder();
            console.log("[Diag] Returned from generateVideoWithMediaRecorder() call site.");
        });
    } else {
        console.error("Element with ID 'generateBtn' not found. Video generation will not work.");
    }

    async function generateVideoWithMediaRecorder() {
        console.log("[Diag][MediaRecorder] Entered generateVideoWithMediaRecorder function.");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            alert("Please upload an image first.");
            return;
        }
        if (!durationInput || !fpsInput || !previewCanvas || !downloadLink || !generateBtn) {
            updateStatus("Error: Critical elements for MediaRecorder video generation are missing from the page.");
            console.error("Critical elements for MediaRecorder (durationInput, fpsInput, previewCanvas, downloadLink, generateBtn) are missing.");
            if (generateBtn) generateBtn.disabled = false; // Re-enable if it exists
            return;
        }
        if (!ctx) { // ctx is derived from previewCanvas, but check explicitly as it's vital for drawing
             updateStatus("Error: Canvas context (ctx) is not available for MediaRecorder. Cannot draw frames.");
             console.error("Canvas context (ctx) is not available for MediaRecorder.");
             if (generateBtn) generateBtn.disabled = false;
             return;
        }

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);

        if (isNaN(durationSec) || durationSec <= 0) { updateStatus("Error: Invalid duration."); alert("Error: Invalid duration."); return; }
        if (isNaN(fpsVal) || fpsVal <= 0) { updateStatus("Error: Invalid FPS."); alert("Error: Invalid FPS."); return; }

        if (!previewCanvas.captureStream) {
            updateStatus("Error: Browser does not support canvas.captureStream(). Try a different browser like Chrome or Firefox.");
            alert("Error: Browser does not support canvas.captureStream().");
            if (generateBtn) generateBtn.disabled = false;
            return;
        }
        if (!window.MediaRecorder) {
            updateStatus("Error: Browser does not support MediaRecorder API. Try a different browser like Chrome or Firefox.");
            alert("Error: Browser does not support MediaRecorder API.");
            if (generateBtn) generateBtn.disabled = false;
            return;
        }

        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        const supportedMimeType = mimeTypes.find(type => {
            try { return MediaRecorder.isTypeSupported(type); } catch (e) { return false; }
        });

        if (!supportedMimeType) {
            updateStatus("Error: No supported MIME type found for MediaRecorder (tried WebM and MP4).");
            alert("Error: No supported MIME type found for MediaRecorder. Your browser may not support common video recording formats.");
            if (generateBtn) generateBtn.disabled = false;
            return;
        }

        console.log(`[Diag][MediaRecorder] Using MIME type: ${supportedMimeType}`);
        updateStatus("Starting video generation with MediaRecorder... This may take some time.");
        if (generateBtn) generateBtn.disabled = true; // generateBtn definitely exists due to checks above
        if (downloadLink) downloadLink.style.display = 'none'; // downloadLink definitely exists

        const recordedChunks = [];
        let mediaRecorder;
        let renderLoopId; // Stores the requestAnimationFrame ID

        try {
            let audioTrack = null;
            if (loadedAudioArrayBuffer) {
                console.log("[Diag][MediaRecorder] Audio data found, attempting to decode.");
                if (!window.AudioContext && !window.webkitAudioContext) {
                    updateStatus("Warning: Web Audio API not supported by this browser. Proceeding without audio.");
                    console.warn("Web Audio API not supported.");
                } else {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    try {
                        const decodedAudioBuffer = await audioContext.decodeAudioData(loadedAudioArrayBuffer.slice(0));
                        const audioSourceNode = audioContext.createBufferSource();
                        audioSourceNode.buffer = decodedAudioBuffer;

                        if (decodedAudioBuffer.duration < durationSec) {
                            audioSourceNode.loop = true;
                            console.log(`[Diag][MediaRecorder] Audio duration (${decodedAudioBuffer.duration}s) is shorter than video (${durationSec}s). Looping audio.`);
                        } else {
                             audioSourceNode.loop = false;
                        }

                        const mediaStreamAudioDestinationNode = audioContext.createMediaStreamDestination();
                        audioSourceNode.connect(mediaStreamAudioDestinationNode);
                        audioSourceNode.start(0);

                        if (mediaStreamAudioDestinationNode.stream.getAudioTracks().length > 0) {
                            audioTrack = mediaStreamAudioDestinationNode.stream.getAudioTracks()[0];
                            console.log("[Diag][MediaRecorder] Audio track created successfully:", audioTrack);
                        } else {
                            console.warn("[Diag][MediaRecorder] Could not get audio track from mediaStreamAudioDestinationNode.");
                            updateStatus("Warning: Could not process audio track. Video will be silent.");
                        }
                    } catch (audioDecodeError) {
                        console.error("[Diag][MediaRecorder] Error decoding audio data:", audioDecodeError);
                        updateStatus(`Error decoding audio: ${audioDecodeError.message}. Video will be generated without audio.`);
                    }
                }
            } else {
                console.log("[Diag][MediaRecorder] No audio data loaded, proceeding with video-only recording.");
            }

            console.log(`[Diag][MediaRecorder] Attempting to capture video stream with ${fpsVal} FPS.`);
            const videoStream = previewCanvas.captureStream(fpsVal);
            let finalStream;

            if (videoStream && videoStream.getVideoTracks().length > 0) {
                const videoTrack = videoStream.getVideoTracks()[0];
                if (audioTrack) {
                    finalStream = new MediaStream([videoTrack, audioTrack]);
                    console.log("[Diag][MediaRecorder] Combined video and audio tracks.");
                } else {
                    finalStream = videoStream;
                    console.log("[Diag][MediaRecorder] Using video-only stream.");
                }
            } else {
                console.error("[Diag][MediaRecorder] previewCanvas.captureStream() failed or returned no video tracks.");
                throw new Error("Failed to capture video stream from canvas. Ensure canvas is visible and valid.");
            }

            const options = { mimeType: supportedMimeType, videoBitsPerSecond: 2500000 };
            console.log("[Diag][MediaRecorder] MediaRecorder options:", options);

            try {
                mediaRecorder = new MediaRecorder(finalStream, options);
            } catch (recorderError) {
                console.error("[Diag][MediaRecorder] Error instantiating MediaRecorder:", recorderError);
                updateStatus(`Error creating MediaRecorder: ${recorderError.name} - ${recorderError.message}. Try a different browser or check supported codecs.`);
                throw recorderError;
            }

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log(`[Diag][MediaRecorder] onstop. Chunks: ${recordedChunks.length}`);
                if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }

                if (recordedChunks.length === 0) {
                    console.error("[Diag][MediaRecorder] No data chunks recorded.");
                    updateStatus("Error: No video data recorded. Output might be empty.");
                } else {
                    const videoBlob = new Blob(recordedChunks, { type: supportedMimeType });
                    const videoUrl = URL.createObjectURL(videoBlob);
                    if (downloadLink) {
                        downloadLink.href = videoUrl;
                        const fileExtension = supportedMimeType.includes('mp4') ? 'mp4' : (supportedMimeType.includes('webm') ? 'webm' : 'video');
                        downloadLink.download = `video_output_mr_${Date.now()}.${fileExtension}`;
                        downloadLink.style.display = 'block';
                        downloadLink.textContent = `Download Video (${fileExtension.toUpperCase()} - MediaRecorder)`;
                    } else {
                        console.error("Download link element not found after recording, though it was expected.");
                        updateStatus("Video ready, but download link element is missing.");
                    }
                    updateStatus("MediaRecorder video ready for download!");
                }
                // No need to check generateBtn here, finally block handles it.
            };

            mediaRecorder.onerror = (event) => {
                console.error("[Diag][MediaRecorder] onerror:", event.error || event);
                const errorDetails = event.error ? `${event.error.name}: ${event.error.message}` : 'Unknown MediaRecorder error';
                updateStatus(`MediaRecorder error: ${errorDetails}. Check console.`);
                if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
                // No need to check generateBtn here, finally block handles it.
            };

            let currentFrame = 0;
            const totalFrames = Math.floor(durationSec * fpsVal);
            const useSequence = effectSequence && effectSequence.length > 0;

            function getFilterForFrameFromSequence(frameIndex, sequence) {
                if (!useSequence) {
                    return imageFilterInput ? imageFilterInput.value : 'none';
                }
                let cumulativeFrames = 0;
                for (const effect of sequence) {
                    if (frameIndex >= cumulativeFrames && frameIndex < cumulativeFrames + effect.frames) {
                        return effect.type;
                    }
                    cumulativeFrames += effect.frames;
                }
                return sequence.length > 0 ? sequence[sequence.length -1].type : 'none';
            }

            if (useSequence) {
                 console.log(`[Diag][MediaRecorder] Using effect sequence for video generation:`, JSON.parse(JSON.stringify(effectSequence)));
            } else if (imageFilterInput) {
                 console.log(`[Diag][MediaRecorder] Using UI selected filter for video generation: ${imageFilterInput.value}`);
            }

            function renderFrame() { // Changed from renderNextFrame to renderFrame to match original
                if (currentFrame < totalFrames) {
                    const filterType = getFilterForFrameFromSequence(currentFrame, effectSequence);
                    drawTextOnCanvas(filterType);

                    if (currentFrame % Math.max(1, fpsVal) === 0) {
                         if (mediaRecorder && mediaRecorder.state) {
                            updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterType}). Recorder: ${mediaRecorder.state}`);
                         } else {
                            updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterType}). Recorder: N/A`);
                         }
                    }
                    currentFrame++;
                    renderLoopId = requestAnimationFrame(renderFrame); // Corrected to renderFrame
                } else {
                    if (mediaRecorder && mediaRecorder.state === "recording") {
                        mediaRecorder.stop();
                        console.log("[Diag][MediaRecorder] All frames rendered, stopping MediaRecorder.");
                    }
                    if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
                }
            }

            mediaRecorder.start(100);
            console.log(`[Diag][MediaRecorder] MediaRecorder started. State: ${mediaRecorder.state}`);
            updateStatus("Recording in progress...");

            renderLoopId = requestAnimationFrame(renderFrame); // Corrected to renderFrame

            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === "recording") {
                    console.log("[Diag][MediaRecorder] Timeout reached, ensuring MediaRecorder is stopped.");
                    mediaRecorder.stop();
                }
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                    console.log("[Diag][MediaRecorder] rAF cancelled by fallback timeout.");
                }
            }, (durationSec * 1000) + 500);

        } catch (error) {
            console.error("[Diag][MediaRecorder] Error during MediaRecorder setup or operation:", error);
            updateStatus(`MediaRecorder Error: ${error.message || String(error)}`);
            if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
            if (mediaRecorder && mediaRecorder.state === "recording") {
                 try { mediaRecorder.stop(); } catch (e) { console.error("Error stopping media recorder during catch:", e); }
            }
        } finally {
            console.log("[Diag][MediaRecorder] Entering finally block.");
             if (generateBtn) generateBtn.disabled = false;
        }
    }
});
