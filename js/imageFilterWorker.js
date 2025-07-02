// Constants will be passed from the main thread or defined here if they don't change
let MAX_COLOR_VALUE;
let RGBA_CHANNELS;
let SEPIA_RED_COEFF;
let SEPIA_GREEN_COEFF;
let SEPIA_BLUE_COEFF;
let POSTERIZE_LEVELS;
let SOLARIZE_THRESHOLD;

self.onmessage = function(e) {
    const { imageData, filterType, constants } = e.data;
    // Assign constants received from the main thread
    MAX_COLOR_VALUE = constants.MAX_COLOR_VALUE;
    RGBA_CHANNELS = constants.RGBA_CHANNELS;
    SEPIA_RED_COEFF = constants.SEPIA_RED_COEFF;
    SEPIA_GREEN_COEFF = constants.SEPIA_GREEN_COEFF;
    SEPIA_BLUE_COEFF = constants.SEPIA_BLUE_COEFF;
    POSTERIZE_LEVELS = constants.POSTERIZE_LEVELS;
    SOLARIZE_THRESHOLD = constants.SOLARIZE_THRESHOLD;

    const data = imageData.data;
    const totalPixels = data.length / RGBA_CHANNELS;
    let processedPixels = 0;

    // Apply selected filter to the image data
    if (filterType === 'invert') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i] = MAX_COLOR_VALUE - data[i]; // Red
            data[i + 1] = MAX_COLOR_VALUE - data[i + 1]; // Green
            data[i + 2] = MAX_COLOR_VALUE - data[i + 2]; // Blue
            processedPixels++;
            if (processedPixels % 10000 === 0) { // Send progress update every 10000 pixels
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'sepia') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i], g = data[i+1], b = data[i+2];
            data[i] = Math.min(MAX_COLOR_VALUE, (SEPIA_RED_COEFF.r*r) + (SEPIA_RED_COEFF.g*g) + (SEPIA_RED_COEFF.b*b));
            data[i+1] = Math.min(MAX_COLOR_VALUE, (SEPIA_GREEN_COEFF.r*r) + (SEPIA_GREEN_COEFF.g*g) + (SEPIA_GREEN_COEFF.b*b));
            data[i+2] = Math.min(MAX_COLOR_VALUE, (SEPIA_BLUE_COEFF.r*r) + (SEPIA_BLUE_COEFF.g*g) + (SEPIA_BLUE_COEFF.b*b));
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'remove_red_channel') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i] = 0; // Red channel to 0
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'remove_green_channel') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i + 1] = 0; // Green channel to 0
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'remove_blue_channel') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i + 2] = 0; // Blue channel to 0
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'permute_rgb_grb') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i];
            const g = data[i + 1];
            data[i] = g;
            data[i + 1] = r;
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'permute_rgb_brg') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            const r = data[i];
            const b = data[i + 2];
            data[i] = b;
            data[i + 2] = r;
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'posterize') {
        const step = MAX_COLOR_VALUE / (POSTERIZE_LEVELS - 1);
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            data[i] = Math.round(Math.round(data[i] / step) * step);
            data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
            data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    } else if (filterType === 'solarize') {
        for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
            if (data[i] > SOLARIZE_THRESHOLD) data[i] = MAX_COLOR_VALUE - data[i];
            if (data[i + 1] > SOLARIZE_THRESHOLD) data[i + 1] = MAX_COLOR_VALUE - data[i + 1];
            if (data[i + 2] > SOLARIZE_THRESHOLD) data[i + 2] = MAX_COLOR_VALUE - data[i + 2];
            processedPixels++;
            if (processedPixels % 10000 === 0) {
                self.postMessage({ type: 'progress', progress: (processedPixels / totalPixels) * 100 });
            }
        }
    }

    self.postMessage({ type: 'progress', progress: 100 }); // Ensure 100% progress is sent at the end
    self.postMessage({ type: 'result', imageData: imageData });
};
