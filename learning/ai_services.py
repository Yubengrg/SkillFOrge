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


class RoadmapGenerator:
    """Generate role-based learning roadmaps using AI (or fallback templates)."""

    def __init__(self, model="llama3.2"):
        self.model = model
        self.ollama_available = OLLAMA_AVAILABLE

    def generate_roadmap(self, role, num_levels=4):
        if not self.ollama_available:
            return self._fallback(role)
        try:
            ollama.list()
            prompt = self._create_prompt(role, num_levels)
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                options={"temperature": 0.5, "top_p": 0.9},
            )
            roadmap = self._parse_response(response.get("response", ""))
            if not self._validate_roadmap(roadmap):
                print("Roadmap AI returned invalid or generic data; using fallback.")
                return self._fallback(role)
            return roadmap
        except Exception as e:
            print(f"Error generating roadmap with Ollama: {str(e)}")
            return self._fallback(role)

    def _create_prompt(self, role, num_levels):
        role_seed = self._role_seed(role)
        return f"""You are an expert curriculum designer. Create a highly detailed, role-based learning roadmap for the role: "{role}".

Return ONLY valid JSON with this schema:
{{
  "role": "{role}",
  "levels": [
    {{
      "title": "Beginner",
      "modules": [
        {{
          "title": "Module title",
          "lessons": [
            {{"title": "Lesson title"}}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
1) Use {num_levels} levels: Foundations, Beginner, Intermediate, Advanced.
2) Each level MUST have 8-12 modules.
3) Each module MUST have 5-9 lessons.
4) Lessons should be short, concrete topics (like roadmap.sh nodes).
5) Include foundations, tooling, architecture, testing, performance, security, and deployment where relevant.
6) Do NOT repeat generic placeholders like "Overview", "Basics", "Review".
7) Make it feel like roadmap.sh: specific, practical, and granular.
8) Assume the learner is a complete beginner aiming for industry-ready professional level.

Role seed topics (use them but expand with more):
{role_seed}

Generate the JSON now."""

    def _parse_response(self, response_text):
        try:
            match = re.search(r'\\{[\\s\\S]*\\}', response_text)
            if not match:
                return None
            return json.loads(match.group())
        except Exception:
            return None

    def _validate_roadmap(self, roadmap):
        if not roadmap or not isinstance(roadmap, dict):
            return False
        levels = roadmap.get("levels")
        if not levels or not isinstance(levels, list):
            return False
        if len(levels) < 4:
            return False
        for level in levels:
            modules = level.get("modules", [])
            if not modules or len(modules) < 8:
                return False
            for module in modules:
                lessons = module.get("lessons", [])
                if not lessons or len(lessons) < 5:
                    return False
        return True

    def _fallback(self, role):
        role_lower = role.lower()
        if "front" in role_lower:
            return self._frontend_fallback(role)
        if "back" in role_lower:
            return self._backend_fallback(role)
        if "full" in role_lower:
            return self._fullstack_fallback(role)
        if "data" in role_lower:
            return self._data_fallback(role)
        if "devops" in role_lower:
            return self._devops_fallback(role)
        if "mobile" in role_lower:
            return self._mobile_fallback(role)
        if "ui/ux" in role_lower or "design" in role_lower:
            return self._design_fallback(role)
        return {
            "role": role,
            "levels": [
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "Web Fundamentals", "lessons": [{"title": "How the Internet Works"}, {"title": "HTTP/HTTPS"}, {"title": "DNS"}, {"title": "Browsers"}, {"title": "Hosting Basics"}]},
                        {"title": "Programming Basics", "lessons": [{"title": "Variables & Types"}, {"title": "Control Flow"}, {"title": "Functions"}, {"title": "Debugging"}]},
                        {"title": "Tooling", "lessons": [{"title": "CLI Basics"}, {"title": "Git Basics"}, {"title": "Version Control Workflow"}, {"title": "Package Managers"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Architecture", "lessons": [{"title": "System Design Basics"}, {"title": "APIs"}, {"title": "Authentication"}, {"title": "Data Modeling"}, {"title": "Error Handling"}]},
                        {"title": "Testing", "lessons": [{"title": "Unit Testing"}, {"title": "Integration Testing"}, {"title": "Test Coverage"}, {"title": "Mocking"}]},
                        {"title": "Performance", "lessons": [{"title": "Profiling"}, {"title": "Caching"}, {"title": "Optimization"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "Security & Reliability", "lessons": [{"title": "OWASP Top 10"}, {"title": "Rate Limiting"}, {"title": "Monitoring"}, {"title": "Incident Response"}]},
                        {"title": "Deployment", "lessons": [{"title": "CI/CD"}, {"title": "Infrastructure Basics"}, {"title": "Containers"}, {"title": "Cloud Fundamentals"}]},
                        {"title": "Career", "lessons": [{"title": "Portfolio Projects"}, {"title": "Interview Prep"}, {"title": "System Design Practice"}]},
                    ],
                },
            ],
        }

    def _role_seed(self, role):
        role_lower = role.lower()
        if "front" in role_lower:
            return """Internet, HTTP/HTTPS, DNS, Browsers, HTML, Semantics, Accessibility,
CSS, Layout, Flexbox, Grid, Responsive Design, JavaScript, ES6+, DOM, Fetch,
TypeScript, npm/yarn/pnpm, Bundlers, Vite/Webpack, React, State Management,
Routing, Testing (Jest/RTL), Performance, Core Web Vitals, Security, Deployment."""
        if "back" in role_lower:
            return """HTTP/REST, Databases, SQL/NoSQL, Authentication, Authorization,
Node/Python/Java, Frameworks, ORM, Caching, Queues, Background Jobs,
Logging/Monitoring, Testing, Security, CI/CD, Docker, Cloud."""
        if "full" in role_lower:
            return """Frontend Fundamentals, Backend Fundamentals, Databases, APIs, Auth,
DevOps Basics, Testing, Performance, Security, Deployment, System Design."""
        if "data" in role_lower:
            return """Data Fundamentals, SQL, Python, Pandas, Statistics, Visualization,
ETL, Warehousing, Data Modeling, ML Basics, Deployment, Reporting."""
        if "devops" in role_lower:
            return """Linux, Networking, Docker, Kubernetes, CI/CD, Monitoring,
Infrastructure as Code, Cloud, Security, Reliability, Incident Response."""
        if "mobile" in role_lower:
            return """Mobile UI, iOS/Android, React Native/Flutter, State Management,
APIs, Performance, Testing, Deployment, App Store."""
        if "ui/ux" in role_lower or "design" in role_lower:
            return """User Research, Wireframing, Prototyping, Design Systems,
Accessibility, Typography, Interaction Design, Usability Testing."""
        return """Foundations, Tooling, Architecture, Testing, Performance, Security, Deployment."""

    def _frontend_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Internet & Web Basics", "lessons": [{"title": "How the Internet Works"}, {"title": "HTTP/HTTPS"}, {"title": "DNS"}, {"title": "Browsers"}, {"title": "Hosting Basics"}]},
                        {"title": "HTML Fundamentals", "lessons": [{"title": "Semantic HTML"}, {"title": "Forms & Validation"}, {"title": "Tables & Lists"}, {"title": "Media Elements"}, {"title": "Document Structure"}]},
                        {"title": "Accessibility Core", "lessons": [{"title": "ARIA Basics"}, {"title": "Keyboard Navigation"}, {"title": "Color Contrast"}, {"title": "Landmarks"}, {"title": "Accessible Forms"}]},
                        {"title": "CSS Core", "lessons": [{"title": "Selectors"}, {"title": "Box Model"}, {"title": "Typography"}, {"title": "Colors"}, {"title": "Specificity"}]},
                        {"title": "CSS Layout", "lessons": [{"title": "Flexbox"}, {"title": "Grid"}, {"title": "Responsive Design"}, {"title": "Positioning"}, {"title": "Media Queries"}]},
                        {"title": "JavaScript Basics", "lessons": [{"title": "Variables & Types"}, {"title": "Control Flow"}, {"title": "Functions"}, {"title": "Arrays & Objects"}, {"title": "Debugging"}]},
                        {"title": "Developer Tooling", "lessons": [{"title": "CLI Basics"}, {"title": "Git"}, {"title": "GitHub"}, {"title": "Package Managers"}, {"title": "VS Code"}]},
                        {"title": "Web Design Basics", "lessons": [{"title": "Layout Principles"}, {"title": "Spacing & Rhythm"}, {"title": "UI Patterns"}, {"title": "Color Systems"}, {"title": "Typography Scale"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "JavaScript Advanced", "lessons": [{"title": "ES6+"}, {"title": "Async/Await"}, {"title": "Promises"}, {"title": "Modules"}, {"title": "DOM APIs"}]},
                        {"title": "TypeScript Basics", "lessons": [{"title": "Types"}, {"title": "Interfaces"}, {"title": "Generics"}, {"title": "Type Narrowing"}, {"title": "Utility Types"}]},
                        {"title": "HTTP & APIs", "lessons": [{"title": "REST"}, {"title": "Fetch/Axios"}, {"title": "Auth Basics"}, {"title": "CORS"}, {"title": "JSON"}]},
                        {"title": "State & Data", "lessons": [{"title": "Local State"}, {"title": "Derived State"}, {"title": "Global State"}, {"title": "Server State"}, {"title": "Caching"}]},
                        {"title": "Build Tools", "lessons": [{"title": "Vite"}, {"title": "Webpack"}, {"title": "Babel"}, {"title": "Linting"}, {"title": "Formatting"}]},
                        {"title": "Framework Core", "lessons": [{"title": "React Components"}, {"title": "Hooks"}, {"title": "Routing"}, {"title": "State Mgmt"}, {"title": "Forms"}]},
                        {"title": "CSS at Scale", "lessons": [{"title": "BEM"}, {"title": "CSS Modules"}, {"title": "Tailwind"}, {"title": "Sass"}, {"title": "Design Tokens"}]},
                        {"title": "Project Basics", "lessons": [{"title": "Landing Page"}, {"title": "Blog UI"}, {"title": "Dashboard UI"}, {"title": "Reusable Components"}, {"title": "Deployment Basics"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Testing", "lessons": [{"title": "Jest"}, {"title": "RTL"}, {"title": "E2E Tests"}, {"title": "Mocks"}, {"title": "Coverage"}]},
                        {"title": "Performance", "lessons": [{"title": "Core Web Vitals"}, {"title": "Code Splitting"}, {"title": "Lazy Loading"}, {"title": "Caching"}, {"title": "Bundle Analysis"}]},
                        {"title": "Security", "lessons": [{"title": "XSS/CSRF"}, {"title": "Auth Flows"}, {"title": "CSP"}, {"title": "Secure Storage"}, {"title": "OAuth Basics"}]},
                        {"title": "Accessibility", "lessons": [{"title": "ARIA Patterns"}, {"title": "Keyboard Nav"}, {"title": "Focus Management"}, {"title": "Contrast"}, {"title": "Screen Readers"}]},
                        {"title": "Advanced Data Fetching", "lessons": [{"title": "React Query"}, {"title": "SWR"}, {"title": "Pagination"}, {"title": "Infinite Scroll"}, {"title": "Error States"}]},
                        {"title": "SSR & SSG", "lessons": [{"title": "Next.js Basics"}, {"title": "Server Components"}, {"title": "Routing Patterns"}, {"title": "Data Loading"}, {"title": "SEO"}]},
                        {"title": "PWA & Offline", "lessons": [{"title": "Service Workers"}, {"title": "Caching Strategies"}, {"title": "Offline UX"}, {"title": "Installability"}, {"title": "Push Basics"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "E-commerce UI"}, {"title": "Kanban App"}, {"title": "Analytics Dashboard"}, {"title": "Portfolio v2"}, {"title": "Design System Lite"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "Frontend Architecture", "lessons": [{"title": "Module Boundaries"}, {"title": "State Management Patterns"}, {"title": "Microfrontends"}, {"title": "Design Systems"}, {"title": "Component Libraries"}]},
                        {"title": "Advanced Performance", "lessons": [{"title": "Rendering Profiling"}, {"title": "Memoization"}, {"title": "Image Optimization"}, {"title": "Streaming UI"}, {"title": "Edge Caching"}]},
                        {"title": "Observability", "lessons": [{"title": "Logging"}, {"title": "Monitoring"}, {"title": "Error Tracking"}, {"title": "RUM Metrics"}, {"title": "Alerting"}]},
                        {"title": "Security & Privacy", "lessons": [{"title": "Content Security Policy"}, {"title": "Token Storage"}, {"title": "Threat Modeling"}, {"title": "Dependency Audits"}, {"title": "Privacy Basics"}]},
                        {"title": "CI/CD & Deployment", "lessons": [{"title": "CI Pipelines"}, {"title": "Preview Environments"}, {"title": "SSR/SSG Deploys"}, {"title": "Rollback Strategies"}, {"title": "Monitoring"}]},
                        {"title": "Scaling Teams", "lessons": [{"title": "Code Standards"}, {"title": "Review Culture"}, {"title": "Docs & ADRs"}, {"title": "Feature Flags"}, {"title": "Release Process"}]},
                        {"title": "Portfolio & Career", "lessons": [{"title": "Capstone Project"}, {"title": "Resume & GitHub"}, {"title": "Interview Prep"}, {"title": "System Design Basics"}, {"title": "Behavioral Interviews"}]},
                        {"title": "Advanced Projects", "lessons": [{"title": "SaaS Dashboard"}, {"title": "Marketplace UI"}, {"title": "Real-time App"}, {"title": "Performance Audit"}, {"title": "Accessibility Audit"}]},
                    ],
                },
            ],
        }

    def _backend_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Internet & HTTP", "lessons": [{"title": "HTTP Methods"}, {"title": "Status Codes"}, {"title": "Headers"}, {"title": "Caching Basics"}, {"title": "HTTPS"}]},
                        {"title": "Linux & CLI", "lessons": [{"title": "Files & Permissions"}, {"title": "Processes"}, {"title": "Networking Tools"}, {"title": "Shell Scripting"}, {"title": "Logs"}]},
                        {"title": "Programming Basics", "lessons": [{"title": "Control Flow"}, {"title": "Data Structures"}, {"title": "Functions"}, {"title": "Error Handling"}, {"title": "Debugging"}]},
                        {"title": "Git & Collaboration", "lessons": [{"title": "Git Basics"}, {"title": "Branching"}, {"title": "Pull Requests"}, {"title": "Merge Conflicts"}, {"title": "Git Hooks"}]},
                        {"title": "Databases Intro", "lessons": [{"title": "Relational vs NoSQL"}, {"title": "SQL Basics"}, {"title": "Indexes"}, {"title": "Joins"}, {"title": "Normalization"}]},
                        {"title": "APIs Fundamentals", "lessons": [{"title": "REST Basics"}, {"title": "Request Validation"}, {"title": "Pagination"}, {"title": "Rate Limits"}, {"title": "API Versioning"}]},
                        {"title": "Web Servers", "lessons": [{"title": "Client-Server Model"}, {"title": "Reverse Proxies"}, {"title": "Load Balancers"}, {"title": "TLS Basics"}, {"title": "Nginx Intro"}]},
                        {"title": "Security Basics", "lessons": [{"title": "Auth vs Authz"}, {"title": "Password Storage"}, {"title": "Input Sanitization"}, {"title": "Secrets Basics"}, {"title": "OWASP Intro"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "Backend Frameworks", "lessons": [{"title": "Routing"}, {"title": "Controllers"}, {"title": "Middleware"}, {"title": "Validation"}, {"title": "Error Handling"}]},
                        {"title": "Data Modeling", "lessons": [{"title": "Schema Design"}, {"title": "Relationships"}, {"title": "Migrations"}, {"title": "Constraints"}, {"title": "Indexes Tuning"}]},
                        {"title": "ORM & Querying", "lessons": [{"title": "ORM Basics"}, {"title": "Query Optimization"}, {"title": "Transactions"}, {"title": "Eager vs Lazy"}, {"title": "N+1 Issues"}]},
                        {"title": "Authentication", "lessons": [{"title": "Sessions"}, {"title": "JWT"}, {"title": "OAuth"}, {"title": "Refresh Tokens"}, {"title": "SSO Basics"}]},
                        {"title": "Caching & Performance", "lessons": [{"title": "Cache Layers"}, {"title": "Redis Basics"}, {"title": "HTTP Caching"}, {"title": "Cache Invalidation"}, {"title": "Throttling"}]},
                        {"title": "Background Jobs", "lessons": [{"title": "Queues"}, {"title": "Workers"}, {"title": "Retries"}, {"title": "Idempotency"}, {"title": "Scheduling"}]},
                        {"title": "Testing Basics", "lessons": [{"title": "Unit Tests"}, {"title": "Integration Tests"}, {"title": "Test Data"}, {"title": "Mocks"}, {"title": "Coverage"}]},
                        {"title": "API Documentation", "lessons": [{"title": "OpenAPI"}, {"title": "Swagger UI"}, {"title": "Error Contracts"}, {"title": "Changelog"}, {"title": "SDK Basics"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Service Architecture", "lessons": [{"title": "Layered Architecture"}, {"title": "Hexagonal"}, {"title": "Domain Models"}, {"title": "Service Boundaries"}, {"title": "Refactoring"}]},
                        {"title": "Scalability", "lessons": [{"title": "Horizontal Scaling"}, {"title": "Load Balancing"}, {"title": "Read Replicas"}, {"title": "Sharding"}, {"title": "Caching Strategy"}]},
                        {"title": "Observability", "lessons": [{"title": "Structured Logs"}, {"title": "Metrics"}, {"title": "Tracing"}, {"title": "Dashboards"}, {"title": "Alerting"}]},
                        {"title": "Distributed Systems", "lessons": [{"title": "CAP Theorem"}, {"title": "Consistency"}, {"title": "Retries"}, {"title": "Circuit Breakers"}, {"title": "Message Brokers"}]},
                        {"title": "Advanced Security", "lessons": [{"title": "OWASP Top 10"}, {"title": "Rate Limiting"}, {"title": "CSRF/XSS"}, {"title": "Security Headers"}, {"title": "Threat Modeling"}]},
                        {"title": "Data Stores", "lessons": [{"title": "Document DBs"}, {"title": "Key-Value Stores"}, {"title": "Search Engines"}, {"title": "Time Series"}, {"title": "Data Backups"}]},
                        {"title": "Performance Tuning", "lessons": [{"title": "Profiling"}, {"title": "Query Plans"}, {"title": "Slow Endpoints"}, {"title": "Connection Pools"}, {"title": "Memory Leaks"}]},
                        {"title": "Async Patterns", "lessons": [{"title": "Event-Driven"}, {"title": "Webhooks"}, {"title": "Sagas"}, {"title": "Outbox Pattern"}, {"title": "Idempotent APIs"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "System Design", "lessons": [{"title": "Design Reviews"}, {"title": "Capacity Planning"}, {"title": "Tradeoffs"}, {"title": "SLAs/SLOs"}, {"title": "Architecture Docs"}]},
                        {"title": "Reliability", "lessons": [{"title": "SRE Basics"}, {"title": "Incident Response"}, {"title": "Postmortems"}, {"title": "Chaos Testing"}, {"title": "Fallbacks"}]},
                        {"title": "Cloud & Deployment", "lessons": [{"title": "Cloud Services"}, {"title": "CI/CD"}, {"title": "Blue/Green"}, {"title": "Rollbacks"}, {"title": "Secrets Mgmt"}]},
                        {"title": "Containers & K8s", "lessons": [{"title": "Docker Images"}, {"title": "Kubernetes Pods"}, {"title": "Services"}, {"title": "Ingress"}, {"title": "Helm"}]},
                        {"title": "Advanced Security", "lessons": [{"title": "IAM"}, {"title": "Zero Trust"}, {"title": "Audit Logging"}, {"title": "Compliance"}, {"title": "Pen Testing Basics"}]},
                        {"title": "Data Infrastructure", "lessons": [{"title": "Migration Strategies"}, {"title": "Multi-region"}, {"title": "Data Governance"}, {"title": "CDC Basics"}, {"title": "Backups & DR"}]},
                        {"title": "Leadership", "lessons": [{"title": "Tech Specs"}, {"title": "Mentoring"}, {"title": "Roadmaps"}, {"title": "Stakeholder Mgmt"}, {"title": "Hiring Basics"}]},
                        {"title": "Capstone", "lessons": [{"title": "End-to-End API"}, {"title": "Performance Review"}, {"title": "Security Audit"}, {"title": "Observability Setup"}, {"title": "Production Readiness"}]},
                    ],
                },
            ],
        }

    def _fullstack_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Web Fundamentals", "lessons": [{"title": "HTTP/HTTPS"}, {"title": "DNS"}, {"title": "Browsers"}, {"title": "Hosting"}, {"title": "Cookies"}]},
                        {"title": "HTML & CSS", "lessons": [{"title": "Semantic HTML"}, {"title": "Forms"}, {"title": "Flexbox"}, {"title": "Grid"}, {"title": "Responsive Design"}]},
                        {"title": "JavaScript Basics", "lessons": [{"title": "ES6+"}, {"title": "DOM"}, {"title": "Events"}, {"title": "Async JS"}, {"title": "Modules"}]},
                        {"title": "Tooling", "lessons": [{"title": "Git"}, {"title": "GitHub"}, {"title": "CLI"}, {"title": "Package Managers"}, {"title": "Linters"}]},
                        {"title": "Databases Intro", "lessons": [{"title": "Relational DBs"}, {"title": "SQL Basics"}, {"title": "Indexes"}, {"title": "Joins"}, {"title": "Migrations"}]},
                        {"title": "API Basics", "lessons": [{"title": "REST"}, {"title": "JSON"}, {"title": "Status Codes"}, {"title": "Pagination"}, {"title": "Validation"}]},
                        {"title": "Auth Basics", "lessons": [{"title": "Sessions"}, {"title": "JWT"}, {"title": "OAuth"}, {"title": "Password Storage"}, {"title": "CSRF Basics"}]},
                        {"title": "Project Setup", "lessons": [{"title": "Monorepo vs Polyrepo"}, {"title": "Env Vars"}, {"title": "Local Dev"}, {"title": "Debugging"}, {"title": "Deployment Intro"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "Frontend Framework", "lessons": [{"title": "React/Vue Basics"}, {"title": "Components"}, {"title": "State"}, {"title": "Routing"}, {"title": "Forms"}]},
                        {"title": "Backend Framework", "lessons": [{"title": "Routing"}, {"title": "Controllers"}, {"title": "Middleware"}, {"title": "Validation"}, {"title": "Errors"}]},
                        {"title": "Data Modeling", "lessons": [{"title": "Schema Design"}, {"title": "Relationships"}, {"title": "Constraints"}, {"title": "Indexes"}, {"title": "Migrations"}]},
                        {"title": "API Integration", "lessons": [{"title": "Fetch/Axios"}, {"title": "CORS"}, {"title": "Auth Headers"}, {"title": "Error States"}, {"title": "Caching"}]},
                        {"title": "Testing Basics", "lessons": [{"title": "Unit Tests"}, {"title": "Integration Tests"}, {"title": "Mocks"}, {"title": "Coverage"}, {"title": "Test Data"}]},
                        {"title": "State Management", "lessons": [{"title": "Local State"}, {"title": "Global State"}, {"title": "Server State"}, {"title": "Derived State"}, {"title": "Forms State"}]},
                        {"title": "UI/UX Basics", "lessons": [{"title": "Layout Systems"}, {"title": "Typography"}, {"title": "Accessibility"}, {"title": "UI Patterns"}, {"title": "Design Tokens"}]},
                        {"title": "Beginner Projects", "lessons": [{"title": "Auth App"}, {"title": "CRUD App"}, {"title": "Dashboard"}, {"title": "Blog"}, {"title": "Portfolio"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Architecture", "lessons": [{"title": "Layered Architecture"}, {"title": "Service Boundaries"}, {"title": "API Contracts"}, {"title": "Refactoring"}, {"title": "Monorepos"}]},
                        {"title": "Performance", "lessons": [{"title": "Caching"}, {"title": "DB Indexing"}, {"title": "Code Splitting"}, {"title": "Lazy Loading"}, {"title": "Profiling"}]},
                        {"title": "Security", "lessons": [{"title": "OWASP"}, {"title": "Rate Limiting"}, {"title": "XSS/CSRF"}, {"title": "Secrets Mgmt"}, {"title": "Threat Modeling"}]},
                        {"title": "Observability", "lessons": [{"title": "Logging"}, {"title": "Metrics"}, {"title": "Tracing"}, {"title": "Dashboards"}, {"title": "Alerts"}]},
                        {"title": "Async & Jobs", "lessons": [{"title": "Queues"}, {"title": "Workers"}, {"title": "Retries"}, {"title": "Schedules"}, {"title": "Idempotency"}]},
                        {"title": "Advanced Frontend", "lessons": [{"title": "SSR/SSG"}, {"title": "PWA"}, {"title": "Design Systems"}, {"title": "Testing UI"}, {"title": "Accessibility Audits"}]},
                        {"title": "Advanced Backend", "lessons": [{"title": "Caching Strategy"}, {"title": "API Versioning"}, {"title": "Webhooks"}, {"title": "Background Tasks"}, {"title": "Data Backups"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "E-commerce"}, {"title": "SaaS App"}, {"title": "Real-time Chat"}, {"title": "Analytics"}, {"title": "Multi-tenant App"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "System Design", "lessons": [{"title": "Scalability"}, {"title": "Load Balancing"}, {"title": "Sharding"}, {"title": "CAP Tradeoffs"}, {"title": "Multi-region"}]},
                        {"title": "Cloud & Deployment", "lessons": [{"title": "CI/CD"}, {"title": "Containers"}, {"title": "Kubernetes Basics"}, {"title": "Blue/Green"}, {"title": "Rollbacks"}]},
                        {"title": "Reliability", "lessons": [{"title": "SLOs"}, {"title": "Incident Response"}, {"title": "Postmortems"}, {"title": "Chaos Testing"}, {"title": "Fallbacks"}]},
                        {"title": "Security Advanced", "lessons": [{"title": "IAM"}, {"title": "Audit Logs"}, {"title": "Compliance"}, {"title": "Pen Testing"}, {"title": "Data Privacy"}]},
                        {"title": "Performance Advanced", "lessons": [{"title": "Edge Caching"}, {"title": "CDN Strategy"}, {"title": "DB Optimization"}, {"title": "Profiling"}, {"title": "Cost Optimization"}]},
                        {"title": "Leadership", "lessons": [{"title": "Tech Specs"}, {"title": "Mentoring"}, {"title": "Roadmaps"}, {"title": "Stakeholder Mgmt"}, {"title": "Hiring Basics"}]},
                        {"title": "Career", "lessons": [{"title": "Portfolio Polish"}, {"title": "Interview Prep"}, {"title": "Behavioral"}, {"title": "System Design Practice"}, {"title": "Open Source"}]},
                        {"title": "Capstone", "lessons": [{"title": "Production App"}, {"title": "Security Review"}, {"title": "Performance Review"}, {"title": "Observability Setup"}, {"title": "Launch Plan"}]},
                    ],
                },
            ],
        }

    def _data_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Data Fundamentals", "lessons": [{"title": "Data Types"}, {"title": "Data Quality"}, {"title": "Sampling"}, {"title": "Bias Basics"}, {"title": "Data Ethics"}]},
                        {"title": "Statistics Basics", "lessons": [{"title": "Distributions"}, {"title": "Mean/Median"}, {"title": "Variance"}, {"title": "Correlation"}, {"title": "Hypothesis Testing"}]},
                        {"title": "SQL Fundamentals", "lessons": [{"title": "SELECT & WHERE"}, {"title": "Joins"}, {"title": "Aggregations"}, {"title": "Window Functions"}, {"title": "Indexes Basics"}]},
                        {"title": "Python Basics", "lessons": [{"title": "Data Structures"}, {"title": "Functions"}, {"title": "File I/O"}, {"title": "Virtual Envs"}, {"title": "Debugging"}]},
                        {"title": "Spreadsheets", "lessons": [{"title": "Formulas"}, {"title": "Pivot Tables"}, {"title": "Data Cleaning"}, {"title": "Charts"}, {"title": "Imports"}]},
                        {"title": "Data Cleaning", "lessons": [{"title": "Missing Data"}, {"title": "Outliers"}, {"title": "Normalization"}, {"title": "String Cleaning"}, {"title": "Date Handling"}]},
                        {"title": "Visualization Basics", "lessons": [{"title": "Chart Types"}, {"title": "Color & Layout"}, {"title": "Labels"}, {"title": "Storytelling"}, {"title": "Dashboards Basics"}]},
                        {"title": "Workflow & Tools", "lessons": [{"title": "Jupyter"}, {"title": "Git Basics"}, {"title": "Project Structure"}, {"title": "Reproducibility"}, {"title": "Documentation"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "Pandas & NumPy", "lessons": [{"title": "DataFrames"}, {"title": "Filtering"}, {"title": "GroupBy"}, {"title": "Merges"}, {"title": "Performance Tips"}]},
                        {"title": "Exploratory Analysis", "lessons": [{"title": "EDA Process"}, {"title": "Feature Distributions"}, {"title": "Correlation Analysis"}, {"title": "Anomaly Detection"}, {"title": "EDA Reporting"}]},
                        {"title": "SQL for Analytics", "lessons": [{"title": "CTEs"}, {"title": "Window Functions"}, {"title": "Cohorts"}, {"title": "Funnels"}, {"title": "Retention"}]},
                        {"title": "Data Modeling", "lessons": [{"title": "Star Schema"}, {"title": "Fact vs Dim"}, {"title": "SCDs"}, {"title": "Normalization"}, {"title": "Data Contracts"}]},
                        {"title": "Visualization Tools", "lessons": [{"title": "Tableau/PowerBI"}, {"title": "Dashboards"}, {"title": "Filters"}, {"title": "KPIs"}, {"title": "Storytelling"}]},
                        {"title": "APIs & Data Sources", "lessons": [{"title": "REST APIs"}, {"title": "JSON Parsing"}, {"title": "Auth Tokens"}, {"title": "Rate Limits"}, {"title": "Pagination"}]},
                        {"title": "Data Pipelines", "lessons": [{"title": "ETL Basics"}, {"title": "Scheduling"}, {"title": "Data Validation"}, {"title": "Logging"}, {"title": "Retries"}]},
                        {"title": "Beginner Projects", "lessons": [{"title": "Sales Dashboard"}, {"title": "Churn Analysis"}, {"title": "A/B Test Report"}, {"title": "Product Metrics"}, {"title": "Data Cleaning Project"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Warehousing", "lessons": [{"title": "BigQuery/Redshift"}, {"title": "Partitioning"}, {"title": "Clustering"}, {"title": "Cost Management"}, {"title": "Data Governance"}]},
                        {"title": "Data Engineering", "lessons": [{"title": "Pipelines at Scale"}, {"title": "Streaming Basics"}, {"title": "Orchestration"}, {"title": "Data Lineage"}, {"title": "Monitoring"}]},
                        {"title": "Statistics Applied", "lessons": [{"title": "Confidence Intervals"}, {"title": "Regression"}, {"title": "ANOVA"}, {"title": "Power Analysis"}, {"title": "Causal Basics"}]},
                        {"title": "ML Foundations", "lessons": [{"title": "Feature Engineering"}, {"title": "Train/Test Split"}, {"title": "Model Evaluation"}, {"title": "Overfitting"}, {"title": "Baseline Models"}]},
                        {"title": "Advanced SQL", "lessons": [{"title": "Optimization"}, {"title": "Query Plans"}, {"title": "UDFs"}, {"title": "Materialized Views"}, {"title": "Data Pipelines"}]},
                        {"title": "Analytics Engineering", "lessons": [{"title": "dbt Basics"}, {"title": "Testing Models"}, {"title": "Semantic Layer"}, {"title": "Documentation"}, {"title": "Versioning"}]},
                        {"title": "Business Metrics", "lessons": [{"title": "North Star Metrics"}, {"title": "Cohorts"}, {"title": "Retention"}, {"title": "LTV"}, {"title": "Attribution"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "Growth Dashboard"}, {"title": "Forecasting Basics"}, {"title": "Experiment Analysis"}, {"title": "Product Analytics"}, {"title": "Pipeline Build"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "MLOps Basics", "lessons": [{"title": "Model Packaging"}, {"title": "Serving"}, {"title": "Monitoring"}, {"title": "Drift"}, {"title": "Retraining"}]},
                        {"title": "Data Architecture", "lessons": [{"title": "Lakehouse"}, {"title": "Multi-tenant"}, {"title": "Access Control"}, {"title": "Compliance"}, {"title": "Data Catalogs"}]},
                        {"title": "Scalable Systems", "lessons": [{"title": "Streaming Systems"}, {"title": "Kafka Basics"}, {"title": "Event Schemas"}, {"title": "Backfills"}, {"title": "SLA Management"}]},
                        {"title": "Advanced ML", "lessons": [{"title": "Ensembles"}, {"title": "Time Series"}, {"title": "NLP Basics"}, {"title": "Feature Stores"}, {"title": "Model Explainability"}]},
                        {"title": "Data Leadership", "lessons": [{"title": "Stakeholder Mgmt"}, {"title": "Roadmaps"}, {"title": "Team Practices"}, {"title": "Data Culture"}, {"title": "Mentoring"}]},
                        {"title": "Production Analytics", "lessons": [{"title": "Alerting"}, {"title": "Anomaly Detection"}, {"title": "Data SLAs"}, {"title": "Dashboards at Scale"}, {"title": "Governance"}]},
                        {"title": "Career", "lessons": [{"title": "Portfolio"}, {"title": "Case Studies"}, {"title": "Interview Prep"}, {"title": "SQL Challenges"}, {"title": "Storytelling"}]},
                        {"title": "Capstone", "lessons": [{"title": "End-to-End Pipeline"}, {"title": "Model Deployment"}, {"title": "Monitoring Setup"}, {"title": "Documentation"}, {"title": "Executive Summary"}]},
                    ],
                },
            ],
        }

    def _devops_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Linux Fundamentals", "lessons": [{"title": "Filesystem"}, {"title": "Permissions"}, {"title": "Processes"}, {"title": "Networking"}, {"title": "Systemd Basics"}]},
                        {"title": "Networking Basics", "lessons": [{"title": "TCP/IP"}, {"title": "DNS"}, {"title": "Load Balancers"}, {"title": "TLS"}, {"title": "Firewalls"}]},
                        {"title": "Scripting", "lessons": [{"title": "Bash Basics"}, {"title": "Python Scripting"}, {"title": "Cron Jobs"}, {"title": "Log Parsing"}, {"title": "Automation"}]},
                        {"title": "Git & CI Basics", "lessons": [{"title": "Git Workflows"}, {"title": "CI Concepts"}, {"title": "Build Artifacts"}, {"title": "Env Vars"}, {"title": "Secrets Basics"}]},
                        {"title": "Cloud Basics", "lessons": [{"title": "Compute"}, {"title": "Storage"}, {"title": "Networking"}, {"title": "IAM Intro"}, {"title": "Billing Basics"}]},
                        {"title": "Containers Intro", "lessons": [{"title": "Docker Basics"}, {"title": "Images"}, {"title": "Containers"}, {"title": "Compose"}, {"title": "Registries"}]},
                        {"title": "Monitoring Intro", "lessons": [{"title": "Logs"}, {"title": "Metrics"}, {"title": "Alerts"}, {"title": "Dashboards"}, {"title": "SLIs"}]},
                        {"title": "Security Basics", "lessons": [{"title": "Least Privilege"}, {"title": "Secrets Mgmt"}, {"title": "Vulnerability Scans"}, {"title": "Patching"}, {"title": "Backups"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "CI/CD Pipelines", "lessons": [{"title": "Pipeline Stages"}, {"title": "Testing Gates"}, {"title": "Artifacts"}, {"title": "Deployments"}, {"title": "Rollback Basics"}]},
                        {"title": "Infrastructure as Code", "lessons": [{"title": "Terraform Basics"}, {"title": "State Management"}, {"title": "Modules"}, {"title": "Plan/Apply"}, {"title": "Secrets Handling"}]},
                        {"title": "Containers at Scale", "lessons": [{"title": "Dockerfile Best Practices"}, {"title": "Multi-stage Builds"}, {"title": "Security Scans"}, {"title": "Resource Limits"}, {"title": "Registries"}]},
                        {"title": "Kubernetes Basics", "lessons": [{"title": "Pods"}, {"title": "Deployments"}, {"title": "Services"}, {"title": "Ingress"}, {"title": "ConfigMaps"}]},
                        {"title": "Cloud Services", "lessons": [{"title": "Managed DBs"}, {"title": "Object Storage"}, {"title": "Queues"}, {"title": "CDN"}, {"title": "Serverless Intro"}]},
                        {"title": "Observability", "lessons": [{"title": "Logging Pipelines"}, {"title": "Metrics Aggregation"}, {"title": "Tracing"}, {"title": "Alerting"}, {"title": "SLOs"}]},
                        {"title": "Security Practices", "lessons": [{"title": "IAM Policies"}, {"title": "Secret Rotation"}, {"title": "Network Segmentation"}, {"title": "WAF Basics"}, {"title": "Compliance Basics"}]},
                        {"title": "Beginner Projects", "lessons": [{"title": "CI for App"}, {"title": "Dockerized App"}, {"title": "K8s Deployment"}, {"title": "Monitoring Setup"}, {"title": "Backup Strategy"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Kubernetes Advanced", "lessons": [{"title": "Helm"}, {"title": "StatefulSets"}, {"title": "Autoscaling"}, {"title": "Network Policies"}, {"title": "Operators Basics"}]},
                        {"title": "Release Strategies", "lessons": [{"title": "Blue/Green"}, {"title": "Canary"}, {"title": "Feature Flags"}, {"title": "Progressive Delivery"}, {"title": "Rollback"}]},
                        {"title": "SRE Practices", "lessons": [{"title": "SLOs/SLAs"}, {"title": "Error Budgets"}, {"title": "Incident Response"}, {"title": "Postmortems"}, {"title": "On-call"}]},
                        {"title": "Infrastructure Scaling", "lessons": [{"title": "Auto-scaling"}, {"title": "Multi-region"}, {"title": "Capacity Planning"}, {"title": "Cost Optimization"}, {"title": "Caching"}]},
                        {"title": "Security Advanced", "lessons": [{"title": "Zero Trust"}, {"title": "Threat Modeling"}, {"title": "Audit Logs"}, {"title": "Compliance"}, {"title": "Pen Testing Basics"}]},
                        {"title": "Networking Advanced", "lessons": [{"title": "VPC Design"}, {"title": "Peering"}, {"title": "DNS Routing"}, {"title": "TLS Termination"}, {"title": "WAF/IDS"}]},
                        {"title": "Data & Storage", "lessons": [{"title": "Backups/DR"}, {"title": "Storage Classes"}, {"title": "DB Scaling"}, {"title": "Snapshotting"}, {"title": "Encryption"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "Multi-env Pipeline"}, {"title": "K8s Autoscaling"}, {"title": "Disaster Recovery"}, {"title": "Observability Stack"}, {"title": "Security Hardening"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "Platform Engineering", "lessons": [{"title": "IDP Concepts"}, {"title": "Golden Paths"}, {"title": "Self-service Infra"}, {"title": "Templates"}, {"title": "Governance"}]},
                        {"title": "Advanced Reliability", "lessons": [{"title": "Chaos Engineering"}, {"title": "Global Failover"}, {"title": "Resilience Testing"}, {"title": "DR Drills"}, {"title": "Incident Automation"}]},
                        {"title": "Security Leadership", "lessons": [{"title": "Security Programs"}, {"title": "Policy as Code"}, {"title": "Compliance Audits"}, {"title": "Risk Management"}, {"title": "Vendor Security"}]},
                        {"title": "Cost Management", "lessons": [{"title": "FinOps Basics"}, {"title": "Cost Allocation"}, {"title": "Budget Alerts"}, {"title": "Optimization"}, {"title": "Usage Forecasting"}]},
                        {"title": "Advanced Networking", "lessons": [{"title": "Service Mesh"}, {"title": "mTLS"}, {"title": "Traffic Policies"}, {"title": "Ingress Controllers"}, {"title": "Edge Security"}]},
                        {"title": "Observability at Scale", "lessons": [{"title": "Log Aggregation"}, {"title": "High-cardinality Metrics"}, {"title": "Tracing at Scale"}, {"title": "Sampling"}, {"title": "Alert Tuning"}]},
                        {"title": "Leadership", "lessons": [{"title": "Roadmaps"}, {"title": "Mentoring"}, {"title": "Stakeholder Mgmt"}, {"title": "Hiring"}, {"title": "Runbooks"}]},
                        {"title": "Capstone", "lessons": [{"title": "Production Platform"}, {"title": "Security Review"}, {"title": "SRE Review"}, {"title": "Cost Review"}, {"title": "Launch Checklist"}]},
                    ],
                },
            ],
        }

    def _mobile_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "Mobile Fundamentals", "lessons": [{"title": "Platforms Overview"}, {"title": "UI Guidelines"}, {"title": "Navigation Patterns"}, {"title": "Layouts"}, {"title": "Touch Gestures"}]},
                        {"title": "Programming Basics", "lessons": [{"title": "Data Structures"}, {"title": "Async Programming"}, {"title": "State"}, {"title": "Error Handling"}, {"title": "Debugging"}]},
                        {"title": "UI Design Basics", "lessons": [{"title": "Typography"}, {"title": "Spacing"}, {"title": "Color"}, {"title": "Components"}, {"title": "Accessibility"}]},
                        {"title": "Tooling", "lessons": [{"title": "SDK Setup"}, {"title": "Emulators"}, {"title": "Build Tools"}, {"title": "Package Managers"}, {"title": "Git"}]},
                        {"title": "APIs Basics", "lessons": [{"title": "REST"}, {"title": "JSON"}, {"title": "Auth Tokens"}, {"title": "Errors"}, {"title": "Pagination"}]},
                        {"title": "Storage Basics", "lessons": [{"title": "Local Storage"}, {"title": "Secure Storage"}, {"title": "Files"}, {"title": "Caching"}, {"title": "Offline Data"}]},
                        {"title": "Testing Intro", "lessons": [{"title": "Unit Tests"}, {"title": "Widget/UI Tests"}, {"title": "Test Data"}, {"title": "Mocks"}, {"title": "Coverage"}]},
                        {"title": "Release Basics", "lessons": [{"title": "Signing"}, {"title": "Build Variants"}, {"title": "App Store Intro"}, {"title": "Versioning"}, {"title": "Changelogs"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "React Native Core", "lessons": [{"title": "Components"}, {"title": "Navigation"}, {"title": "State Mgmt"}, {"title": "Styling"}, {"title": "Performance Basics"}]},
                        {"title": "Flutter Core", "lessons": [{"title": "Widgets"}, {"title": "Layouts"}, {"title": "State Mgmt"}, {"title": "Navigation"}, {"title": "Animations"}]},
                        {"title": "Platform APIs", "lessons": [{"title": "Camera"}, {"title": "Location"}, {"title": "Notifications"}, {"title": "Permissions"}, {"title": "Files"}]},
                        {"title": "Networking", "lessons": [{"title": "HTTP Clients"}, {"title": "Auth Flows"}, {"title": "Retry Logic"}, {"title": "Caching"}, {"title": "Offline Mode"}]},
                        {"title": "State Management", "lessons": [{"title": "Local State"}, {"title": "Global State"}, {"title": "Async State"}, {"title": "Forms"}, {"title": "Validation"}]},
                        {"title": "UI/UX Patterns", "lessons": [{"title": "Lists"}, {"title": "Search"}, {"title": "Tabs"}, {"title": "Modals"}, {"title": "Empty States"}]},
                        {"title": "Testing Basics", "lessons": [{"title": "Unit Tests"}, {"title": "Integration Tests"}, {"title": "UI Tests"}, {"title": "Mocks"}, {"title": "CI Basics"}]},
                        {"title": "Beginner Projects", "lessons": [{"title": "Notes App"}, {"title": "Weather App"}, {"title": "Chat UI"}, {"title": "Fitness Tracker"}, {"title": "E-commerce UI"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Performance", "lessons": [{"title": "Profiling"}, {"title": "Render Optimization"}, {"title": "Image Optimization"}, {"title": "Memory"}, {"title": "Startup Time"}]},
                        {"title": "Architecture", "lessons": [{"title": "MVC/MVVM"}, {"title": "Clean Architecture"}, {"title": "Modules"}, {"title": "Dependency Injection"}, {"title": "Codegen"}]},
                        {"title": "Offline First", "lessons": [{"title": "Sync Strategies"}, {"title": "Conflict Resolution"}, {"title": "Local DBs"}, {"title": "Background Sync"}, {"title": "Caching"}]},
                        {"title": "Security", "lessons": [{"title": "Secure Storage"}, {"title": "HTTPS Pinning"}, {"title": "OAuth"}, {"title": "Biometrics"}, {"title": "Privacy"}]},
                        {"title": "Testing Advanced", "lessons": [{"title": "E2E Testing"}, {"title": "Device Farms"}, {"title": "Performance Tests"}, {"title": "Snapshots"}, {"title": "Coverage Reports"}]},
                        {"title": "Analytics", "lessons": [{"title": "Event Tracking"}, {"title": "Funnels"}, {"title": "Crash Reporting"}, {"title": "Feature Flags"}, {"title": "A/B Testing"}]},
                        {"title": "Release Process", "lessons": [{"title": "Store Listing"}, {"title": "Review Guidelines"}, {"title": "Phased Rollout"}, {"title": "Hotfixes"}, {"title": "Versioning"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "Marketplace App"}, {"title": "Media App"}, {"title": "Offline Maps"}, {"title": "Social Feed"}, {"title": "Payments UI"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "Advanced Performance", "lessons": [{"title": "Native Modules"}, {"title": "Bridge Optimization"}, {"title": "Frame Drops"}, {"title": "Memory Leaks"}, {"title": "Battery Usage"}]},
                        {"title": "Scalable Architecture", "lessons": [{"title": "Modularization"}, {"title": "Feature Flags"}, {"title": "Build Systems"}, {"title": "Monorepo"}, {"title": "Release Trains"}]},
                        {"title": "Platform Expertise", "lessons": [{"title": "iOS Internals"}, {"title": "Android Internals"}, {"title": "App Lifecycle"}, {"title": "Background Tasks"}, {"title": "Deep Links"}]},
                        {"title": "Security & Compliance", "lessons": [{"title": "Data Privacy"}, {"title": "App Attestation"}, {"title": "Secure APIs"}, {"title": "Compliance"}, {"title": "Audit Logs"}]},
                        {"title": "CI/CD & Automation", "lessons": [{"title": "Fastlane"}, {"title": "Build Pipelines"}, {"title": "Test Automation"}, {"title": "Signing Mgmt"}, {"title": "Release Automation"}]},
                        {"title": "Observability", "lessons": [{"title": "Crash Reporting"}, {"title": "Performance Monitoring"}, {"title": "User Analytics"}, {"title": "Log Aggregation"}, {"title": "Alerts"}]},
                        {"title": "Leadership", "lessons": [{"title": "Design Reviews"}, {"title": "Mentoring"}, {"title": "Roadmaps"}, {"title": "Stakeholder Mgmt"}, {"title": "Hiring"}]},
                        {"title": "Capstone", "lessons": [{"title": "Production App"}, {"title": "Performance Review"}, {"title": "Security Audit"}, {"title": "Store Launch"}, {"title": "Post-launch Ops"}]},
                    ],
                },
            ],
        }

    def _design_fallback(self, role):
        return {
            "role": role,
            "levels": [
                {
                    "title": "Foundations",
                    "modules": [
                        {"title": "UX Fundamentals", "lessons": [{"title": "User Needs"}, {"title": "Pain Points"}, {"title": "Problem Framing"}, {"title": "Jobs to Be Done"}, {"title": "UX Process"}]},
                        {"title": "UI Fundamentals", "lessons": [{"title": "Visual Hierarchy"}, {"title": "Color Theory"}, {"title": "Typography"}, {"title": "Layout & Grids"}, {"title": "Spacing"}]},
                        {"title": "Design Principles", "lessons": [{"title": "Consistency"}, {"title": "Affordances"}, {"title": "Feedback"}, {"title": "Constraints"}, {"title": "Discoverability"}]},
                        {"title": "Accessibility", "lessons": [{"title": "WCAG Basics"}, {"title": "Contrast"}, {"title": "Keyboard Nav"}, {"title": "Screen Readers"}, {"title": "Inclusive Design"}]},
                        {"title": "Information Architecture", "lessons": [{"title": "Sitemaps"}, {"title": "Navigation"}, {"title": "Labeling"}, {"title": "Content Models"}, {"title": "Findability"}]},
                        {"title": "Tools & Workflow", "lessons": [{"title": "Figma Basics"}, {"title": "Auto Layout"}, {"title": "Components"}, {"title": "Versioning"}, {"title": "Handoff"}]},
                        {"title": "Wireframing", "lessons": [{"title": "Low-fi Sketches"}, {"title": "Flows"}, {"title": "User Journeys"}, {"title": "Annotations"}, {"title": "Rapid Iteration"}]},
                        {"title": "Prototyping", "lessons": [{"title": "Interactive Prototypes"}, {"title": "Microinteractions"}, {"title": "Transitions"}, {"title": "Usability Prep"}, {"title": "Prototype Tools"}]},
                    ],
                },
                {
                    "title": "Beginner",
                    "modules": [
                        {"title": "User Research", "lessons": [{"title": "Interviews"}, {"title": "Surveys"}, {"title": "Observation"}, {"title": "Research Plans"}, {"title": "Synthesis"}]},
                        {"title": "Personas & JTBD", "lessons": [{"title": "Persona Creation"}, {"title": "JTBD Statements"}, {"title": "Needs Mapping"}, {"title": "Scenarios"}, {"title": "Empathy Maps"}]},
                        {"title": "Journey Mapping", "lessons": [{"title": "Touchpoints"}, {"title": "Pain Points"}, {"title": "Opportunities"}, {"title": "Service Blueprints"}, {"title": "Prioritization"}]},
                        {"title": "Interaction Design", "lessons": [{"title": "Navigation Patterns"}, {"title": "Forms UX"}, {"title": "Empty States"}, {"title": "Error States"}, {"title": "Feedback"}]},
                        {"title": "Content Design", "lessons": [{"title": "Microcopy"}, {"title": "Tone & Voice"}, {"title": "Labels"}, {"title": "Accessibility Copy"}, {"title": "Content Audits"}]},
                        {"title": "Design Systems", "lessons": [{"title": "Tokens"}, {"title": "Components"}, {"title": "Guidelines"}, {"title": "Documentation"}, {"title": "Governance"}]},
                        {"title": "Collaboration", "lessons": [{"title": "Working with Devs"}, {"title": "Design Reviews"}, {"title": "Specs"}, {"title": "Handoff"}, {"title": "Feedback Loops"}]},
                        {"title": "Beginner Projects", "lessons": [{"title": "Landing Page"}, {"title": "Signup Flow"}, {"title": "Dashboard"}, {"title": "Mobile App Flow"}, {"title": "Design Audit"}]},
                    ],
                },
                {
                    "title": "Intermediate",
                    "modules": [
                        {"title": "Usability Testing", "lessons": [{"title": "Test Plans"}, {"title": "Moderated Tests"}, {"title": "Unmoderated Tests"}, {"title": "Analysis"}, {"title": "Iteration"}]},
                        {"title": "Analytics & Metrics", "lessons": [{"title": "Event Tracking"}, {"title": "Funnels"}, {"title": "A/B Testing"}, {"title": "Cohorts"}, {"title": "KPIs"}]},
                        {"title": "Design Ops", "lessons": [{"title": "Design QA"}, {"title": "Design Tokens"}, {"title": "Libraries"}, {"title": "Contribution Model"}, {"title": "Versioning"}]},
                        {"title": "Systems Thinking", "lessons": [{"title": "Platform Design"}, {"title": "Scalability"}, {"title": "Consistency"}, {"title": "Constraints"}, {"title": "Governance"}]},
                        {"title": "Accessibility Advanced", "lessons": [{"title": "WCAG AA"}, {"title": "Screen Reader Testing"}, {"title": "Focus Order"}, {"title": "ARIA Patterns"}, {"title": "Inclusive UX"}]},
                        {"title": "Visual Polish", "lessons": [{"title": "Iconography"}, {"title": "Motion Design"}, {"title": "Illustrations"}, {"title": "Brand Systems"}, {"title": "UI Rhythm"}]},
                        {"title": "Research Synthesis", "lessons": [{"title": "Affinity Mapping"}, {"title": "Insight Prioritization"}, {"title": "Opportunity Trees"}, {"title": "Roadmaps"}, {"title": "Stakeholder Alignment"}]},
                        {"title": "Intermediate Projects", "lessons": [{"title": "SaaS Redesign"}, {"title": "Multi-step Checkout"}, {"title": "Design System Starter"}, {"title": "Mobile UX Overhaul"}, {"title": "Usability Study"}]},
                    ],
                },
                {
                    "title": "Advanced",
                    "modules": [
                        {"title": "Leadership", "lessons": [{"title": "Stakeholder Mgmt"}, {"title": "Design Strategy"}, {"title": "Roadmaps"}, {"title": "Mentoring"}, {"title": "Hiring Basics"}]},
                        {"title": "Product Strategy", "lessons": [{"title": "Vision & Principles"}, {"title": "Prioritization"}, {"title": "Experimentation"}, {"title": "Business Metrics"}, {"title": "Outcomes"}]},
                        {"title": "Advanced Research", "lessons": [{"title": "Mixed Methods"}, {"title": "Longitudinal Studies"}, {"title": "Ethics"}, {"title": "Research Ops"}, {"title": "Insight Reuse"}]},
                        {"title": "Design at Scale", "lessons": [{"title": "Multi-team Systems"}, {"title": "Governance"}, {"title": "Documentation"}, {"title": "Audit & Cleanup"}, {"title": "Tooling"}]},
                        {"title": "Cross-platform Design", "lessons": [{"title": "Responsive Systems"}, {"title": "Mobile vs Desktop"}, {"title": "Platform Patterns"}, {"title": "Consistency"}, {"title": "Design Tokens"}]},
                        {"title": "Experimentation", "lessons": [{"title": "A/B Test Design"}, {"title": "Success Metrics"}, {"title": "Analysis"}, {"title": "Iteration"}, {"title": "Ethics"}]},
                        {"title": "Career", "lessons": [{"title": "Portfolio Storytelling"}, {"title": "Case Studies"}, {"title": "Interview Prep"}, {"title": "Presentation Skills"}, {"title": "Personal Brand"}]},
                        {"title": "Capstone", "lessons": [{"title": "End-to-End Product"}, {"title": "Research Plan"}, {"title": "Design System"}, {"title": "Usability Testing"}, {"title": "Stakeholder Review"}]},
                    ],
                },
            ],
        }
