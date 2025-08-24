from flask import Flask, request, render_template_string, url_for
from inference_sdk import InferenceHTTPClient
import requests
import os

app = Flask(__name__)

# Roboflow client setup
ROBOFLOW_API_KEY = ""
MODEL_ID = "leaf-disease-detection-mbzz4/1"
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=ROBOFLOW_API_KEY
)

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

HTML_TEMPLATE = """
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Plant Disease Detector 🌿</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }
        .container { max-width: 800px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        h1, h2 { color: #2c3e50; text-align: center; margin-bottom: 25px; }
        form { text-align: center; margin-bottom: 30px; }
        input[type="file"] { border: 1px solid #ccc; padding: 10px; border-radius: 5px; margin-right: 10px; }
        input[type="submit"] { background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; }
        input[type="submit"]:hover { background-color: #218838; }
        .image-display { text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .image-display img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 10px; }
        .results { margin-top: 20px; }
        .results h3 { color: #007bff; margin-bottom: 15px; text-align: center;}
        .results ul { list-style: none; padding: 0; }
        .results li { background-color: #e9ecef; margin-bottom: 10px; padding: 10px 15px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; }
        .results li strong { color: #3498db; }
        .error-message { color: red; text-align: center; margin-top: 20px; }
        .no-detection { text-align: center; color: #6c757d; font-style: italic; margin-top: 20px;}
    </style>
</head>
<body>
    <div class="container">
        <h1>Plant Disease Detector 🌿</h1>
        <form method=post enctype=multipart/form-data>
            <input type=file name=file accept="image/*">
            <input type=submit value="Analyze Image">
        </form>

        {% if filename %}
        <div class="image-display">
            <h2>Uploaded Image:</h2>
            <img src="{{ url_for('static', filename='uploads/' + filename) }}" alt="Uploaded Plant Image">
        </div>
        {% endif %}

        {% if annotated_image_url %}
        <div class="image-display">
            <h2>Predicted Output:</h2>
            <img src="{{ annotated_image_url }}" alt="Annotated Image">
        </div>
        {% endif %}

        {% if results %}
        <div class="results">
            <h3>Prediction Results:</h3>
            <ul>
            {% for pred in results %}
                <li>
                    <strong>{{ pred['class'] }}</strong>
                    <span>Confidence: {{ pred['confidence']|round(2) * 100 }}%</span>
                </li>
            {% endfor %}
            </ul>
        </div>
        {% elif filename and not results %}
        <p class="no-detection">🤔 No specific diseases detected, or confidence too low. The plant might be healthy, or the image quality could be a factor.</p>
        {% endif %}

        {% if error %}
        <p class="error-message">🚨 Error: {{ error }}</p>
        {% endif %}
    </div>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            return render_template_string(HTML_TEMPLATE, error="No file part in the request.")
        file = request.files['file']
        if file.filename == '':
            return render_template_string(HTML_TEMPLATE, error="No file selected for upload.")
        if file:
            filename = file.filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            try:
                # Get annotated image from Roboflow
                annotate_url = f"https://detect.roboflow.com/{MODEL_ID}?api_key={ROBOFLOW_API_KEY}&format=image"
                with open(filepath, "rb") as img_file:
                    response = requests.post(annotate_url, files={"file": img_file})

                if response.status_code != 200:
                    raise Exception(f"Roboflow error {response.status_code}")

                annotated_filename = "annotated_" + filename
                annotated_path = os.path.join(app.config['UPLOAD_FOLDER'], annotated_filename)
                with open(annotated_path, "wb") as f:
                    f.write(response.content)

                # Get predictions (JSON)
                result = CLIENT.infer(filepath, model_id=MODEL_ID)
                predictions = result.get('predictions', [])

                return render_template_string(
                    HTML_TEMPLATE,
                    filename=filename,
                    results=predictions,
                    annotated_image_url=url_for('static', filename='uploads/' + annotated_filename)
                )
            except Exception as e:
                return render_template_string(
                    HTML_TEMPLATE,
                    filename=filename,
                    error=f"An error occurred during detection: {e}. Please try again."
                )
    return render_template_string(HTML_TEMPLATE)

if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)
