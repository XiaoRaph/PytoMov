import {
    MAX_COLOR_VALUE,
    RGBA_CHANNELS,
    SEPIA_RED_COEFF,
    SEPIA_GREEN_COEFF,
    SEPIA_BLUE_COEFF,
    POSTERIZE_LEVELS,
    SOLARIZE_THRESHOLD,
    IMAGE_FILTER_NONE
} from './constants.js';
import { updateStatus } from './utils.js'; // Assuming updateStatus is in utils.js and handles UI updates

let worker = null; // Keep a single worker instance

export function applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterValue, forceFilterType = null) {
    if (!loadedImage) {
        return;
    }
    if (!previewCanvas || !ctx) {
        console.error("applyImageFilter: previewCanvas or ctx is missing.");
        return;
    }

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(loadedImage, 0, 0, previewCanvas.width, previewCanvas.height);

    const filterToApply = forceFilterType !== null ? forceFilterType : imageFilterValue;

    if (filterToApply === IMAGE_FILTER_NONE) {
        if (typeof window.updateProgressBar === 'function') {
            window.updateProgressBar(100); // Ensure progress bar is full or hidden
        }
        return;
    }

    const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);

    // Terminate existing worker if it's running
    if (worker) {
        worker.terminate();
        worker = null;
        console.log("Terminated existing image filter worker.");
    }

    worker = new Worker('./js/imageFilterWorker.js');

    // Pass all necessary constants to the worker
    const constants = {
        MAX_COLOR_VALUE,
        RGBA_CHANNELS,
        SEPIA_RED_COEFF,
        SEPIA_GREEN_COEFF,
        SEPIA_BLUE_COEFF,
        POSTERIZE_LEVELS,
        SOLARIZE_THRESHOLD
    };

    worker.postMessage({ imageData, filterType: filterToApply, constants });

    if (typeof window.showProgressBar === 'function') {
        window.showProgressBar();
    }
    if (typeof window.updateProgressBar === 'function') {
        window.updateProgressBar(0); // Reset progress bar
    }
    if (typeof window.setLoadingState === 'function') {
        window.setLoadingState(true, "Applying filter...");
    }


    worker.onmessage = function(e) {
        if (e.data.type === 'progress') {
            if (typeof window.updateProgressBar === 'function') {
                window.updateProgressBar(e.data.progress);
            }
        } else if (e.data.type === 'result') {
            ctx.putImageData(e.data.imageData, 0, 0);
            if (forceFilterType !== null) {
                console.log(`Applied forced filter for frame: ${filterToApply}`);
            } else {
                console.log(`Applied UI selected filter: ${filterToApply}`);
            }
            if (typeof window.updateProgressBar === 'function') {
                window.updateProgressBar(100); // Ensure it shows 100%
            }
            if (typeof window.setLoadingState === 'function') {
                window.setLoadingState(false);
            }
            // Clean up the worker after use
            if (worker) {
                worker.terminate();
                worker = null;
            }
        }
    };

    worker.onerror = function(error) {
        console.error("Error in imageFilterWorker:", error.message, error);
        // Fallback to main thread processing or show error
        // For simplicity, we'll just log the error and reset UI state
        if (typeof window.updateProgressBar === 'function') {
            window.updateProgressBar(0); // Reset progress
        }
        if (typeof window.setLoadingState === 'function') {
            window.setLoadingState(false, "Error applying filter.");
        }
        // Terminate the worker on error
        if (worker) {
            worker.terminate();
            worker = null;
        }
        // Optionally, you could try to re-apply the filter on the main thread as a fallback:
        // applyFilterDirectly(ctx, imageData, filterToApply); // You'd need to extract the old logic
    };
}

// Placeholder for a direct application function if needed for fallback (not fully implemented here)
// function applyFilterDirectly(ctx, imageData, filterToApply) {
//    console.warn("Falling back to direct filter application on main thread.");
//    const data = imageData.data;
//    // ... (original filter logic here) ...
//    ctx.putImageData(imageData, 0, 0);
// }
