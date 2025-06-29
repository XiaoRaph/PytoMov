# PytoMov - Image to Video Creator

PytoMov is a simple web-based tool that allows you to create a video file from an image with custom text overlaid on it. The entire process runs in your browser – no software installation needed!

**Try it live:** [https://xiaoraph.github.io/PytoMov/](https://xiaoraph.github.io/PytoMov/)

## Features

*   **Upload Your Image:** Start with any image from your computer.
*   **Dual Preview:** See your original image alongside a live preview of the final output with filters and text.
*   **Apply Image Filters:** Currently includes "Invert Colors (Negative)". More to come!
*   **Overlay Custom Text:** Add your desired message to the image.
*   **Customize Text Appearance:**
    *   Adjust font size, color, and family.
    *   Choose text position (e.g., top-left, center, bottom-right).
    *   Optionally add a background color to your text for better visibility.
*   **Video Settings:**
    *   Set video duration and Frames Per Second (FPS).
    *   Specify a number of initial frames to remain unfiltered before an image filter applies.
*   **Client-Side Processing:** Video generation happens directly in your web browser.
*   **Download Video:** Get your output as a `.webm` video file.

## How it Works

The application uses:

*   **HTML, CSS, and JavaScript:** For the user interface and core logic.
*   **HTML5 Canvas API:** To draw the image and render the text overlay.
*   **Whammy.js:** A lightweight JavaScript library to encode the sequence of canvas frames into a WebM video.

## Usage

1.  Go to the [PytoMov GitHub Pages site](https://xiaoraph.github.io/PytoMov/).
2.  Upload an image using the "Upload Image" button.
3.  Enter your desired text in the "Overlay Text" field.
4.  Adjust settings like duration, FPS, font size, colors, etc., as needed.
5.  Click the "Generate Video" button.
6.  Once processing is complete, a "Download Video (WebM)" link will appear. Click it to save your video.

## Development

The main files for this application are:

*   `index.html`: The main HTML structure.
*   `style.css`: Styles for the application.
*   `script.js`: Contains all the JavaScript logic for image handling, canvas drawing, and video encoding using Whammy.js.
*   `lib/whammy.js`: The Whammy.js library for video encoding.

This project previously had a Python-based version for video creation, but has since transitioned to a purely client-side JavaScript implementation for ease of use via GitHub Pages.