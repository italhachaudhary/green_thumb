# GreenAI Workspace

This workspace contains two main projects:

- **green_thumb/**: A web application for plant disease detection and management.
- **Plant Disease/**: A supporting project for plant disease image processing and uploads.

---

## green_thumb

### Overview

A Flask-based web application that allows users to upload plant images, detect diseases, and view results. It features user authentication, image annotation, and a simple database for storing results.

### Directory Structure

```text
green_thumb/
├── app.py                # Main Flask application
├── requirements.txt      # Python dependencies
├── api.txt               # API documentation or notes
├── static/
│   ├── css/
│   │   └── style.css     # Stylesheets
│   ├── js/
│   │   └── global.js     # JavaScript files
│   └── uploads/          # Uploaded and annotated images
├── templates/
│   ├── base.html         # Base template
│   ├── detector.html     # Disease detector page
│   ├── index.html        # Home page
│   └── login.html        # Login page
└── instance/
        └── database.db       # SQLite database
```

### How to Run

1. Install dependencies:

     ```powershell
     pip install -r requirements.txt
     ```

2. Start the Flask app:

     ```powershell
     python app.py
     ```

3. Open your browser and go to `http://127.0.0.1:5000/`

---


## API Keys & Third-Party Credentials

**Important:** API keys, Google login secrets, RainbowFlow API keys, and project IDs should NOT be committed to version control (e.g., GitHub). If you are running this project locally, you must manually add these credentials in the code where required.

**Where to put credentials:**

- Place your API keys, Google login secret, Google project ID, and RainbowFlow API key in the appropriate variable assignments in the code files (for example, in `app.py` inside the `green_thumb/` folder).
- Look for comments or placeholder variables such as:
        - `API_KEY = "your_api_key_here"`
        - `GOOGLE_CLIENT_SECRET = "your_google_client_secret_here"`
        - `GOOGLE_PROJECT_ID = "your_google_project_id_here"`
        - `RAINBOWFLOW_API_KEY = "your_rainbowflow_api_key_here"`
        and replace them with your actual values.
- Do not share or commit your API keys, secrets, or project IDs to public repositories.

---

## Plant Disease

### Overview

Contains additional resources and static files for plant disease image uploads and annotation.

### Directory Structure

```text
Plant Disease/
├── app.py                # (If present) Additional scripts or utilities
├── api.txt               # API documentation or notes
└── static/
        └── uploads/          # Plant disease images
```

---

## Features

- Upload plant images for disease detection
- Annotated results and image storage
- User authentication (login page)
- Simple web interface with custom CSS and JS

---

## Requirements

- Python 3.8+
- Flask
- See `requirements.txt` for full list

---

## License

This project is for educational and research purposes.
