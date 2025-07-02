import {
    IMAGE_FILTER_NONE,
    UI_EFFECT_REMOVE_BUTTON_MARGIN_PX,
    UI_DEFAULT_EFFECT_DURATION_FRAMES,
    DEFAULT_TEXT_MARGIN,
    UI_TEXT_HEIGHT_APPROX_MULTIPLIER,
    UI_TEXT_WIDTH_APPROX_RATIO_DENOMINATOR,
    FONT_SIZE_FALLBACK_PX,
    TEXT_BG_PADDING_PX,
    DEFAULT_FONT_SIZE_PX
} from './constants.js';
import { handleError, updateStatus } from './utils.js';
import { applyImageFilter } from './imageFilters.js';
import { generateVideoWithMediaRecorder } from './videoGenerator.js';

// State variables that were global in script.js
let loadedImage = null;
let loadedAudioArrayBuffer = null;
let effectSequence = [];

// DOM Elements (assuming they are constant and exist on DOMContentLoaded)
let imageUpload, textInput, durationInput, fpsInput, fontSizeInput, textColorInput, fontFamilyInput;
let generateBtn, statusMessages, downloadLink, previewCanvas, originalPreviewCanvas, audioUpload;
let bgColorInput, clearBgColorBtn, enableBgColorCheckbox, textPositionInput, imageFilterInput;
let newEffectTypeInput, newEffectDurationFramesInput, addEffectToSequenceBtn, effectSequenceListContainer;
let previewArea, progressBar, loadingOverlay, loadingMessage; // Added progressBar, loadingOverlay, loadingMessage
let ctx, originalCtx; // Canvas contexts

// This function will be called from main.js on DOMContentLoaded
export function initializeUI() {
    // Select DOM elements
    imageUpload = document.getElementById('imageUpload');
    textInput = document.getElementById('textInput');
    durationInput = document.getElementById('durationInput');
    fpsInput = document.getElementById('fpsInput');
    // originalFramesInput = document.getElementById('originalFramesInput'); // Was noted as potentially null
    fontSizeInput = document.getElementById('fontSizeInput');
    textColorInput = document.getElementById('textColorInput');
    fontFamilyInput = document.getElementById('fontFamilyInput');
    generateBtn = document.getElementById('generateBtn');
    statusMessages = document.getElementById('statusMessages'); // utils.updateStatus needs this
    downloadLink = document.getElementById('downloadLink');
    previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
        ctx = previewCanvas.getContext('2d');
    } else {
        console.error("Element with ID 'previewCanvas' not found. Preview will not work.");
    }
    bgColorInput = document.getElementById('bgColorInput');
    clearBgColorBtn = document.getElementById('clearBgColorBtn');
    enableBgColorCheckbox = document.getElementById('enableBgColor');
    textPositionInput = document.getElementById('textPositionInput');
    imageFilterInput = document.getElementById('imageFilterInput');

    newEffectTypeInput = document.getElementById('newEffectType');
    newEffectDurationFramesInput = document.getElementById('newEffectDurationFrames');
    addEffectToSequenceBtn = document.getElementById('addEffectToSequenceBtn');
    effectSequenceListContainer = document.getElementById('effectSequenceListContainer');

    previewArea = document.getElementById('previewArea');
    originalPreviewCanvas = document.getElementById('originalPreviewCanvas');
    if (originalPreviewCanvas) {
        originalCtx = originalPreviewCanvas.getContext('2d');
    } else {
        console.error("Element with ID 'originalPreviewCanvas' not found. Original image preview will not work.");
    }
    audioUpload = document.getElementById('audioUpload');

    // Make updateStatus globally available for utils.handleError
    // This is a bit of a hack; ideally, utils would take statusMessages as a param or UI would expose a method
    window.updateStatus = (message) => updateStatus(message, statusMessages);

    // Expose progress bar and loading state functions to global scope for imageFilters.js
    window.showProgressBar = showProgressBar;
    window.updateProgressBar = updateProgressBar;
    window.setLoadingState = setLoadingState;

    // Select progress bar and loading overlay elements
    progressBar = document.getElementById('progressBar');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingMessage = document.getElementById('loadingMessage');

    // Initialize event listeners
    if (audioUpload) {
        audioUpload.addEventListener('change', handleAudioUpload);
    }

    renderEffectSequenceList(); // Initial render

    if (addEffectToSequenceBtn) {
        addEffectToSequenceBtn.addEventListener('click', handleAddEffectToSequence);
    } else {
        console.warn("Element with ID 'addEffectToSequenceBtn' not found. Adding effects to sequence will not work.");
        if (newEffectTypeInput) newEffectTypeInput.disabled = true;
        if (newEffectDurationFramesInput) newEffectDurationFramesInput.disabled = true;
    }

    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    } else {
        console.error("Element with ID 'imageUpload' not found. Image uploading will not work.");
    }

    const inputsForPreviewUpdate = [
        textInput, fontSizeInput, textColorInput, fontFamilyInput,
        bgColorInput, enableBgColorCheckbox, textPositionInput, imageFilterInput
    ];

    inputsForPreviewUpdate.forEach(input => {
        if (input) {
            const eventType = (input.type === 'color' || input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                // When an input changes, we need to redraw the image with the current filter, then the text.
                if (loadedImage && previewCanvas && ctx) {
                    applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterInput ? imageFilterInput.value : IMAGE_FILTER_NONE);
                    drawTextOnCanvasInternal(); // Internal call that doesn't re-apply filter
                    updateStatus("Preview updated due to input change.", statusMessages);
                }
            });
        }
    });

    if (clearBgColorBtn) {
        clearBgColorBtn.addEventListener('click', handleClearBgColor);
    } else {
        console.warn("Element with ID 'clearBgColorBtn' not found. Clearing background color will not work.");
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateVideo);
    } else {
        console.error("Element with ID 'generateBtn' not found. Video generation will not work.");
    }
    console.log("UI Initialized and event listeners attached.");
}

function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            loadedAudioArrayBuffer = e.target.result;
            updateStatus(`Audio file "${file.name}" loaded.`, statusMessages);
            console.log(`Audio file "${file.name}" loaded, size: ${loadedAudioArrayBuffer.byteLength} bytes.`);
        };
        reader.onerror = (e) => {
            loadedAudioArrayBuffer = null;
            handleError(`Loading audio file: ${file.name}. Details: ${e.target.error.message || e.target.error}`, false);
        };
        reader.readAsArrayBuffer(file);
    } else {
        loadedAudioArrayBuffer = null;
        updateStatus("Audio selection cleared.", statusMessages);
        console.log("Audio selection cleared.");
    }
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
        removeBtn.style.marginLeft = `${UI_EFFECT_REMOVE_BUTTON_MARGIN_PX}px`;
        removeBtn.dataset.index = index;
        removeBtn.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            effectSequence.splice(indexToRemove, 1);
            renderEffectSequenceList();
            updateStatus(`Effect at position ${indexToRemove + 1} removed from sequence.`, statusMessages);
        });
        li.appendChild(removeBtn);
        ol.appendChild(li);
    });
    effectSequenceListContainer.appendChild(ol);
}

function handleAddEffectToSequence() {
    if (!newEffectTypeInput || !newEffectDurationFramesInput) {
        handleError("UI elements for adding effects are missing.", false);
        return;
    }
    const effectType = newEffectTypeInput.value;
    const durationFrames = parseInt(newEffectDurationFramesInput.value, 10);
    if (isNaN(durationFrames) || durationFrames <= 0) {
        handleError("Please enter a valid positive number for frame duration.", true);
        return;
    }
    effectSequence.push({ type: effectType, frames: durationFrames });
    renderEffectSequenceList();
    if (newEffectDurationFramesInput) newEffectDurationFramesInput.value = UI_DEFAULT_EFFECT_DURATION_FRAMES.toString(); // Reset
    updateStatus(`Effect "${effectType}" for ${durationFrames} frames added to sequence.`, statusMessages);
}

function handleImageUpload(event) {
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
                    updateStatus(`Image "${file.name}" loaded.`, statusMessages);
                    // Initial draw with current filter and text
                    applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterInput ? imageFilterInput.value : IMAGE_FILTER_NONE);
                    drawTextOnCanvasInternal(); // Draws text without re-applying filter
                } else {
                    handleError("Canvas elements missing, cannot display image.", false);
                    loadedImage = null;
                }
            };
            loadedImage.onerror = () => {
                handleError(`Loading image: ${file.name}`, false);
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
        updateStatus("Image selection cleared.", statusMessages);
    }
}

// Renamed to avoid conflict if we decide to export the one that also applies filter
function drawTextOnCanvasInternal() {
    // This function assumes the image (filtered or not) is already on the canvas.
    // It only draws the text overlay.
    if (!loadedImage || !previewCanvas || !ctx) {
        // This should ideally not happen if called correctly after image load and filter apply
        console.warn("drawTextOnCanvasInternal: Missing loadedImage, previewCanvas, or ctx.");
        return;
    }

    const text = textInput ? textInput.value : "Text input missing";
    const fontSize = fontSizeInput ? fontSizeInput.value : `${DEFAULT_FONT_SIZE_PX}px`;
    const fontFamily = fontFamilyInput ? (fontFamilyInput.value || 'sans-serif') : 'sans-serif';
    const textColor = textColorInput ? textColorInput.value : "#FFFFFF"; // TODO: Consider making this a constant if it's truly fixed
    const useBgColor = enableBgColorCheckbox ? enableBgColorCheckbox.checked : false;
    const textBgColor = bgColorInput ? bgColorInput.value : "#000000"; // TODO: Consider making this a constant
    const position = textPositionInput ? textPositionInput.value : "center";

    ctx.font = `${fontSize} ${fontFamily}`;
    ctx.fillStyle = textColor;

    let x, y;
    const canvasWidth = previewCanvas.width, canvasHeight = previewCanvas.height;

    switch (position) {
        case 'top_left': x = DEFAULT_TEXT_MARGIN; y = DEFAULT_TEXT_MARGIN; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; break;
        case 'top_center': x = canvasWidth / 2; y = DEFAULT_TEXT_MARGIN; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; break;
        case 'top_right': x = canvasWidth - DEFAULT_TEXT_MARGIN; y = DEFAULT_TEXT_MARGIN; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; break;
        case 'center_left': x = DEFAULT_TEXT_MARGIN; y = canvasHeight / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; break;
        case 'center': x = canvasWidth / 2; y = canvasHeight / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; break;
        case 'center_right': x = canvasWidth - DEFAULT_TEXT_MARGIN; y = canvasHeight / 2; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; break;
        case 'bottom_left': x = DEFAULT_TEXT_MARGIN; y = canvasHeight - DEFAULT_TEXT_MARGIN; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; break;
        case 'bottom_center': x = canvasWidth / 2; y = canvasHeight - DEFAULT_TEXT_MARGIN; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; break;
        case 'bottom_right': x = canvasWidth - DEFAULT_TEXT_MARGIN; y = canvasHeight - DEFAULT_TEXT_MARGIN; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; break;
        default: x = canvasWidth / 2; y = canvasHeight / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    }

    if (useBgColor && textBgColor) {
        const textMetrics = ctx.measureText(text);
        let actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
        let actualWidth = textMetrics.width;
        if (isNaN(actualHeight) || isNaN(actualWidth) || !isFinite(actualHeight) || !isFinite(actualWidth)) {
            const sizeMatch = fontSize.match(/(\d+)/);
            actualHeight = sizeMatch ? parseInt(sizeMatch[1], 10) * UI_TEXT_HEIGHT_APPROX_MULTIPLIER : FONT_SIZE_FALLBACK_PX * UI_TEXT_HEIGHT_APPROX_MULTIPLIER;
            actualWidth = textMetrics.width || (text.length * (actualHeight / UI_TEXT_WIDTH_APPROX_RATIO_DENOMINATOR));
        }
        const padding = TEXT_BG_PADDING_PX;
        let bgX = x;
        let bgY = y;

        if (ctx.textAlign === 'center') bgX -= actualWidth / 2;
        else if (ctx.textAlign === 'right') bgX -= actualWidth;

        if (ctx.textBaseline === 'middle') bgY -= actualHeight / 2;
        else if (ctx.textBaseline === 'bottom') bgY -= actualHeight;

        ctx.fillStyle = textBgColor;
        ctx.fillRect(bgX - padding, bgY - padding, actualWidth + (padding * 2), actualHeight + (padding * 2));
        ctx.fillStyle = textColor;
    }
    ctx.fillText(text, x, y);
}

// This is the function that will be called by videoGenerator
// It needs to apply the correct filter for the frame THEN draw text.
export function drawFrameForVideo(filterType) {
    if (!loadedImage || !previewCanvas || !ctx) {
        handleError("Cannot draw frame for video: Missing loadedImage, previewCanvas, or ctx.", false);
        return;
    }
    applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterInput.value, filterType); // Pass global filter value and override
    drawTextOnCanvasInternal(); // Then draw text
}


function handleClearBgColor() {
    if (bgColorInput) bgColorInput.value = "#000000";
    if (enableBgColorCheckbox) enableBgColorCheckbox.checked = false;
    updateStatus("Text background color disabled.", statusMessages);
    // Redraw: apply current image filter, then text
    if (loadedImage && previewCanvas && ctx) {
        applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterInput ? imageFilterInput.value : IMAGE_FILTER_NONE);
        drawTextOnCanvasInternal();
    }
}

function handleGenerateVideo() {
    console.log("[Diag] Generate button clicked via UI module.");
    if (!loadedImage) {
        handleError("Please upload an image first.", true);
        return;
    }
    if (!durationInput || !fpsInput) {
        handleError("Duration or FPS input elements are missing. Cannot generate video.", true);
        return;
    }
    const duration = parseFloat(durationInput.value);
    const fps = parseInt(fpsInput.value, 10);
    if (isNaN(duration) || duration <= 0) {
        handleError("Please enter a valid positive duration.", true);
        return;
    }
    if (isNaN(fps) || fps <= 0) {
        handleError("Please enter a valid positive FPS.", true);
        return;
    }

    console.log("[Diag] Calling generateVideoWithMediaRecorder() from UI module...");
    // Call the imported function from videoGenerator.js
    generateVideoWithMediaRecorder(
        loadedImage,
        durationInput,
        fpsInput,
        previewCanvas, // Needed for stream capture and context
        downloadLink,
        generateBtn,
        statusMessages, // Pass the DOM element for updateStatus
        loadedAudioArrayBuffer,
        effectSequence,
        imageFilterInput, // Pass the input element itself
        drawFrameForVideo // Pass the drawing function for each frame
    );
    console.log("[Diag] Returned from generateVideoWithMediaRecorder() call site in UI module.");
}

// Progress bar and loading state functions
function showProgressBar() {
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.parentElement.style.display = 'block'; // Assuming progress bar is inside a container
    }
}

function updateProgressBar(percentage) {
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        if (percentage >= 100) {
            // Optionally hide progress bar container after a short delay
            setTimeout(() => {
                if (progressBar) progressBar.parentElement.style.display = 'none';
            }, 500);
        }
    }
}

function setLoadingState(isLoading, message = "Loading...") {
    if (loadingOverlay && loadingMessage) {
        if (isLoading) {
            loadingMessage.textContent = message;
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    // Disable/enable inputs to prevent interaction during loading
    const inputsToDisable = [
        imageUpload, textInput, durationInput, fpsInput, fontSizeInput,
        textColorInput, fontFamilyInput, generateBtn, audioUpload, bgColorInput,
        clearBgColorBtn, enableBgColorCheckbox, textPositionInput, imageFilterInput,
        newEffectTypeInput, newEffectDurationFramesInput, addEffectToSequenceBtn
    ];
    inputsToDisable.forEach(input => {
        if (input) {
            input.disabled = isLoading;
        }
    });
}
