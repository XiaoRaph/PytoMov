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
        statusMessages.innerHTML = `<p>${message}</p>`;
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

            console.log("[Diag] Calling generateVideoWithFFmpeg()...");
            generateVideoWithFFmpeg(); // Corrected: This was the missing call
            console.log("[Diag] Returned from generateVideoWithFFmpeg() call site.");
        });
    }

    // --- FFmpeg Integration ---
    let ffmpeg;
    let ffmpegLoaded = false;

    async function loadFFmpeg() {
        console.log("[Diag][loadFFmpeg] Attempting to load FFmpeg...");
        if (ffmpegLoaded) {
            console.log("[Diag][loadFFmpeg] FFmpeg already loaded. Returning instance.");
            return ffmpeg;
        }
        updateStatus("Loading FFmpeg-core. This might take a moment...");
        console.log("[Diag][loadFFmpeg] FFmpeg not loaded yet. Proceeding with load sequence.");

        try {
            console.log("[Diag][loadFFmpeg] Instantiating FFmpegWASM.FFmpeg()...");
            ffmpeg = new FFmpegWASM.FFmpeg();
            console.log("[Diag][loadFFmpeg] FFmpeg instance created.");

            ffmpeg.on('log', ({ type, message }) => {
                // console.log(`[Diag][FFmpeg Internal Log] (${type}): ${message}`); // Potentially too verbose
                if (type === 'fferr' || type === 'info') {
                     console.log(`[Diag][FFmpeg Internal Log] (${type}): ${message.substring(0,200)}...`);
                    updateStatus(`FFmpeg: ${message.substring(0,150)}...`);
                }
            });
            ffmpeg.on('progress', ({ progress, time }) => {
                const progressPercent = Math.round(progress * 100);
                if (progressPercent > 0 && progressPercent <= 100) {
                    console.log(`[Diag][FFmpeg Progress] ${progressPercent}% (time: ${time})`);
                    updateStatus(`Encoding: ${progressPercent}% (frame time: ${time / 1000000}s)`);
                }
            });
            console.log("[Diag][loadFFmpeg] Event listeners for log and progress attached.");

            console.log("[Diag][loadFFmpeg] Calling ffmpeg.load()...");
            await ffmpeg.load();
            console.log("[Diag][loadFFmpeg] ffmpeg.load() completed.");

            ffmpegLoaded = true;
            console.log("[Diag][loadFFmpeg] ffmpegLoaded set to true.");
            updateStatus("FFmpeg loaded successfully.");
            return ffmpeg;
        } catch (error) {
            console.error("[Diag][loadFFmpeg] Error during FFmpeg loading:", error);
            updateStatus(`Error loading FFmpeg: ${error}. Check console for details.`);
            ffmpegLoaded = false;
            console.log("[Diag][loadFFmpeg] ffmpegLoaded set to false due to error.");
            throw error;
        } finally {
            console.log(`[Diag][loadFFmpeg] Exiting loadFFmpeg function. ffmpegLoaded: ${ffmpegLoaded}`);
        }
    }

    // Pre-load FFmpeg when the page is ready, but don't block UI
    // Also, disable button until FFmpeg is loaded for the first time.
    generateBtn.disabled = true;
    updateStatus("Initializing FFmpeg - Please wait...");
    loadFFmpeg()
        .then(() => {
            generateBtn.disabled = false;
            updateStatus("FFmpeg initialized. Ready to generate video.");
        })
        .catch(err => {
            console.warn("Pre-loading FFmpeg failed. Button will remain disabled until manual load attempt or refresh.");
            updateStatus("FFmpeg failed to initialize. Please refresh or check console. Generation disabled.");
            // Keep button disabled as FFmpeg is critical
        });


    async function generateVideoWithFFmpeg() {
        console.log("[Diag][generateVideo] Entered function.");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            console.error("[Diag][generateVideo] No loadedImage found. Aborting.");
            alert("Please upload an image first.");
            return;
        }
        console.log("[Diag][generateVideo] loadedImage check passed.");

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);
        console.log(`[Diag][generateVideo] Parsed duration: ${durationSec}, Parsed FPS: ${fpsVal}`);

        if (isNaN(durationSec) || durationSec <= 0) {
            updateStatus("Error: Invalid duration. Must be a positive number.");
            console.error(`[Diag][generateVideo] Invalid duration: ${durationSec}. Aborting.`);
            alert("Error: Invalid duration. Must be a positive number.");
            return;
        }
        if (isNaN(fpsVal) || fpsVal <= 0) {
            updateStatus("Error: Invalid FPS. Must be a positive integer.");
            console.error(`[Diag][generateVideo] Invalid FPS: ${fpsVal}. Aborting.`);
            alert("Error: Invalid FPS. Must be a positive integer.");
            return;
        }
        console.log("[Diag][generateVideo] Duration and FPS validation passed.");

        console.log(`[Diag][generateVideo] Checking ffmpegLoaded state: ${ffmpegLoaded}`);
        if (!ffmpegLoaded) {
            updateStatus("FFmpeg is not loaded. Attempting to load now...");
            console.log("[Diag][generateVideo] FFmpeg not loaded. Calling loadFFmpeg().");
            try {
                await loadFFmpeg();
                console.log(`[Diag][generateVideo] loadFFmpeg() completed. New ffmpegLoaded state: ${ffmpegLoaded}`);
                if (!ffmpegLoaded) {
                    updateStatus("FFmpeg could not be loaded. Cannot generate video.");
                    console.error("[Diag][generateVideo] FFmpeg still not loaded after attempt. Aborting.");
                    alert("FFmpeg could not be loaded. Cannot generate video. Check console.");
                    return;
                }
            } catch (error) {
                 updateStatus("FFmpeg could not be loaded. Cannot generate video.");
                 console.error("[Diag][generateVideo] Error during dynamic loadFFmpeg call:", error);
                 alert("FFmpeg could not be loaded. Cannot generate video. Check console.");
                return;
            }
        }
        console.log("[Diag][generateVideo] FFmpeg is loaded and ready.");

        updateStatus("Starting video generation... This may take some time.");
        console.log("[Diag][generateVideo] Disabling generate button and hiding download link.");
        generateBtn.disabled = true;
        downloadLink.style.display = 'none';

        try {
            console.log("[Diag][generateVideo] Entering FFmpeg processing try block.");
            // const textToRender = textInput.value; // Already captured by drawTextOnCanvas (and not directly used here)
            // Re-parse for safety, though already done above.
            const currentDurationSec = parseFloat(durationInput.value);
            const currentFpsVal = parseInt(fpsInput.value, 10);
            const inputImageName = 'input.png';
            const outputVideoName = 'output.mp4';
            console.log(`[Diag][generateVideo] Using Duration: ${currentDurationSec}, FPS: ${currentFpsVal}`);


            console.log("[Diag][generateVideo] Ensuring canvas is up-to-date by calling drawTextOnCanvas().");
            drawTextOnCanvas();
            console.log("[Diag][generateVideo] Getting dataURL from previewCanvas.");
            const dataURL = previewCanvas.toDataURL('image/png');
            console.log("[Diag][generateVideo] Fetching dataURL.");
            const fetchRes = await fetch(dataURL);
            console.log("[Diag][generateVideo] Converting fetched response to blob.");
            const blob = await fetchRes.blob();
            console.log("[Diag][generateVideo] Converting blob to arrayBuffer.");
            const arrayBuffer = await blob.arrayBuffer();
            console.log("[Diag][generateVideo] Converting arrayBuffer to Uint8Array.");
            const uint8Array = new Uint8Array(arrayBuffer);
            console.log("[Diag][generateVideo] Image data prepared as Uint8Array.");

            updateStatus("Writing image to FFmpeg virtual file system...");
            console.log(`[Diag][generateVideo] Writing image to FFmpeg FS as '${inputImageName}'.`);
            await ffmpeg.writeFile(inputImageName, uint8Array);
            console.log(`[Diag][generateVideo] Image written to FFmpeg FS successfully.`);
            updateStatus("Image written to FS.");

            const command = [
                '-r', `${currentFpsVal}`,
                '-i', inputImageName,
                '-vf', `format=yuv420p`,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-tune', 'stillimage',
                '-t', `${currentDurationSec}`,
                outputVideoName
            ];
            console.log("[Diag][generateVideo] FFmpeg command constructed:", command);

            updateStatus(`Running FFmpeg command: ffmpeg ${command.join(' ')}`);
            console.log("[Diag][generateVideo] Executing FFmpeg command...");
            await ffmpeg.exec(...command);
            console.log("[Diag][generateVideo] FFmpeg command execution completed.");
            updateStatus("FFmpeg processing complete.");

            updateStatus("Reading processed video file...");
            console.log(`[Diag][generateVideo] Reading output file '${outputVideoName}' from FFmpeg FS.`);
            const outputData = await ffmpeg.readFile(outputVideoName);
            console.log("[Diag][generateVideo] Output file read successfully from FFmpeg FS.");
            updateStatus("Video file read.");

            console.log("[Diag][generateVideo] Creating Blob for download link.");
            const videoBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(videoBlob);
            console.log("[Diag][generateVideo] Blob URL created:", videoUrl.substring(0, 100) + "...");

            downloadLink.href = videoUrl;
            downloadLink.download = `video_output_${Date.now()}.mp4`;
            downloadLink.style.display = 'block';
            downloadLink.textContent = 'Download Video';
            console.log("[Diag][generateVideo] Download link prepared and displayed.");
            updateStatus("Video ready for download!");

        } catch (error) {
            console.error("[Diag][generateVideo] Error during FFmpeg processing:", error);
            updateStatus(`Error during video generation: ${error.message || error}. Check console for more details.`);
            alert(`An error occurred during video generation: ${error.message || error}. Please check the console for more details and try again. If the error persists, try refreshing the page or using a smaller image/shorter duration.`);
        } finally {
            console.log("[Diag][generateVideo] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }

});
