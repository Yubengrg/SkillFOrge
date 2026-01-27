# Technical Guide: Manual Video Uploads & AI Integration

This document explains how the manual video upload feature works in the **skillForge** project, including the automated AI processing that follows.

---

## 1. The Instructor Upload Flow

### Frontend UI (`LessonManagement.jsx`)
- Instructors can choose between **YouTube/Vimeo URL** or **Upload Video File**.
- The file upload mode accepts common formats like `.mp4`, `.webm`, and `.mov`.
- There is a client-side limit of **500MB** to ensure stability.
- When the "Add Lesson" button is clicked, the file is sent to the backend using a `FormData` object via a `POST` request.

### Backend API (`instructor_api_views.py`)
- The `add_lesson` view handles the `multipart/form-data` request.
- It validates the file extension and size against settings in `skillForge/settings.py`.
- The file is saved to the `media/course_videos/` directory.

---

## 2. Automated AI Processing

Once the video is saved, the system immediately begins background processing (currently synchronous for development, but ready for Celery):

### 🎙️ Speech-to-Text (STT)
- **Location**: `learning/quiz_tasks.py` -> `get_lesson_transcript`
- **Logic**: If a `video_file` exists, the system uses the `TranscriptExtractor`.
- **Engine**: Local **OpenAI Whisper** model.
- **Process**: It extracts the audio from your uploaded video and generates a text transcript. This transcript is then saved directly to the lesson's `video_transcript` field.

### 📝 Quiz Generation
- **Location**: `learning/ai_services.py` -> `QuizGenerator`
- **Logic**: Once the transcript is available, the system triggers the quiz generator.
- **Engine**: Local **Ollama** running the `llama3.2` model.
- **Process**: The AI reads the transcript, identifies key learning objectives, and generates multiple-choice questions with explanations.

---

## 3. Student Playback

### Video Rendering
- In `CourseLearningPage.jsx`, the system detects the video source.
- For uploaded files (`video_source: "upload"`), it uses a standard HTML5 `<video>` player pointing to your local media URL.

### Progress Tracking
- Student watch time is tracked in the `LessonProgress` model.
- The next lesson stays locked until the student passes the AI-generated quiz, ensuring they actually learned the material from your uploaded video.

---

## 💡 Best Practices for Manual Uploads

1. **Audio Quality**: Ensure the video has clear audio; this significantly improves the accuracy of the Whisper STT.
2. **File Size**: While the limit is 500MB, smaller files (under 100MB) will process much faster for STT and Quiz generation.
3. **Draft Mode**: If you want to review the AI-generated quiz before students see it, upload your lesson in **Draft** mode first.
