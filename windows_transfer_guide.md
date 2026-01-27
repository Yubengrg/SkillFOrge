# skillForge Windows Migration Guide

This guide provides step-by-step instructions for migrating the **skillForge** project from macOS to Windows. Follow these steps to ensure all features, including AI quiz generation and Speech-to-Text, work correctly.

---

## 1. Prerequisites (Install these first)

Before transferring the code, install the following software on your Windows machine:

1.  **Python 3.13+**: Download from [python.org](https://www.python.org/downloads/windows/). 
    > [!IMPORTANT]
    > During installation, check the box: **"Add Python to PATH"**.
2.  **Node.js (LTS)**: Download from [nodejs.org](https://nodejs.org/).
3.  **MySQL Server & Workbench**: Download the [MySQL Installer](https://dev.mysql.com/downloads/installer/).
4.  **Git**: Download from [git-scm.com](https://git-scm.com/download/win).
5.  **FFmpeg**: 
    - Required for Speech-to-Text.
    - Download the "essentials" build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
    - Extract and add the `bin` folder to your Windows **System Environment Variables (PATH)**.
6.  **Ollama**:
    - Required for AI quizzes.
    - Download from [ollama.com](https://ollama.com/download/windows).

---

## 2. Transferring the Project

1.  **ZIP Method**: 
    - Archive the `skillForge` folder on your Mac (exclude `.venv`, `node_modules`, and `__pycache__`).
    - Copy the ZIP to your Windows machine and extract it.
2.  **Git Method**:
    - Push your code to a repository (GitHub/GitLab/Bitbucket).
    - On Windows, run: `git clone <your-repo-url>`.

---

## 3. Database Setup (MySQL)

1.  Open **MySQL Workbench** or use the command line.
2.  Create the database:
    ```sql
    CREATE DATABASE skillforge_db;
    ```
3.  Ensure the credentials in `skillForge/settings.py` match your Windows MySQL setup:
    - **NAME**: `skillforge_db`
    - **USER**: `admin` (or your user)
    - **PASSWORD**: `admin` (or your password)
    - **HOST**: `127.0.0.1`
    - **PORT**: `3306`

---

## 4. Backend Setup (Django)

1.  Open **PowerShell** or **Command Prompt** in the project root.
2.  Create a fresh virtual environment:
    ```powershell
    python -m venv .venv
    ```
3.  Activate it:
    - **PowerShell**: `./.venv/Scripts/Activate.ps1`
    - **CMD**: `.\.venv\Scripts\activate`
4.  Install dependencies:
    ```powershell
    pip install -r requirements.txt
    ```
5.  Run Migrations:
    ```powershell
    python manage.py migrate
    ```
6.  (Optional) Create a superuser:
    ```powershell
    python manage.py createsuperuser
    ```

---

## 5. Frontend Setup (React/Vite)

1.  Open another terminal in the `frontend` folder.
2.  Install packages:
    ```powershell
    npm install
    ```
3.  Check the `frontend/.env` file. Ensure `VITE_API_URL` points to your backend (default: `http://localhost:8000/api`).

---

## 6. AI Services Configuration

### Ollama (Quizzes)
1.  Open a terminal and run Ollama:
    ```powershell
    ollama run llama3.2
    ```
    (This downloads the model if you don't have it).

### FFmpeg (STT)
1.  Verify FFmpeg is in your path by running:
    ```powershell
    ffmpeg -version
    ```
2.  If it returns an error, follow the PATH setup in step 1.

---

## 7. Running the Application

### Start Backend
In the root directory (with `.venv` active):
```powershell
python manage.py runserver
```

### Start Frontend
In the `frontend` directory:
```powershell
npm run dev
```

---

## Troubleshooting Tips
- **MySQL Connection**: If you get a "Library not loaded" error, ensure you have installed the `mysqlclient` prerequisite (usually `pip install PyMySQL` or the MySQL connector).
- **CORS Errors**: Check `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in `settings.py`.
- **Media Files**: Your uploaded videos on Mac are in the `media/` folder. Ensure you copy this folder if you want to keep existing lesson videos.
