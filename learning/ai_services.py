import json
import re
import os
import subprocess
import tempfile
from django.conf import settings
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


class QuizGenerator:
    """Generate quiz questions from video content using AI"""
    
    def __init__(self, model="llama3.2"):
        self.model = model
        self.ollama_available = OLLAMA_AVAILABLE
    
    def generate_quiz_from_transcript(self, transcript, num_questions=5, lesson_title=""):
        """
        Generate quiz questions from video transcript
        
        Args:
            transcript: Text transcript of the video
            num_questions: Number of questions to generate (default: 5)
            lesson_title: Title of the lesson for context
            
        Returns:
            List of question dictionaries with format:
            {
                'question': 'Question text',
                'options': ['A', 'B', 'C', 'D'],
                'correct_answer': 0,  # Index of correct option
                'explanation': 'Why this is correct'
            }
        """
        if not self.ollama_available:
            print("Ollama not available, using fallback quiz generation")
            return self._generate_fallback_quiz(transcript, num_questions, lesson_title)
        
        try:
            # Check if Ollama is running and model is available
            print(f"Calling Ollama with model {self.model}...")
            ollama.list()  # This will fail if Ollama isn't running
            
            prompt = self._create_quiz_prompt(transcript, num_questions, lesson_title)
            print("Prompt created, sending to Ollama...")
            
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    'temperature': 0.7,  # Some creativity but not too random
                    'top_p': 0.9,
                }
            )
            
            # Parse the response
            print("Ollama response received. Parsing...")
            quiz_data = self._parse_quiz_response(response['response'])
            
            # Validate and return
            if quiz_data and len(quiz_data) > 0:
                return quiz_data[:num_questions]
            else:
                print("AI returned invalid quiz data, using fallback")
                return self._generate_fallback_quiz(transcript, num_questions, lesson_title)
                
        except Exception as e:
            print(f"Error generating quiz with Ollama: {str(e)}")
            print("Falling back to template-based quiz generation")
            return self._generate_fallback_quiz(transcript, num_questions, lesson_title)
    
    def _create_quiz_prompt(self, transcript, num_questions, lesson_title):
        """Create a prompt for the AI to generate quiz questions"""
        return f"""You are an expert educational content creator. Generate {num_questions} multiple-choice quiz questions based on the following video transcript about "{lesson_title}".

TRANSCRIPT:
{transcript[:3000]}  

REQUIREMENTS:
1. Each question must test understanding of key concepts from the video
2. Each question must have exactly 4 answer options (A, B, C, D)
3. Only ONE option should be correct
4. Include a brief explanation for why the correct answer is right
5. Questions should be challenging but fair
6. Avoid trick questions

OUTPUT FORMAT - Return ONLY valid JSON, no other text:
[
    {{
        "question": "What is the main concept discussed?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": 0,
        "explanation": "Option A is correct because..."
    }}
]

Generate the quiz questions now:"""
    
    def _parse_quiz_response(self, response_text):
        """Parse AI response to extract quiz questions"""
        try:
            # Try to extract JSON from the response
            # Look for JSON array pattern
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_str = json_match.group()
                quiz_data = json.loads(json_str)
                
                # Validate each question
                valid_questions = []
                for q in quiz_data:
                    if self._validate_question(q):
                        valid_questions.append(q)
                
                return valid_questions
            else:
                return []
                
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            return []
    
    def _validate_question(self, question):
        """Validate that a question has all required fields"""
        required_fields = ['question', 'options', 'correct_answer', 'explanation']
        
        # Check all required fields exist
        if not all(field in question for field in required_fields):
            return False
        
        # Check options is a list with 4 items
        if not isinstance(question['options'], list) or len(question['options']) != 4:
            return False
        
        # Check correct_answer is valid index
        if not isinstance(question['correct_answer'], int) or question['correct_answer'] not in range(4):
            return False
        
        return True
    
    def _generate_fallback_quiz(self, transcript, num_questions, lesson_title):
        """Generate basic quiz when AI is not available"""
        # Extract key sentences from transcript
        sentences = [s.strip() for s in transcript.split('.') if len(s.strip()) > 20]
        
        questions = []
        templates = [
            "What is the main topic discussed in this lesson?",
            f"According to the lesson, what is important to understand about {lesson_title}?",
            "Which concept was emphasized in this lesson?",
            "What was explained in this lesson?",
            "What is a key takeaway from this lesson?",
        ]
        
        for i in range(min(num_questions, len(templates))):
            questions.append({
                'question': templates[i],
                'options': [
                    f"{lesson_title} fundamentals",
                    "Unrelated concept",
                    "Another topic",
                    "Different subject"
                ],
                'correct_answer': 0,
                'explanation': f"The lesson focused on {lesson_title}, making this the correct answer."
            })
        
        return questions


class WhisperExtractor:
    """Transcribe video files using OpenAI Whisper"""
    
    def __init__(self, model_name="base"):
        self.model_name = model_name
        self.whisper_available = WHISPER_AVAILABLE
        self._model = None
    
    def get_model(self):
        """Lazy load the Whisper model"""
        if not self._model and self.whisper_available:
            print(f"Loading Whisper model: {self.model_name}...")
            self._model = whisper.load_model(self.model_name)
        return self._model
    
    def transcribe_video(self, video_path):
        """
        Transcribe a video file
        
        Args:
            video_path: Absolute path to the video file
            
        Returns:
            str: Transcribed text or None
        """
        if not self.whisper_available:
            print("Whisper not available")
            return None
            
        if not os.path.exists(video_path):
            print(f"Video file not found: {video_path}")
            return None
            
        try:
            # Step 1: Extract audio using FFmpeg to a temporary WAV file
            # This is often more reliable for Whisper than feeding the video directly
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_audio:
                audio_path = tmp_audio.name
            
            print(f"Extracting audio from {video_path}...")
            # Use ffmpeg to extract audio
            cmd = [
                'ffmpeg', '-y', '-i', video_path,
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                audio_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")
                return None
                
            # Step 2: Transcribe using Whisper
            model = self.get_model()
            if not model:
                return None
                
            print(f"Transcribing audio with Whisper...")
            result = model.transcribe(audio_path)
            
            # Clean up temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
                
            return result.get('text', '').strip()
            
        except Exception as e:
            print(f"Error in Whisper transcription: {str(e)}")
            return None


class TranscriptExtractor:
    """Extract transcripts from various video sources"""
    
    @staticmethod
    def get_youtube_transcript(video_url):
        """
        Extract transcript from YouTube video
        
        Args:
            video_url: YouTube video URL
            
        Returns:
            str: Transcript text or None if not available
        """
        try:
            # Extract video ID from URL
            video_id = TranscriptExtractor._extract_youtube_id(video_url)
            if not video_id:
                return None
            
            # Get transcript using instance method fetch
            api = YouTubeTranscriptApi()
            transcript_data = api.fetch(video_id)
            
            # Combine all text (entry is a FetchedTranscriptSnippet dataclass)
            transcript = ' '.join([entry.text for entry in transcript_data])
            
            return transcript
            
        except (TranscriptsDisabled, NoTranscriptFound) as e:
            print(f"No transcript available for YouTube video: {e}")
            return None
        except Exception as e:
            print(f"Error extracting YouTube transcript: {e}")
            return None
    
    @staticmethod
    def _extract_youtube_id(url):
        """Extract YouTube video ID from various URL formats"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)',
            r'youtube\.com\/embed\/([^&\n?#]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def get_video_summary(self, video_url=None, video_file=None):
        """
        Get a summary/transcript for any video type
        """
        if video_url and 'youtube' in video_url.lower():
            return self.get_youtube_transcript(video_url)
        
        if video_file and os.path.exists(video_file):
            extractor = WhisperExtractor()
            return extractor.transcribe_video(video_file)
            
        return None
