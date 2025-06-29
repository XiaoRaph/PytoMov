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
            if (!loadedImage) {
                updateStatus("Error: Please upload an image first.");
                return;
            }
            const duration = parseFloat(durationInput.value);
            const fps = parseInt(fpsInput.value, 10);

            if (isNaN(duration) || duration <=0) {
                updateStatus("Error: Please enter a valid positive duration.");
                return;
            }
            if (isNaN(fps) || fps <=0) {
                updateStatus("Error: Please enter a valid positive FPS.");
                return;
            }

            updateStatus('Generate button clicked. Preparing data for FFmpeg (next step)...');
            console.log({
                imageName: loadedImage.name || "loaded_image",
                text: textInput.value,
                duration: duration,
                fps: fps,
                fontSize: fontSizeInput.value,
                fontFamily: fontFamilyInput.value,
                textColor: textColorInput.value,
                bgColor: enableBgColorCheckbox.checked ? bgColorInput.value : "None"
            });
            // FFmpeg logic is now called directly by this name
            // generateVideoWithFFmpeg(); // This was a slight redundancy; the function IS generateVideoWithFFmpeg
        });
    }

    // --- FFmpeg Integration ---
    let ffmpeg;
    let ffmpegLoaded = false;

    async function loadFFmpeg() {
        if (ffmpegLoaded) return ffmpeg;
        updateStatus("Loading FFmpeg-core. This might take a moment...");
        try {
            ffmpeg = new FFmpeg.FFmpeg(); // Use the global FFmpeg object from the CDN script

            // Set up logger and progress updates
            ffmpeg.on('log', ({ type, message }) => {
                // type can be 'fferr', 'info', 'ffout'
                // console.log(`FFmpeg log (${type}): ${message}`);
                if (type === 'fferr' || type === 'info') { // Avoid too much ffout spam
                    updateStatus(`FFmpeg: ${message.substring(0,150)}...`); // Keep status short
                }
            });
            ffmpeg.on('progress', ({ progress, time }) => {
                const progressPercent = Math.round(progress * 100);
                if (progressPercent > 0 && progressPercent <= 100) {
                    updateStatus(`Encoding: ${progressPercent}% (frame time: ${time / 1000000}s)`);
                }
            });

            // Load the WASM core.
            // The path to ffmpeg-core.wasm etc. might need to be configured if not automatically found.
            // For unpkg, it usually resolves correctly relative to the ffmpeg.min.js script.
            // Example using a specific core path if needed:
            // await ffmpeg.load({
            //    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js", // or .wasm, .worker.js etc.
            // });
            // Check ffmpeg.wasm documentation for the correct way to load for the version you're using.
            // For v0.12.x, it often involves loading core and wasm files.
            // For simplicity, let's assume the default load() works or adjust based on version docs.
             // For ffmpeg.wasm v0.11 and later, the load method is simplified.
            // For v0.12.x, you might need to specify coreURL or it might load it from a default path.
            // The CDN version of ffmpeg.min.js should handle this.
            await ffmpeg.load();

            ffmpegLoaded = true;
            updateStatus("FFmpeg loaded successfully.");
            return ffmpeg;
        } catch (error) {
            console.error("Error loading FFmpeg:", error);
            updateStatus(`Error loading FFmpeg: ${error}. Check console for details.`);
            ffmpegLoaded = false; // Ensure it's marked as not loaded
            throw error; // Re-throw for generateVideo to catch
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
        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            alert("Please upload an image first."); // More prominent error
            return;
        }

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);

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


        if (!ffmpegLoaded) {
            updateStatus("FFmpeg is not loaded. Attempting to load now...");
            try {
                await loadFFmpeg();
                if (!ffmpegLoaded) { // Check again after load attempt
                    updateStatus("FFmpeg could not be loaded. Cannot generate video.");
                    alert("FFmpeg could not be loaded. Cannot generate video. Check console.");
                    return;
                }
            } catch (error) {
                 updateStatus("FFmpeg could not be loaded. Cannot generate video.");
                 alert("FFmpeg could not be loaded. Cannot generate video. Check console.");
                return;
            }
        }

        updateStatus("Starting video generation... This may take some time.");
        generateBtn.disabled = true;
        downloadLink.style.display = 'none';

        try {
            const textToRender = textInput.value; // Already captured by drawTextOnCanvas
            const durationSec = parseFloat(durationInput.value);
            const fpsVal = parseInt(fpsInput.value, 10);
            const inputImageName = 'input.png'; // Arbitrary name for FFmpeg's FS
            const outputVideoName = 'output.mp4';

            // 1. Get image data from canvas (which already has text drawn on it)
            //    It's important that drawTextOnCanvas() has been called with latest settings before this.
            drawTextOnCanvas(); // Ensure canvas is up-to-date
            const dataURL = previewCanvas.toDataURL('image/png');
            const fetchRes = await fetch(dataURL);
            const blob = await fetchRes.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 2. Write the image to FFmpeg's virtual file system
            updateStatus("Writing image to FFmpeg virtual file system...");
            await ffmpeg.writeFile(inputImageName, uint8Array);
            updateStatus("Image written to FS.");

            // 3. Construct and run FFmpeg command
            // Command for creating a video from a single image, ensuring correct frame duplication.
            // The text is already on the image via canvas.
            // By setting -r for the input, we tell FFmpeg to treat the single image as a sequence of frames at that rate.
            const command = [
                '-r', `${fpsVal}`,            // Set the input frame rate for the image
                '-i', inputImageName,         // Input image file
                '-vf', `format=yuv420p`,      // Ensure yuv420p for MP4 compatibility (fps filter removed as input rate handles it)
                '-c:v', 'libx264',            // Video codec
                '-preset', 'ultrafast',       // Encoding speed
                '-tune', 'stillimage',        // Optimize for still images
                '-t', `${durationSec}`,       // Duration of the output video
                // '-loop 1' is removed as -r on input handles the "looping" or frame duplication effectively.
                // The `fps=${fpsVal}` in vf is also removed because the input stream is now correctly rated.
                outputVideoName
            ];

            updateStatus(`Running FFmpeg command: ffmpeg ${command.join(' ')}`);
            await ffmpeg.exec(...command); // Spread the array for exec
            updateStatus("FFmpeg processing complete.");

            // 4. Read the output video file
            updateStatus("Reading processed video file...");
            const outputData = await ffmpeg.readFile(outputVideoName);
            updateStatus("Video file read.");

            // 5. Create a Blob and provide a download link
            const videoBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(videoBlob);

            downloadLink.href = videoUrl;
            downloadLink.download = `video_output_${Date.now()}.mp4`;
            downloadLink.style.display = 'block';
            downloadLink.textContent = 'Download Video';
            updateStatus("Video ready for download!");

            // Clean up the file from FFmpeg's FS
            // await ffmpeg.deleteFile(inputImageName); // FS is usually in memory and gets reset.
            // await ffmpeg.deleteFile(outputVideoName); // Explicit deletion can be added if memory becomes an issue.

        } catch (error) {
            console.error("Error during FFmpeg processing:", error);
            updateStatus(`Error during video generation: ${error.message || error}. Check console for more details.`);
            alert(`An error occurred during video generation: ${error.message || error}. Please check the console for more details and try again. If the error persists, try refreshing the page or using a smaller image/shorter duration.`);
        } finally {
            generateBtn.disabled = false; // Re-enable button
        }
    }

});
