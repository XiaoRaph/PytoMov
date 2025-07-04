import { handleError, updateStatus } from './utils.js'; // Assuming utils.js is in the same directory
import {
    IMAGE_FILTER_NONE,
    VIDEO_BITS_PER_SECOND,
    AUDIO_PLAYBACK_START_TIME_MS,
    MEDIA_RECORDER_TIMESLICE_MS,
    MEDIA_RECORDER_TIMEOUT_SECONDS_TO_MS_MULTIPLIER,
    MEDIA_RECORDER_TIMEOUT_BUFFER_MS
} from './constants.js';

export async function generateVideoWithMediaRecorder(
    loadedImage,
    durationInput,
    fpsInput,
    previewCanvas,
    downloadLink,
    generateBtn, // To disable/enable it
    statusMessages, // To pass to updateStatus
    loadedAudioArrayBuffer, // For audio
    effectSequence, // For effects per frame
    imageFilterInput, // For default filter if no sequence
    drawTextOnCanvas // Function to draw each frame
    // Note: ctx is derived from previewCanvas inside this function if needed for drawing,
    // or drawTextOnCanvas should handle its own context.
    // We also need a way to get the current filter for a frame if using an effect sequence.
) {
    console.log("[Diag][MediaRecorder] Entered generateVideoWithMediaRecorder function.");
    const ctx = previewCanvas ? previewCanvas.getContext('2d') : null;


    if (!loadedImage) {
        handleError("Please upload an image first.", true);
        return;
    }
    if (!durationInput || !fpsInput || !previewCanvas || !downloadLink || !generateBtn) {
        handleError("Critical elements for MediaRecorder video generation are missing from the page.", false);
        if (generateBtn) generateBtn.disabled = false;
        return;
    }
    if (!ctx) {
         handleError("Canvas context (ctx) is not available for MediaRecorder. Cannot draw frames.", false);
         if (generateBtn) generateBtn.disabled = false;
         return;
    }

    const durationSec = parseFloat(durationInput.value);
    const fpsVal = parseInt(fpsInput.value, 10);

    if (isNaN(durationSec) || durationSec <= 0) { handleError("Invalid duration.", true); return; }
    if (isNaN(fpsVal) || fpsVal <= 0) { handleError("Invalid FPS.", true); return; }

    let missingFeatures = [];
    if (!HTMLCanvasElement.prototype.captureStream) {
        missingFeatures.push("HTMLCanvasElement.captureStream");
    }
    if (!window.MediaRecorder) {
        missingFeatures.push("MediaRecorder API");
    }

    if (missingFeatures.length > 0) {
        const featureList = missingFeatures.join(" and ");
        const errorMessage = `Your browser does not support: ${featureList}. Video generation is not available. Please try a modern browser like Chrome or Firefox.`;
        handleError(errorMessage, true); // true to make it a prominent error

        if (generateBtn) generateBtn.disabled = true;

        // Attempt to hide relevant UI sections.
        // These IDs are assumed based on index.html and typical UI structure.
        // If these elements are not found, no error will occur, but they won't be hidden.
        const videoControlsContainer = document.getElementById('effectSequenceBuilder'); // This seems like a good container for video-specific controls
        if (videoControlsContainer) {
            videoControlsContainer.style.display = 'none';
        }
        // Also hide the generate button itself, though it's disabled.
        if (generateBtn) {
            generateBtn.style.display = 'none';
        }
        // Hide download link area if it exists
        if (downloadLink) {
            downloadLink.style.display = 'none';
        }
        // Optionally, disable other related inputs if they are not within a container that's hidden
        if (durationInput) durationInput.disabled = true;
        if (fpsInput) fpsInput.disabled = true;
        // Add any other elements that should be hidden or disabled

        return;
    }

    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    const supportedMimeType = mimeTypes.find(type => {
        try { return MediaRecorder.isTypeSupported(type); } catch (e) { return false; }
    });

    if (!supportedMimeType) {
        handleError("No supported MIME type found for MediaRecorder (tried WebM and MP4). Your browser may not support common video recording formats.", true);
        if (generateBtn) generateBtn.disabled = false;
        return;
    }

    console.log(`[Diag][MediaRecorder] Using MIME type: ${supportedMimeType}`);
    updateStatus("Starting video generation with MediaRecorder... This may take some time.", statusMessages);
    if (generateBtn) generateBtn.disabled = true;
    if (downloadLink) downloadLink.style.display = 'none';

    const recordedChunks = [];
    let mediaRecorder;
    let renderLoopId;

    try {
        let audioTrack = null;
        if (loadedAudioArrayBuffer) {
            console.log("[Diag][MediaRecorder] Audio data found, attempting to decode.");
            if (!window.AudioContext && !window.webkitAudioContext) {
                updateStatus("Warning: Web Audio API not supported by this browser. Proceeding without audio.", statusMessages);
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
                    audioSourceNode.start(AUDIO_PLAYBACK_START_TIME_MS);

                    if (mediaStreamAudioDestinationNode.stream.getAudioTracks().length > 0) {
                        audioTrack = mediaStreamAudioDestinationNode.stream.getAudioTracks()[0];
                        console.log("[Diag][MediaRecorder] Audio track created successfully:", audioTrack);
                    } else {
                        console.warn("[Diag][MediaRecorder] Could not get audio track from mediaStreamAudioDestinationNode.");
                        updateStatus("Warning: Could not process audio track. Video will be silent.", statusMessages);
                    }
                } catch (audioDecodeError) {
                    handleError(`Decoding audio: ${audioDecodeError.message}. Video will be generated without audio.`, false);
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

        const options = { mimeType: supportedMimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND };
        console.log("[Diag][MediaRecorder] MediaRecorder options:", options);

        try {
            mediaRecorder = new MediaRecorder(finalStream, options);
        } catch (recorderError) {
            console.error("[Diag][MediaRecorder] Error instantiating MediaRecorder:", recorderError);
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
                handleError("No video data recorded. Output might be empty.", false);
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
                    handleError("Download link element not found after recording, though it was expected.", false);
                }
                updateStatus("MediaRecorder video ready for download!", statusMessages);
            }
        };

        mediaRecorder.onerror = (event) => {
            const errorDetails = event.error ? `${event.error.name}: ${event.error.message}` : 'Unknown MediaRecorder error';
            handleError(`MediaRecorder error: ${errorDetails}. Check console.`, false);
            if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
        };

        let currentFrame = 0;
        const totalFrames = Math.floor(durationSec * fpsVal);
        const useSequence = effectSequence && effectSequence.length > 0;

        function getFilterForFrameFromSequence(frameIndex, sequence) {
            if (!useSequence) {
                return imageFilterInput ? imageFilterInput.value : IMAGE_FILTER_NONE;
            }
            let cumulativeFrames = 0;
            for (const effect of sequence) {
                if (frameIndex >= cumulativeFrames && frameIndex < cumulativeFrames + effect.frames) {
                    return effect.type;
                }
                cumulativeFrames += effect.frames;
            }
            return sequence.length > 0 ? sequence[sequence.length -1].type : IMAGE_FILTER_NONE;
        }

        if (useSequence) {
             console.log(`[Diag][MediaRecorder] Using effect sequence for video generation:`, JSON.parse(JSON.stringify(effectSequence)));
        } else if (imageFilterInput) {
             console.log(`[Diag][MediaRecorder] Using UI selected filter for video generation: ${imageFilterInput.value}`);
        }

        function renderFrame() {
            if (currentFrame < totalFrames) {
                const filterType = getFilterForFrameFromSequence(currentFrame, effectSequence);
                // The drawTextOnCanvas function needs access to its required elements (textInput, fontSizeInput etc.)
                // and also needs to call applyImageFilter internally.
                // This implies drawTextOnCanvas needs to be either part of a class that has access to these,
                // or these need to be passed to it.
                // For now, we assume drawTextOnCanvas is correctly defined in ui.js or main.js and handles this.
                drawTextOnCanvas(filterType); // This call is the critical part that needs careful refactoring.

                if (currentFrame % Math.max(1, fpsVal) === 0) {
                     if (mediaRecorder && mediaRecorder.state) {
                        updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterType}). Recorder: ${mediaRecorder.state}`, statusMessages);
                     } else {
                        updateStatus(`Rendering frame ${currentFrame + 1}/${totalFrames} (Filter: ${filterType}). Recorder: N/A`, statusMessages);
                     }
                }
                currentFrame++;
                renderLoopId = requestAnimationFrame(renderFrame);
            } else {
                if (mediaRecorder && mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                    console.log("[Diag][MediaRecorder] All frames rendered, stopping MediaRecorder.");
                }
                if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
            }
        }

        mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);
        console.log(`[Diag][MediaRecorder] MediaRecorder started. State: ${mediaRecorder.state}`);
        updateStatus("Recording in progress...", statusMessages);

        renderLoopId = requestAnimationFrame(renderFrame);

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
        }, (durationSec * MEDIA_RECORDER_TIMEOUT_SECONDS_TO_MS_MULTIPLIER) + MEDIA_RECORDER_TIMEOUT_BUFFER_MS);

    } catch (error) {
        console.error("[Diag][MediaRecorder] Error during MediaRecorder setup or operation (outer catch):", error);
        handleError(`MediaRecorder setup or operation: ${error.message || String(error)}`, true);
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
        if (mediaRecorder && mediaRecorder.state === "recording") {
             try { mediaRecorder.stop(); } catch (e) {
                console.error("[Diag][MediaRecorder] Error stopping media recorder during catch:", e);
                handleError(`Stopping media recorder during catch: ${e.message}`, false); }
        }
    } finally {
        console.log("[Diag][MediaRecorder] Entering finally block.");
         if (generateBtn) generateBtn.disabled = false;
    }
}
