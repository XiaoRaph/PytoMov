// This file will store all the constants used in the application.
// Using JavaScript for consistency with the rest of the js/ folder.

// General constants
export const RGBA_CHANNELS = 4; // Number of channels per pixel (Red, Green, Blue, Alpha)
export const MAX_COLOR_VALUE = 255; // Maximum value for an RGB color channel
export const DEFAULT_TEXT_MARGIN = 20; // Default margin for text positioning in pixels
export const DEFAULT_FONT_SIZE_PX = 30; // Default font size in pixels, used if not specified
export const FONT_SIZE_FALLBACK_PX = 50; // Fallback font size in pixels if parsing fails
export const TEXT_BG_PADDING_PX = 10; // Padding for text background in pixels

// Image Filter specific constants
export const IMAGE_FILTER_NONE = 'none';

// Sepia filter coefficients
export const SEPIA_RED_COEFF = { r: 0.393, g: 0.769, b: 0.189 };
export const SEPIA_GREEN_COEFF = { r: 0.349, g: 0.686, b: 0.168 };
export const SEPIA_BLUE_COEFF = { r: 0.272, g: 0.534, b: 0.131 };

// Posterize filter
export const POSTERIZE_LEVELS = 4; // Number of color levels per channel

// Solarize filter
export const SOLARIZE_THRESHOLD = 128; // Threshold for inversion (0-255)

// UI specific constants
export const UI_EFFECT_REMOVE_BUTTON_MARGIN_PX = 10;
export const UI_DEFAULT_EFFECT_DURATION_FRAMES = 24;
// Approximations for text dimension calculations when metrics are unavailable
export const UI_TEXT_HEIGHT_APPROX_MULTIPLIER = 1.2;
export const UI_TEXT_WIDTH_APPROX_RATIO_DENOMINATOR = 1.5; // height / 1.5 for width estimation

// Video Generation specific constants
export const VIDEO_BITS_PER_SECOND = 2500000; // Target bitrate for video recording
export const AUDIO_PLAYBACK_START_TIME_MS = 0; // Start time for audio playback in milliseconds
export const MEDIA_RECORDER_TIMESLICE_MS = 100; // Timeslice for MediaRecorder ondataavailable events in ms
export const MEDIA_RECORDER_TIMEOUT_SECONDS_TO_MS_MULTIPLIER = 1000; // To convert seconds to milliseconds
export const MEDIA_RECORDER_TIMEOUT_BUFFER_MS = 500; // Additional buffer for MediaRecorder stop timeout in ms

// Default color values (though these might be better left as defaults in HTML/CSS or UI state)
// export const DEFAULT_TEXT_COLOR = "#FFFFFF";
// export const DEFAULT_TEXT_BACKGROUND_COLOR = "#000000";

// MIME types for MediaRecorder - consider if these need to be constants or are fine as an inline array.
// For now, keeping them in videoGenerator.js as they are very specific to that module's logic.
// const MEDIA_RECORDER_MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', ...];

console.log("constants.js loaded");
