import os
import sys

# Add project root to path
sys.path.append('/Users/yubengurung/Documents/Projects/skillForge')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillForge.settings')

import django
django.setup()

from learning.ai_services import WhisperExtractor, TranscriptExtractor
import subprocess

def test_environment():
    print("--- Environment Check ---")
    try:
        import whisper
        print("✅ OpenAI Whisper is installed")
    except ImportError:
        print("❌ OpenAI Whisper is NOT installed")
        return False

    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ FFmpeg is installed and working")
        else:
            print("❌ FFmpeg is installed but returned an error")
    except FileNotFoundError:
        print("❌ FFmpeg is NOT found in PATH")
        return False
    
    return True

def test_whisper_instantiation():
    print("\n--- Whisper Extractor Check ---")
    try:
        # Use a very tiny model for faster verification of loading logic
        extractor = WhisperExtractor(model_name="tiny")
        print("✅ WhisperExtractor instantiated")
        
        # We won't load the model yet as it downloads data, 
        # but we can check if the class exists and has the method
        if hasattr(extractor, 'transcribe_video'):
            print("✅ transcribe_video method exists")
    except Exception as e:
        print(f"❌ Error instantiating WhisperExtractor: {e}")

def test_transcript_extractor():
    print("\n--- Transcript Extractor Check ---")
    try:
        extractor = TranscriptExtractor()
        print("✅ TranscriptExtractor instantiated")
        if hasattr(extractor, 'get_video_summary'):
            print("✅ get_video_summary method exists")
    except Exception as e:
        print(f"❌ Error instantiating TranscriptExtractor: {e}")

if __name__ == "__main__":
    if test_environment():
        test_whisper_instantiation()
        test_transcript_extractor()
        print("\nVerification complete.")
