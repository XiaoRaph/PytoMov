from PIL import Image, ImageDraw, ImageFont
import imageio
import numpy as np
import os

def create_video_with_image_and_text_pillow_imageio(
    image_path,
    text,
    output_path="output.mp4",
    duration=5,
    fps=24,
    text_pos="center",
    font_path=None,
    font_size=50,
    text_color=(255,255,255),
    bg_color=None,
    text_padding=10,
    text_alignment="left" # new: left, center, right
    ):
    """
    Creates a video from an image with text overlay using Pillow and Imageio.

    Args:
        image_path (str): Path to the input image.
        text (str): Text to display on the video.
        output_path (str, optional): Path to save the output MP4 file. Defaults to "output.mp4".
        duration (int, optional): Duration of the video in seconds. Defaults to 5.
        fps (int, optional): Frames per second for the video. Defaults to 24.
        text_pos (tuple or str, optional): (x, y) position for the top-left of the text,
                                       or a string like "center", "top_left", "bottom_right", etc.
                                       Defaults to "center".
        font_path (str, optional): Path to a .ttf or .otf font file. If None, attempts "arial.ttf"
                                   then PIL's default.
        font_size (int, optional): Font size for the text. Defaults to 50.
        text_color (tuple, optional): RGB or RGBA tuple for text color. Defaults to white (255,255,255).
        bg_color (tuple, optional): RGB or RGBA tuple for text background color. If None, no background.
                                  Defaults to None.
        text_padding (int, optional): Padding around the text if bg_color is used. Defaults to 10.
        text_alignment (str, optional): Horizontal alignment of text ('left', 'center', 'right') if
                                      text_pos is a string indicating a region. Defaults to "left".
    """
    try:
        if not os.path.exists(image_path):
            print(f"Error: Image not found at {image_path}")
            return False # Return status

        img = Image.open(image_path).convert("RGBA") # Use RGBA for transparency options
        draw = ImageDraw.Draw(img)
        img_width, img_height = img.size

        # Font loading
        loaded_font = None
        if font_path and os.path.exists(font_path):
            try:
                loaded_font = ImageFont.truetype(font_path, font_size)
            except IOError:
                print(f"Warning: Could not load font at {font_path}. Trying Arial.")

        if not loaded_font:
            try:
                loaded_font = ImageFont.truetype("arial.ttf", font_size)
            except IOError:
                print("Warning: Arial font not found. Using default PIL font. Text styling will be basic.")
                try:
                    loaded_font = ImageFont.load_default()
                except IOError:
                    print("Error: Default PIL font also not found. Cannot add text.")
                    # Fallback: save the image as video without text
                    frames = [np.array(img.convert("RGB")) for _ in range(duration * fps)]
                    imageio.mimsave(output_path, frames, fps=fps, macro_block_size=1)
                    print(f"Video saved (without text due to font issues) to {output_path}")
                    return False # Return status
        font = loaded_font

        # Text metrics and positioning
        # Pillow's textbbox is preferred for TrueType, textsize for bitmap, or fallback
        if hasattr(font, "getbbox"): # For TrueType fonts
            # For multiline text, we need to calculate line by line or use a more complex approach
            # Simple approach for now: use overall bounding box.
            # For more accurate alignment, one would draw each line separately.
            # The `anchor` parameter in newer Pillow versions for draw.text helps, but textbbox is for the whole block.
            # Let's use a simpler textlength for single line width approximation with bitmap for now.
            # For TrueType, getlength is better for width of a single line.
            if hasattr(font, "getlength"):
                text_line_width = font.getlength(text.split('\n')[0]) # Approx width of first line
            else: # Fallback for older Pillow or basic fonts
                 text_line_width = len(text.split('\n')[0]) * font_size * 0.6 # Rough estimate

            # Using textbbox for overall box of potentially multiline text
            # Note: Pillow's textbbox for multiline text might not be what one expects for 'width' per line.
            # It gives the bounding box of the entire text block.
            # For precise per-line alignment or complex layouts, a more manual approach is needed.
            # We'll use the text_pos as the anchor point (top-left for now).
            # Pillow 9.2.0+ text anchor: draw.text(xy, text, font=font, fill=text_color, anchor="lt") for top-left
            # For simplicity, we calculate total text block dimensions
            # draw.textbbox((0,0)...) gives relative coords, then we shift.

            # Simplified approach for text_width and text_height for positioning logic
            # This is a common way to get the size of the text rendered.
            # For multiline, this gives the overall block.
            left, top, right, bottom = draw.textbbox((0,0), text, font=font, anchor=None, spacing=4, align=text_alignment)
            text_width = right - left
            text_height = bottom - top

        else: # Fallback for basic bitmap fonts
            # draw.textsize is deprecated but common with default font
            if hasattr(draw, "textsize"):
                text_width, text_height = draw.textsize(text, font=font)
            else: # Ultimate fallback if no size method
                text_width = font_size * len(text.split('\n')[0]) * 0.6 # rough
                text_height = font_size * text.count('\n') + 1 # rough

        actual_text_x, actual_text_y = 0, 0

        if isinstance(text_pos, str):
            if text_pos == "center":
                actual_text_x = (img_width - text_width) / 2
                actual_text_y = (img_height - text_height) / 2
            elif text_pos == "top_left":
                actual_text_x, actual_text_y = text_padding, text_padding
            elif text_pos == "top_center":
                actual_text_x = (img_width - text_width) / 2
                actual_text_y = text_padding
            elif text_pos == "top_right":
                actual_text_x = img_width - text_width - text_padding
                actual_text_y = text_padding
            elif text_pos == "center_left":
                actual_text_x = text_padding
                actual_text_y = (img_height - text_height) / 2
            elif text_pos == "center_right":
                actual_text_x = img_width - text_width - text_padding
                actual_text_y = (img_height - text_height) / 2
            elif text_pos == "bottom_left":
                actual_text_x = text_padding
                actual_text_y = img_height - text_height - text_padding
            elif text_pos == "bottom_center":
                actual_text_x = (img_width - text_width) / 2
                actual_text_y = img_height - text_height - text_padding
            elif text_pos == "bottom_right":
                actual_text_x = img_width - text_width - text_padding
                actual_text_y = img_height - text_height - text_padding
            else: # Default to top-left if string is unknown
                print(f"Warning: Unknown text_pos string '{text_pos}'. Defaulting to top-left.")
                actual_text_x, actual_text_y = text_padding, text_padding
        elif isinstance(text_pos, tuple) and len(text_pos) == 2:
            actual_text_x, actual_text_y = text_pos
        else:
            print("Warning: Invalid text_pos. Defaulting to center.")
            actual_text_x = (img_width - text_width) / 2
            actual_text_y = (img_height - text_height) / 2

        # Ensure coordinates are integers
        actual_text_x, actual_text_y = int(actual_text_x), int(actual_text_y)

        # Draw background for text if bg_color is specified
        if bg_color:
            # The bbox for rectangle should be based on actual_text_x, actual_text_y and text_width, text_height
            bg_x0 = actual_text_x - text_padding
            bg_y0 = actual_text_y - text_padding
            bg_x1 = actual_text_x + text_width + text_padding
            bg_y1 = actual_text_y + text_height + text_padding
            draw.rectangle([bg_x0, bg_y0, bg_x1, bg_y1], fill=bg_color)

        # Draw the text
        # Pillow versions 9.0.0+ have `align` for multiline text in `draw.text`
        # For older versions, or for more control, one might need to split lines and draw them manually.
        try: # Use anchor if available (Pillow 9.2.0+)
            draw.text((actual_text_x, actual_text_y), text, font=font, fill=text_color, anchor="la", align=text_alignment) # "la" = left, ascent
        except TypeError: # Fallback for older Pillow versions that don't have anchor or align in draw.text
            # Manual line splitting and drawing for basic alignment
            lines = text.split('\n')
            current_y = actual_text_y
            line_spacing = font.getmetrics()[0] if hasattr(font, "getmetrics") else font_size * 1.2 # Approx line height

            for line in lines:
                line_width_current = font.getlength(line) if hasattr(font, "getlength") else (len(line) * font_size * 0.6)
                current_x = actual_text_x
                if text_alignment == "center":
                    # This alignment is relative to the text_pos if it's a region, or the given x if it's a coordinate.
                    # If actual_text_x was calculated for centered block, this might need adjustment or be redundant.
                    # Assuming actual_text_x is the starting point of the text block.
                    # For line-by-line center within a block:
                    # current_x = actual_text_x + (text_width - line_width_current) / 2 # if text_width is max line width
                    # Simpler: if the block is centered, left align within it for now.
                    pass # Handled by text block positioning if text_pos="center"
                elif text_alignment == "right":
                     #current_x = actual_text_x + (text_width - line_width_current)
                     pass # Similar to center, block positioning might handle overall alignment.

                draw.text((current_x, current_y), line, font=font, fill=text_color)
                current_y += line_spacing


        # Create a sequence of frames (convert to RGB for imageio MP4 compatibility)
        final_img_rgb = img.convert("RGB")
        num_frames = int(duration * fps)
        if num_frames <= 0:
            print("Warning: Duration and FPS result in zero or negative frames. Creating a 1-frame video.")
            num_frames = 1
        frames = [np.array(final_img_rgb) for _ in range(num_frames)]

        # Write frames to video
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        imageio.mimsave(output_path, frames, fps=fps, macro_block_size=1, quality=8) # quality can be 1-10 for some codecs
        print(f"Video saved to {output_path}")
        return True # Return status

    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
        return False
    except IOError as e:
        print(f"IOError: Could not open/read image or font file: {e}")
        return False
    except Exception as e:
        import traceback
        print(f"An unexpected error occurred: {e}")
        print(traceback.format_exc())
        return False

if __name__ == '__main__':
    # Create a dummy image file for testing if it doesn't exist
    sample_image_path = "sample_image_pillow.png"
    try:
        img_test = Image.new('RGB', (800, 600), color = 'skyblue')
        d = ImageDraw.Draw(img_test)
        d.text((100,100), "Sample Background", fill=(0,0,0))
        img_test.save(sample_image_path)
        print(f"Created sample image: {sample_image_path}")
    except Exception as e:
        print(f"Error creating sample image: {e}")

    if os.path.exists(sample_image_path):
        print("\n--- Test Case 1: Centered Text with Background ---")
        create_video_with_image_and_text_pillow_imageio(
            image_path=sample_image_path,
            text="Hello from Pillow & Imageio!\nCentered Text",
            output_path="output_center_bg.mp4",
            duration=5,
            fps=24,
            text_pos="center", # Test string-based positioning
            font_size=60,
            text_color=(0, 0, 139), # Dark Blue
            bg_color=(200, 200, 200, 180), # Light grey BG with some transparency
            text_padding=15,
            text_alignment="center"
        )

        print("\n--- Test Case 2: Top-Left Text, No Background, Custom Font (if available) ---")
        # Attempt to find a common system font, or skip if not found
        # This is just for more robust example testing; real usage would specify a known font
        test_font_path = None
        possible_fonts = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", # Linux
                          "/Library/Fonts/Arial.ttf", # MacOS
                          "C:/Windows/Fonts/arial.ttf"] # Windows
        for pfont in possible_fonts:
            if os.path.exists(pfont):
                test_font_path = pfont
                print(f"Using font: {test_font_path} for test case 2")
                break
        if not test_font_path:
            print("No common custom font found for test case 2, will use default.")

        create_video_with_image_and_text_pillow_imageio(
            image_path=sample_image_path,
            text="Top-Left Text\nNo Background\nCustom Font (maybe)",
            output_path="output_topleft_customfont.mp4",
            duration=4,
            text_pos="top_left",
            font_path=test_font_path,
            font_size=40,
            text_color=(50,50,50, 200), # Dark grey, semi-transparent
            text_padding=20,
            text_alignment="left"
        )

        print("\n--- Test Case 3: Bottom-Right, Multiline, Specific Coords, Green Text ---")
        create_video_with_image_and_text_pillow_imageio(
            image_path=sample_image_path,
            text="Bottom-Right Aligned\nLine 2 here\nAnd a third line.",
            output_path="output_bottomright_coords.mp4",
            duration=5,
            #text_pos="bottom_right", # Let's test explicit coords for one
            text_pos=(400, 350), # Explicit coordinates
            font_size=30,
            text_color=(0,100,0), # Dark Green
            bg_color=(220,255,220,100), # Pale green, very transparent BG
            text_padding=5,
            text_alignment="right"
        )

        print("\n--- Test Case 4: Center_Left position with different alignment ---")
        create_video_with_image_and_text_pillow_imageio(
            image_path=sample_image_path,
            text="Center Left Position\nText aligned right within block.",
            output_path="output_centerleft_rightalign.mp4",
            duration=4,
            text_pos="center_left",
            font_size=35,
            text_color=(255,255,255),
            bg_color=(0,0,0,128), # semi-transparent black
            text_alignment="right",
            text_padding=10
        )

        print("\n--- Test Case 5: Error case - Image not found ---")
        create_video_with_image_and_text_pillow_imageio(
            image_path="non_existent_image.png",
            text="This should fail.",
            output_path="output_error_img.mp4"
        )

        print("\n--- Test Case 6: Error case - Font not found (explicitly bad path) ---")
        create_video_with_image_and_text_pillow_imageio(
            image_path=sample_image_path,
            text="This might use fallback font.",
            output_path="output_error_font.mp4",
            font_path="/tmp/non_existent_font.ttf"
        )

    else:
        print(f"Sample image {sample_image_path} was not created. Skipping video generation.")
