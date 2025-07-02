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
