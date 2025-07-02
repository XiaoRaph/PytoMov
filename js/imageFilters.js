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

export function applyImageFilter(ctx, previewCanvas, loadedImage, imageFilterValue, forceFilterType = null) {
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

    const filterToApply = forceFilterType !== null ? forceFilterType : imageFilterValue;

    if (filterToApply === IMAGE_FILTER_NONE) {
        // if (forceFilterType !== null) console.log("Forcing no filter for this frame.");
        // No actual filter to apply, image is already drawn.
        return;
    }
    const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
    const data = imageData.data;
    // Apply selected filter to the image data
    if (filterToApply === 'invert') {
        // Invert: Inverts the colors of the image.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i] = MAX_COLOR_VALUE - data[i]; // Red
            data[i + 1] = MAX_COLOR_VALUE - data[i + 1]; // Green
            data[i + 2] = MAX_COLOR_VALUE - data[i + 2]; // Blue
        }
    } else if (filterToApply === 'sepia') {
        // Sepia: Applies a sepia tone to the image.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i], g = data[i+1], b = data[i+2];
            data[i] = Math.min(MAX_COLOR_VALUE, (SEPIA_RED_COEFF.r*r) + (SEPIA_RED_COEFF.g*g) + (SEPIA_RED_COEFF.b*b)); // Red
            data[i+1] = Math.min(MAX_COLOR_VALUE, (SEPIA_GREEN_COEFF.r*r) + (SEPIA_GREEN_COEFF.g*g) + (SEPIA_GREEN_COEFF.b*b)); // Green
            data[i+2] = Math.min(MAX_COLOR_VALUE, (SEPIA_BLUE_COEFF.r*r) + (SEPIA_BLUE_COEFF.g*g) + (SEPIA_BLUE_COEFF.b*b)); // Blue
        }
    } else if (filterToApply === 'remove_red_channel') {
        // Remove Red Channel: Sets the red component of each pixel to 0.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i] = 0; // Red channel to 0
        }
    } else if (filterToApply === 'remove_green_channel') {
        // Remove Green Channel: Sets the green component of each pixel to 0.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i + 1] = 0; // Green channel to 0
        }
    } else if (filterToApply === 'remove_blue_channel') {
        // Remove Blue Channel: Sets the blue component of each pixel to 0.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i + 2] = 0; // Blue channel to 0
        }
    } else if (filterToApply === 'permute_rgb_grb') {
        // Permute RGB > GRB: Swaps red and green channels. (R,G,B) -> (G,R,B)
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i];
            const g = data[i + 1];
            // const b = data[i + 2]; // Blue remains in place
            data[i] = g;     // Red channel gets original green value
            data[i + 1] = r; // Green channel gets original red value
        }
    } else if (filterToApply === 'permute_rgb_brg') {
        // Permute RGB > BRG: Swaps red and blue channels. (R,G,B) -> (B,G,R)
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i];
            // const g = data[i + 1]; // Green remains in place
            const b = data[i + 2];
            data[i] = b;     // Red channel gets original blue value
            data[i + 2] = r; // Blue channel gets original red value
        }
    } else if (filterToApply === 'posterize') {
        // Posterize: Reduces the number of distinct colors in the image.
        const step = MAX_COLOR_VALUE / (POSTERIZE_LEVELS - 1); // Calculate the size of each color step.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            // For each channel, quantize the color value to the nearest lower step.
            data[i] = Math.round(Math.round(data[i] / step) * step);     // Red
            data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step); // Green
            data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step); // Blue
        }
    } else if (filterToApply === 'solarize') {
        // Solarize: Inverts pixel values above a certain threshold.
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            if (data[i] > SOLARIZE_THRESHOLD) data[i] = MAX_COLOR_VALUE - data[i];             // Red
            if (data[i + 1] > SOLARIZE_THRESHOLD) data[i + 1] = MAX_COLOR_VALUE - data[i + 1]; // Green
            if (data[i + 2] > SOLARIZE_THRESHOLD) data[i + 2] = MAX_COLOR_VALUE - data[i + 2]; // Blue
        }
    }
    ctx.putImageData(imageData, 0, 0);
    if (forceFilterType !== null) console.log(`Applied forced filter for frame: ${filterToApply}`);
    else console.log(`Applied UI selected filter: ${filterToApply}`);
}
