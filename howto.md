# Image and Text to Video Creator

This Python script, `video_creator.py`, allows you to create MP4 video files from a source image with custom text overlaid on it. It uses the Pillow library for image manipulation and text rendering, and Imageio for video encoding.

## Features

-   Overlay custom text onto an image.
-   Save the result as an MP4 video file.
-   Customize video duration and FPS.
-   Flexible text positioning:
    -   Use predefined string keywords (e.g., "center", "top_left", "bottom_right").
    -   Specify exact (x, y) coordinates.
-   Customize font:
    -   Provide a path to a `.ttf` or `.otf` font file.
    -   Defaults to Arial if available, otherwise uses PIL's basic bitmap font.
-   Customize text appearance:
    -   Font size.
    -   Text color (RGB or RGBA for transparency).
    -   Optional background color for the text box (RGB or RGBA).
    -   Padding around the text if a background color is used.
    -   Text alignment ("left", "center", "right") for multiline text blocks.
-   Error handling for missing files and other common issues.

## Prerequisites

You need Python 3 installed. The script relies on the following Python libraries:

-   Pillow
-   Imageio
-   Imageio-ffmpeg (for MP4 support with Imageio)
-   Numpy

You can install them using pip:

```bash
pip install Pillow imageio imageio-ffmpeg numpy
```

## Usage

The core functionality is provided by the `create_video_with_image_and_text_pillow_imageio` function in `video_creator.py`.

### Function Signature

```python
def create_video_with_image_and_text_pillow_imageio(
    image_path,
    text,
    output_path="output.mp4",
    duration=5,
    fps=24,
    text_pos="center",
    font_path=None,
    font_size=50,
    text_color=(255,255,255), # White
    bg_color=None, # No background
    text_padding=10,
    text_alignment="left"
    ):
```

### Parameters

-   `image_path` (str): Path to the input image file (e.g., "my_image.png").
-   `text` (str): The text string to overlay on the image. Use `\n` for newlines.
-   `output_path` (str, optional): Path to save the generated MP4 video. Defaults to "output.mp4".
-   `duration` (int, optional): Desired duration of the video in seconds. Defaults to 5.
-   `fps` (int, optional): Frames per second for the video. Defaults to 24.
-   `text_pos` (tuple or str, optional): Position of the text.
    -   As a tuple: `(x, y)` for the top-left corner of the text block.
    -   As a string: "center", "top_left", "top_center", "top_right", "center_left", "center_right", "bottom_left", "bottom_center", "bottom_right". Defaults to "center".
-   `font_path` (str, optional): Absolute or relative path to a TrueType (`.ttf`) or OpenType (`.otf`) font file. If `None` or if the path is invalid, it attempts to use "arial.ttf". If Arial is not found, it falls back to PIL's default bitmap font (which has limited styling capabilities).
-   `font_size` (int, optional): Font size in points. Defaults to 50.
-   `text_color` (tuple, optional): Text color as an RGB `(R,G,B)` or RGBA `(R,G,B,A)` tuple (0-255 per channel). Defaults to white `(255,255,255)`.
-   `bg_color` (tuple, optional): Background color for the text bounding box, as an RGB or RGBA tuple. If `None`, no background is drawn. Defaults to `None`.
-   `text_padding` (int, optional): Padding (in pixels) around the text if `bg_color` is used. Defaults to 10.
-   `text_alignment` (str, optional): Horizontal alignment for multiline text within its bounding box. Can be "left", "center", or "right". Defaults to "left".

### Example

The `video_creator.py` script includes an example `if __name__ == '__main__':` block that demonstrates various usages. You can run it directly:

```bash
python video_creator.py
```

This will:
1.  Create a sample image (`sample_image_pillow.png`) if it doesn't exist.
2.  Generate several example videos (`output_*.mp4`) showcasing different features and error handling.

To use it in your own script:

```python
import video_creator

# Ensure you have an image, e.g., "my_background.jpg"
# And a font file, e.g., "fonts/MyCustomFont.ttf" (optional)

success = video_creator.create_video_with_image_and_text_pillow_imageio(
    image_path="my_background.jpg",
    text="Hello World!\nThis is a test video.",
    output_path="custom_video.mp4",
    duration=10,
    fps=30,
    text_pos="center",
    font_path="fonts/MyCustomFont.ttf", # Optional
    font_size=70,
    text_color=(255, 255, 0), # Yellow
    bg_color=(0, 0, 0, 128),   # Semi-transparent black
    text_padding=20,
    text_alignment="center"
)

if success:
    print("Custom video created successfully!")
else:
    print("Custom video creation failed.")
```

## Running Tests

Unit tests are provided in `test_video_creator.py`. To run them:

```bash
python -m unittest test_video_creator.py -v
```

The tests will create a `test_sample_image.png` and a `test_videos_output/` directory, which are cleaned up afterwards.

## Known Issues/Limitations

-   **Font Availability**: The script tries to use "arial.ttf" as a default TrueType font if no `font_path` is specified. If Arial is not found in standard system font locations accessible to Pillow, it falls back to a very basic bitmap font provided by PIL. For best results and consistent styling, always provide a valid path to a `.ttf` or `.otf` font file using the `font_path` parameter.
-   **Text Rendering with Default Bitmap Font**: If the script falls back to PIL's default bitmap font, `font_size` may not correspond directly to pixel height, and text styling (especially anti-aliasing) will be very basic.
-   **Complex Text Layouts**: While multiline text and basic alignments ("left", "center", "right" for the block) are supported, very complex text layouts (e.g., mixed fonts, intricate per-line positioning) might require direct use of Pillow's advanced drawing capabilities outside this script's current scope.
-   **Video Codecs**: `imageio-ffmpeg` is used for MP4 encoding. The default codec settings are generally compatible, but for specific codec requirements, you might need to explore `imageio`'s `ffmpeg_params` argument (not directly exposed by this script).
