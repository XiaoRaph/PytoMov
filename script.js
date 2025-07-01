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
    const ctx = previewCanvas.getContext('2d');
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
    const originalCtx = originalPreviewCanvas.getContext('2d');

    let loadedImage = null;
    let effectSequence = [];

    function renderEffectSequenceList() {
        if (!effectSequenceListContainer) return;
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
    renderEffectSequenceList();

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
            newEffectDurationFramesInput.value = '24';
            updateStatus(`Effect "${effectType}" for ${durationFrames} frames added to sequence.`);
        });
    }

    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedImage = new Image();
                    loadedImage.onload = () => {
                        originalPreviewCanvas.width = loadedImage.width;
                        originalPreviewCanvas.height = loadedImage.height;
                        previewCanvas.width = loadedImage.width;
                        previewCanvas.height = loadedImage.height;
                        originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                        originalCtx.drawImage(loadedImage, 0, 0);
                        previewArea.style.display = 'flex';
                        updateStatus(`Image "${file.name}" loaded.`);
                        drawTextOnCanvas();
                    };
                    loadedImage.onerror = () => {
                        updateStatus(`Error loading image: ${file.name}`);
                        loadedImage = null;
                        previewArea.style.display = 'none';
                    };
                    loadedImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                loadedImage = null;
                previewArea.style.display = 'none';
                originalCtx.clearRect(0, 0, originalPreviewCanvas.width, originalPreviewCanvas.height);
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                updateStatus("Image selection cleared.");
            }
        });
    }

    function updateStatus(message) {
        statusMessages.textContent = message;
        console.log(message);
    }

    function applyImageFilter(forceFilterType = null) {
        if (!loadedImage || !previewCanvas || !ctx) return;
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(loadedImage, 0, 0, previewCanvas.width, previewCanvas.height);
        const filterToApply = forceFilterType !== null ? forceFilterType : imageFilterInput.value;
        if (filterToApply === 'none') {
            if (forceFilterType !== null) console.log("Forcing no filter for this frame.");
            return;
        }
        const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
        const data = imageData.data;
        if (filterToApply === 'invert') {
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
        } else if (filterToApply === 'sepia') {
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i+1], b = data[i+2];
                data[i] = Math.min(255, (0.393*r) + (0.769*g) + (0.189*b));
                data[i+1] = Math.min(255, (0.349*r) + (0.686*g) + (0.168*b));
                data[i+2] = Math.min(255, (0.272*r) + (0.534*g) + (0.131*b));
            }
        }
        ctx.putImageData(imageData, 0, 0);
        if (forceFilterType !== null) console.log(`Applied forced filter for frame: ${filterToApply}`);
        else console.log(`Applied UI selected filter: ${filterToApply}`);
    }

    function drawTextOnCanvas(overrideFilter = null) {
        if (!loadedImage) return;
        if (!previewCanvas || !ctx) return;
        applyImageFilter(overrideFilter);
        const text = textInput.value;
        const fontSize = fontSizeInput.value;
        const fontFamily = fontFamilyInput.value || 'sans-serif';
        const textColor = textColorInput.value;
        const useBgColor = enableBgColorCheckbox.checked;
        const textBgColor = bgColorInput.value;
        const position = textPositionInput.value;
        ctx.font = `${fontSize} ${fontFamily}`;
        ctx.fillStyle = textColor;
        let x, y;
        const canvasWidth = previewCanvas.width, canvasHeight = previewCanvas.height, textMargin = 20;
        switch (position) {
            case 'top_left': x=textMargin; y=textMargin; ctx.textAlign='left'; ctx.textBaseline='top'; break;
            case 'top_center': x=canvasWidth/2; y=textMargin; ctx.textAlign='center'; ctx.textBaseline='top'; break;
            case 'top_right': x=canvasWidth-textMargin; y=textMargin; ctx.textAlign='right'; ctx.textBaseline='top'; break;
            case 'center_left': x=textMargin; y=canvasHeight/2; ctx.textAlign='left'; ctx.textBaseline='middle'; break;
            case 'center': x=canvasWidth/2; y=canvasHeight/2; ctx.textAlign='center'; ctx.textBaseline='middle'; break;
            case 'center_right': x=canvasWidth-textMargin; y=canvasHeight/2; ctx.textAlign='right'; ctx.textBaseline='middle'; break;
            case 'bottom_left': x=textMargin; y=canvasHeight-textMargin; ctx.textAlign='left'; ctx.textBaseline='bottom'; break;
            case 'bottom_center': x=canvasWidth/2; y=canvasHeight-textMargin; ctx.textAlign='center'; ctx.textBaseline='bottom'; break;
            case 'bottom_right': x=canvasWidth-textMargin; y=canvasHeight-textMargin; ctx.textAlign='right'; ctx.textBaseline='bottom'; break;
            default: x=canvasWidth/2; y=canvasHeight/2; ctx.textAlign='center'; ctx.textBaseline='middle';
        }
        if (useBgColor && textBgColor) {
            const textMetrics = ctx.measureText(text);
            let actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
            let actualWidth = textMetrics.width;
            if(isNaN(actualHeight)||isNaN(actualWidth)){
                const sizeMatch = fontSize.match(/(\d+)/);
                actualHeight = sizeMatch ? parseInt(sizeMatch[1],10)*1.2 : 50*1.2;
                actualWidth = textMetrics.width || (text.length * (actualHeight/2));
            }
            const padding = 10; let bgX=x; let bgY=y;
            if(ctx.textAlign==='center')bgX-=actualWidth/2; else if(ctx.textAlign==='right')bgX-=actualWidth;
            if(ctx.textBaseline==='middle')bgY-=actualHeight/2; else if(ctx.textBaseline==='bottom')bgY-=actualHeight;
            ctx.fillStyle = textBgColor;
            ctx.fillRect(bgX-padding, bgY-padding, actualWidth+padding*2, actualHeight+padding*2);
            ctx.fillStyle = textColor;
        }
        ctx.fillText(text, x, y);
        updateStatus("Preview updated.");
    }

    [textInput, fontSizeInput, textColorInput, fontFamilyInput, bgColorInput, enableBgColorCheckbox, textPositionInput, imageFilterInput].forEach(input => {
        if (input) {
            const eventType = (input.type === 'color' || input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
            input.addEventListener(eventType, drawTextOnCanvas);
        }
    });
    if(fontFamilyInput) fontFamilyInput.addEventListener('change', drawTextOnCanvas);

    if (clearBgColorBtn) {
        clearBgColorBtn.addEventListener('click', () => {
            if (bgColorInput) bgColorInput.value = "#000000";
            if (enableBgColorCheckbox) enableBgColorCheckbox.checked = false;
            updateStatus("Text background color disabled.");
            drawTextOnCanvas();
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            console.log("[Diag] Generate button clicked.");
            if (!loadedImage) { updateStatus("Error: Please upload an image first."); return; }
            const duration = parseFloat(durationInput.value);
            const fps = parseInt(fpsInput.value, 10);
            if (isNaN(duration) || duration <= 0) { updateStatus("Error: Please enter a valid positive duration."); return; }
            if (isNaN(fps) || fps <= 0) { updateStatus("Error: Please enter a valid positive FPS."); return; }
            console.log("[Diag] Calling generateVideoWithMediaRecorder()...");
            generateVideoWithMediaRecorder();
            console.log("[Diag] Returned from generateVideoWithMediaRecorder() call site.");
        });
    }

    async function generateVideoWithWhammy_DEPRECATED() {
        console.log("[Diag][generateVideoWhammy] Entered function.");
        if (!loadedImage) { updateStatus("Error: Please upload an image first."); alert("Please upload an image first."); return; }
        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);
        const qualityVal = 0.8;
        if (isNaN(durationSec) || durationSec <= 0) { updateStatus("Error: Invalid duration."); alert("Error: Invalid duration."); return; }
        if (isNaN(fpsVal) || fpsVal <= 0) { updateStatus("Error: Invalid FPS."); alert("Error: Invalid FPS."); return; }
        updateStatus("Starting video generation with Whammy... This may take some time.");
        generateBtn.disabled = true; downloadLink.style.display = 'none';
        try {
            const totalFrames = Math.floor(durationSec * fpsVal);
            const numOriginalFrames = originalFramesInput ? (parseInt(originalFramesInput.value, 10) || 0) : 0;
            const video = new Whammy.Video(fpsVal, qualityVal);
            const currentlySelectedFilter = imageFilterInput.value;
            for (let i = 0; i < totalFrames; i++) {
                if (i % 10 === 0) { updateStatus(`Encoding frame ${i + 1}/${totalFrames}...`); await new Promise(resolve => setTimeout(resolve, 0)); }
                let filterForThisFrame = currentlySelectedFilter;
                if (i < numOriginalFrames) filterForThisFrame = 'none';
                drawTextOnCanvas(filterForThisFrame);
                video.add(previewCanvas);
            }
            drawTextOnCanvas();
            updateStatus("Compiling WebM video (Whammy)...");
            const videoBlob = await video.compile();
            const videoUrl = URL.createObjectURL(videoBlob);
            downloadLink.href = videoUrl; downloadLink.download = `video_output_whammy_${Date.now()}.webm`;
            downloadLink.style.display = 'block'; downloadLink.textContent = 'Download Video (WebM - Whammy)';
            updateStatus("Whammy video ready for download!");
        } catch (error) {
            console.error("[Diag][generateVideoWhammy] Error:", error);
            updateStatus(`Error (Whammy): ${error.message || String(error)}.`);
        } finally {
            console.log("[Diag][generateVideoWhammy] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }

    async function generateVideoWithMediaRecorder() {
        console.log("[Diag][MediaRecorder] Entered generateVideoWithMediaRecorder function (PR #27 STRICT REVERT with more logs).");

        if (!loadedImage) {
            updateStatus("Error: Please upload an image first.");
            alert("Please upload an image first.");
            return;
        }

        const durationSec = parseFloat(durationInput.value);
        const fpsVal = parseInt(fpsInput.value, 10);

        if (isNaN(durationSec) || durationSec <= 0) { updateStatus("Error: Invalid duration."); alert("Error: Invalid duration."); return; }
        if (isNaN(fpsVal) || fpsVal <= 0) { updateStatus("Error: Invalid FPS."); alert("Error: Invalid FPS."); return; }

        if (!previewCanvas.captureStream) { updateStatus("Error: Browser does not support canvas.captureStream()."); alert("Error: Browser does not support canvas.captureStream()."); return; }
        if (!window.MediaRecorder) { updateStatus("Error: Browser does not support MediaRecorder API."); alert("Error: Browser does not support MediaRecorder API."); return; }

        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'];
        const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

        if (!supportedMimeType) { updateStatus("Error: No supported WebM MIME type found."); alert("Error: No supported WebM MIME type found."); return; }

        console.log(`[Diag][MediaRecorder] Using MIME type: ${supportedMimeType}`);
        updateStatus("Starting video generation with MediaRecorder... This may take some time.");
        generateBtn.disabled = true;
        downloadLink.style.display = 'none';

        const recordedChunks = [];
        let mediaRecorder;
        let renderLoopId;

        try {
            console.log(`[Diag][MediaRecorder] Attempting to capture stream with ${fpsVal} FPS.`);
            const stream = previewCanvas.captureStream(fpsVal);
            if (stream) {
                console.log(`[Diag][MediaRecorder] Canvas stream captured. Stream ID: ${stream.id}, Active: ${stream.active}`);
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    const track = videoTracks[0];
                    console.log(`[Diag][MediaRecorder] Video Track 0: ID: ${track.id}, Kind: ${track.kind}, Label: "${track.label}", ReadyState: ${track.readyState}, Muted: ${track.muted}, Enabled: ${track.enabled}`);
                } else {
                    console.warn("[Diag][MediaRecorder] Stream captured but contains no video tracks.");
                }
            } else {
                console.error("[Diag][MediaRecorder] previewCanvas.captureStream() returned null or undefined.");
                throw new Error("Failed to capture stream from canvas.");
            }

            const options = { mimeType: supportedMimeType, videoBitsPerSecond: 2500000 };
            console.log("[Diag][MediaRecorder] MediaRecorder options:", options);

            console.log("[Diag][MediaRecorder] Instantiating MediaRecorder...");
            mediaRecorder = new MediaRecorder(stream, options);
            console.log(`[Diag][MediaRecorder] MediaRecorder instantiated. Initial state: ${mediaRecorder.state}`);

            mediaRecorder.ondataavailable = (event) => {
                console.log(`[Diag][MediaRecorder] ondataavailable event. Type: ${event.type}, TimeStamp: ${event.timeStamp}, Chunk size: ${event.data.size}`);
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                    console.log(`[Diag][MediaRecorder] Pushed chunk. Total chunks: ${recordedChunks.length}. Approx total size: ${recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0)} bytes.`);
                } else {
                    console.log("[Diag][MediaRecorder] ondataavailable: chunk size 0 (ignoring).");
                }
            };
            console.log("[Diag][MediaRecorder] ondataavailable handler attached.");

            mediaRecorder.onstop = (event) => { // Added event parameter
                console.log(`[Diag][MediaRecorder] onstop event. Type: ${event.type}, TimeStamp: ${event.timeStamp}. Current MediaRecorder state: ${mediaRecorder.state}`);
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                    console.log("[Diag][MediaRecorder] Cleared renderLoopId from onstop.");
                }

                console.log(`[Diag][MediaRecorder] onstop: ${recordedChunks.length} chunks recorded. Total size: ${recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0)} bytes.`);
                if (recordedChunks.length === 0) {
                    console.error("[Diag][MediaRecorder] No data chunks recorded. Video will be empty.");
                    updateStatus("Error: No video data was recorded. Output might be empty or invalid.");
                } else {
                    const videoBlob = new Blob(recordedChunks, { type: supportedMimeType });
                    console.log(`[Diag][MediaRecorder] Video Blob created. Size: ${videoBlob.size}, Type: ${videoBlob.type}`);
                    if (videoBlob.size === 0) updateStatus("Warning: Generated video file is empty (0 bytes).");
                    const videoUrl = URL.createObjectURL(videoBlob);
                    downloadLink.href = videoUrl;
                    downloadLink.download = `video_output_mr_${Date.now()}.webm`;
                    downloadLink.style.display = 'block';
                    downloadLink.textContent = 'Download Video (WebM - MediaRecorder)';
                    updateStatus("MediaRecorder video ready for download!");
                }
            };
            console.log("[Diag][MediaRecorder] onstop handler attached.");

            mediaRecorder.onerror = (event) => {
                console.error("[Diag][MediaRecorder] onerror event. Error object:", event.error || event);
                updateStatus(`MediaRecorder error: ${ (event.error && event.error.name) || 'Unknown error' } - ${ (event.error && event.error.message) || 'Details in console'}`);
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                    console.log("[Diag][MediaRecorder] Cleared renderLoopId from onerror.");
                }
            };
            console.log("[Diag][MediaRecorder] onerror handler attached.");

            let currentFrame = 0;
            const totalFrames = Math.floor(durationSec * fpsVal);

            function getFilterForFrameFromSequence(frameIndex, sequence) {
                if (!sequence || sequence.length === 0) return 'none';
                let cumulativeFrames = 0;
                for (const effect of sequence) {
                    if (frameIndex >= cumulativeFrames && frameIndex < cumulativeFrames + effect.frames) return effect.type;
                    cumulativeFrames += effect.frames;
                }
                return 'none';
            }
            console.log(`[Diag][MediaRecorder] Effect sequence for video generation:`, JSON.parse(JSON.stringify(effectSequence)));

            function renderFrame() {
                if (currentFrame < totalFrames) {
                    const filterForThisFrame = getFilterForFrameFromSequence(currentFrame, effectSequence);
                    drawTextOnCanvas(filterForThisFrame);
                    if (currentFrame % fpsVal === 0) { // Log status once per second (approx)
                        updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterForThisFrame}). Recorder state: ${mediaRecorder.state}`);
                        console.log(`[Diag][MediaRecorder] Render loop: Frame ${currentFrame + 1}/${totalFrames}. Filter: ${filterForThisFrame}. Recorder state: ${mediaRecorder.state}`);
                        // Removed explicit mediaRecorder.requestData(); call
                        // The timeslice parameter in mediaRecorder.start() should handle dataavailable events.
                    }
                    currentFrame++;
                    renderLoopId = requestAnimationFrame(renderFrame);
                } else {
                    console.log("[Diag][MediaRecorder] All frames drawn to canvas according to calculation. Stopping renderLoop.");
                    if (renderLoopId) {
                        cancelAnimationFrame(renderLoopId);
                        renderLoopId = null;
                    }
                }
            }

            console.log(`[Diag][MediaRecorder] About to call mediaRecorder.start(100). Current state: ${mediaRecorder.state}`);
            mediaRecorder.start(100); // Using timeslice
            console.log(`[Diag][MediaRecorder] MediaRecorder.start(100) called. Current state: ${mediaRecorder.state}`);
            updateStatus("Recording in progress...");

            currentFrame = 0;
            renderLoopId = requestAnimationFrame(renderFrame);

            setTimeout(() => {
                console.log(`[Diag][MediaRecorder] setTimeout for stop fired. Current mediaRecorder state: ${mediaRecorder.state}`);
                if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
                    mediaRecorder.stop();
                    console.log("[Diag][MediaRecorder] Sent stop() command after duration.");
                } else {
                    console.warn(`[Diag][MediaRecorder] setTimeout: MediaRecorder not in 'recording' or 'paused' state (was ${mediaRecorder ? mediaRecorder.state : 'null'}), not calling stop().`);
                }
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                    console.log("[Diag][MediaRecorder] Cleared rAF from timeout, just in case.");
                }
            }, durationSec * 1000);

        } catch (error) {
            console.error("[Diag][MediaRecorder] Error during MediaRecorder video generation:", error);
            updateStatus(`Error: ${error.message || error}`);
            if (renderLoopId) {
                cancelAnimationFrame(renderLoopId);
                renderLoopId = null;
            }
        } finally {
            console.log("[Diag][MediaRecorder] Entering finally block. Re-enabling generate button.");
            generateBtn.disabled = false;
        }
    }
});
