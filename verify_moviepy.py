import sys
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"sys.path: {sys.path}")

try:
    import moviepy.editor
    print("MoviePy module 'moviepy.editor' imported successfully!")
    print(f"MoviePy location: {moviepy.editor.__file__}")
except ImportError as e:
    print(f"Failed to import moviepy.editor: {e}")
except Exception as e:
    print(f"An unexpected error occurred during import: {e}")

print("\nAttempting to import moviepy directly:")
try:
    import moviepy
    print("MoviePy base module imported successfully!")
    print(f"MoviePy base location: {moviepy.__file__}")
except ImportError as e:
    print(f"Failed to import base moviepy: {e}")
except Exception as e:
    print(f"An unexpected error occurred during base import: {e}")
