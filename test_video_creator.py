import unittest
import os
import shutil # For cleaning up test files
from PIL import Image, ImageDraw, ImageFont
import imageio # To inspect video (optional, could mock)
import numpy as np

# Assuming video_creator.py is in the same directory or accessible in PYTHONPATH
import video_creator

class TestVideoCreator(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Create a dummy image for all tests
        cls.sample_image_name = "test_sample_image.png"
        cls.output_video_dir = "test_videos_output"
        os.makedirs(cls.output_video_dir, exist_ok=True)

        try:
            img = Image.new('RGB', (200, 150), color = 'green')
            d = ImageDraw.Draw(img)
            d.text((10,10), "Test Img", fill=(255,255,0))
            img.save(cls.sample_image_name)
        except Exception as e:
            print(f"Critical error in setUpClass creating sample image: {e}")
            raise # If this fails, tests can't run properly

        # Find a test font if possible (for font_path testing)
        cls.test_font_path = None
        possible_fonts = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", # Common on Linux
                          "Arial.ttf"] # Common on Windows/Mac (often in system paths PIL checks)
        for pfont_name in possible_fonts:
            try:
                # Try to load it to see if PIL can find it (either absolute path or in search paths)
                ImageFont.truetype(pfont_name, 10)
                cls.test_font_path = pfont_name # If it loads, PIL can find it
                print(f"Using '{cls.test_font_path}' as test font.")
                break
            except IOError:
                continue
        if not cls.test_font_path:
            print("Warning: No common .ttf font found for testing custom font paths. Some tests might be limited or use PIL default.")


    @classmethod
    def tearDownClass(cls):
        # Clean up the dummy image and output directory
        if os.path.exists(cls.sample_image_name):
            os.remove(cls.sample_image_name)
        if os.path.exists(cls.output_video_dir):
            shutil.rmtree(cls.output_video_dir)

    def _get_output_path(self, name):
        return os.path.join(self.output_video_dir, name)

    def test_create_basic_video(self):
        output_file = self._get_output_path("basic_video.mp4")
        result = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path=self.sample_image_name,
            text="Basic Test",
            output_path=output_file,
            duration=1, # Shorter duration for tests
            fps=10      # Lower fps for tests
        )
        self.assertTrue(result, "Video creation function should return True on success.")
        self.assertTrue(os.path.exists(output_file), f"Video file {output_file} should exist.")

        # Inspect video properties. For very short videos, get_length() can be unreliable (e.g. return inf).
        # We'll check dimensions and that it's readable.
        try:
            reader = imageio.get_reader(output_file)
            meta = reader.get_meta_data()
            self.assertIsNotNone(meta, "Video metadata should not be None.")
            self.assertEqual(meta.get('size'), (200,150), f"Video dimensions {meta.get('size')} do not match expected (200,150).")

            # Check if we can read at least one frame
            first_frame = reader.get_data(0)
            self.assertIsNotNone(first_frame, "Should be able to read the first frame.")
            self.assertEqual(first_frame.shape[:2], (150,200), "Frame dimensions are incorrect.") # Note: numpy shape is (height, width)

            # Check frame count if it's not inf
            num_frames_expected = 1 * 10 # duration * fps
            actual_num_frames = reader.get_length()
            if actual_num_frames != float('inf'):
                 self.assertEqual(actual_num_frames, num_frames_expected, f"Expected {num_frames_expected} frames, got {actual_num_frames}")
            else:
                print(f"Info: reader.get_length() returned 'inf' for {output_file}. Skipping exact frame count check.")
            reader.close()
        except Exception as e:
            self.fail(f"Failed to read and verify video properties for {output_file}: {e}")


    def test_custom_font_and_position(self):
        output_file = self._get_output_path("custom_font_video.mp4")
        result = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path=self.sample_image_name,
            text="Custom Font Test",
            output_path=output_file,
            duration=1, fps=10,
            font_path=self.test_font_path, # Might be None, script should handle
            font_size=20,
            text_pos="bottom_right",
            text_color=(0,0,255,128), # Blue with alpha
            bg_color=(255,255,0,100)  # Yellow with alpha
        )
        self.assertTrue(result)
        self.assertTrue(os.path.exists(output_file))

    def test_image_not_found(self):
        output_file = self._get_output_path("error_img_not_found.mp4")
        result = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path="non_existent_image.png",
            text="Should Fail",
            output_path=output_file
        )
        self.assertFalse(result, "Video creation should fail and return False if image not found.")
        self.assertFalse(os.path.exists(output_file), "Output video should not be created on image load failure.")

    def test_bad_font_path(self):
        output_file = self._get_output_path("bad_font_path_video.mp4")
        # This should still create a video but with a warning and fallback font
        result = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path=self.sample_image_name,
            text="Bad Font Path",
            output_path=output_file,
            duration=1, fps=10,
            font_path="/tmp/this_font_does_not_exist.ttf"
        )
        self.assertTrue(result, "Video creation should still succeed (with fallback font).")
        self.assertTrue(os.path.exists(output_file))
        # Here, you might also capture stdout/stderr to check for the warning message,
        # but that's more complex for basic unit tests.

    def test_various_text_positions(self):
        positions = ["center", "top_left", "top_right", "bottom_left", "bottom_right",
                     "top_center", "bottom_center", "center_left", "center_right", (75,75)]
        for i, pos in enumerate(positions):
            with self.subTest(position=pos):
                output_file = self._get_output_path(f"pos_test_{i}_{str(pos).replace(' ','')}.mp4")
                result = video_creator.create_video_with_image_and_text_pillow_imageio(
                    image_path=self.sample_image_name,
                    text=f"Pos: {pos}",
                    output_path=output_file,
                    duration=0.5, fps=5, # very short
                    text_pos=pos,
                    font_size=15
                )
                self.assertTrue(result, f"Video creation failed for position {pos}")
                self.assertTrue(os.path.exists(output_file), f"Video file not created for position {pos}")

    def test_multiline_text_and_alignment(self):
        output_file = self._get_output_path("multiline_align_center.mp4")
        result = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path=self.sample_image_name,
            text="This is line one.\nAnd this is line two, centered.",
            output_path=output_file,
            duration=1, fps=10,
            text_pos="center",
            font_size=18,
            text_alignment="center",
            bg_color=(50,50,50,200)
        )
        self.assertTrue(result)
        self.assertTrue(os.path.exists(output_file))

        output_file_right = self._get_output_path("multiline_align_right.mp4")
        result_right = video_creator.create_video_with_image_and_text_pillow_imageio(
            image_path=self.sample_image_name,
            text="Line A, right aligned.\nLine B.",
            output_path=output_file_right,
            duration=1, fps=10,
            text_pos="center_right",
            font_size=18,
            text_alignment="right",
            text_color=(200,200,200)
        )
        self.assertTrue(result_right)
        self.assertTrue(os.path.exists(output_file_right))


if __name__ == '__main__':
    unittest.main()
