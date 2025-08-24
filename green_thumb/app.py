import os
from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from flask_dance.contrib.google import make_google_blueprint, google
import google.generativeai as genai
from inference_sdk import InferenceHTTPClient
import requests

# --- App Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-that-should-be-changed'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Google OAuth Configuration ---
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
app.config['GOOGLE_OAUTH_CLIENT_ID'] = 'your_google_client_id_here'
app.config['GOOGLE_OAUTH_CLIENT_SECRET'] = 'your_google_client_secret_here'

google_bp = make_google_blueprint(scope=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"], redirect_to='google_login_callback')
app.register_blueprint(google_bp, url_prefix="/login")

# --- Database Setup ---
db = SQLAlchemy(app)

class User(UserMixin, db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)

class SearchHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), db.ForeignKey('user.id'), nullable=False)
    crop_name = db.Column(db.String(100), nullable=False)
    generated_content = db.Column(db.Text, nullable=False)
    user = db.relationship('User', backref=db.backref('searches', lazy=True))

# --- Login Manager Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

# --- AI Models Configuration ---
# Gemini AI
API_KEY = "your_gemini_api_key_here" # Add your Gemini API key here
if not API_KEY or API_KEY == "YOUR_API_KEY_HERE":
    print("ERROR: Gemini API Key is not set in app.py")
    exit()
genai.configure(api_key=API_KEY)
SCHEMA = { "type": "OBJECT", "properties": { "idealSeason": {"type": "STRING"}, "temperature": {"type": "OBJECT", "properties": {"germination": {"type": "STRING"}, "vegetative": {"type": "STRING"}, "fruiting": {"type": "STRING"}}}, "humidity": {"type": "STRING"}, "light": {"type": "OBJECT", "properties": {"duration": {"type": "STRING"}, "dli": {"type": "STRING"}}}, "soil": {"type": "OBJECT", "properties": {"composition": {"type": "STRING"}, "ph": {"type": "STRING"}}}, "spacing": {"type": "STRING"}, "timeline": {"type": "STRING"}, "pestsAndDiseases": {"type": "STRING"} } }
generation_config = { "response_mime_type": "application/json", "response_schema": SCHEMA }
gemini_model = genai.GenerativeModel("gemini-2.0-flash", generation_config=generation_config)

# Roboflow AI
# WARNING: Storing API keys directly in code is not recommended for production.
ROBOFLOW_API_KEY = "" 
MODEL_ID = "leaf-disease-detection-mbzz4/1"
roboflow_client = InferenceHTTPClient(api_url="https://serverless.roboflow.com", api_key=ROBOFLOW_API_KEY)

# --- Main Page Routes ---

@app.route('/login')
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/google/authorized')
def google_login_callback():
    if not google.authorized:
        return redirect(url_for("google.login"))
    resp = google.get("/oauth2/v2/userinfo")
    assert resp.ok, resp.text
    user_info = resp.json()
    user = User.query.get(user_info['id'])
    if not user:
        user = User(id=user_info['id'], name=user_info['name'], email=user_info['email'])
        db.session.add(user)
        db.session.commit()
    login_user(user)
    return redirect(url_for('index'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html', user_name=current_user.name)

@app.route('/detector', methods=['GET', 'POST'])
@login_required
def detector():
    if request.method == 'POST':
        if 'file' not in request.files:
            return render_template('detector.html', user_name=current_user.name, error="No file part in the request.")
        file = request.files['file']
        if file.filename == '':
            return render_template('detector.html', user_name=current_user.name, error="No file selected for upload.")
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
                    raise Exception(f"Roboflow error {response.status_code}: {response.text}")
                
                annotated_filename = "annotated_" + filename
                annotated_path = os.path.join(app.config['UPLOAD_FOLDER'], annotated_filename)
                with open(annotated_path, "wb") as f:
                    f.write(response.content)

                # Get predictions (JSON)
                result = roboflow_client.infer(filepath, model_id=MODEL_ID)
                predictions = result.get('predictions', [])

                return render_template(
                    'detector.html',
                    user_name=current_user.name,
                    filename=filename,
                    results=predictions,
                    annotated_image_url=url_for('static', filename='uploads/' + annotated_filename)
                )
            except Exception as e:
                return render_template(
                    'detector.html',
                    user_name=current_user.name,
                    filename=filename,
                    error=f"An error occurred during detection: {e}"
                )
    return render_template('detector.html', user_name=current_user.name)

# --- API Routes for AI Advisor ---

@app.route('/api/crop-profile', methods=['POST'])
@login_required
def get_crop_profile():
    data = request.get_json()
    if not data or 'crop_name' not in data:
        return jsonify({'error': 'Missing crop_name in request body'}), 400
    
    user_input = data['crop_name'].strip().lower()
    
    # Check if it's a greeting
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
    if user_input in greetings or any(greeting in user_input for greeting in greetings):
        response_data = {
            'type': 'greeting',
            'message': 'Hello! I\'m Green Thumb AI, your agricultural assistant. I can help you with information about growing crops, farming techniques, plant care, and agricultural advice. What crop would you like to learn about today?'
        }
        return jsonify(response_data)
    
    # Check if it's a general question or non-farming related
    farming_keywords = ['plant', 'crop', 'grow', 'seed', 'soil', 'water', 'fertilizer', 'harvest', 'farm', 'agriculture', 'garden', 'vegetable', 'fruit', 'flower', 'tree', 'greenhouse', 'organic', 'pest', 'disease', 'irrigation', 'cultivation', 'planting', 'farming']
    
    # Common crop names and plants for validation
    known_crops = [
        'tomato', 'tomatoes', 'potato', 'potatoes', 'lettuce', 'spinach', 'carrot', 'carrots', 'onion', 'onions',
        'garlic', 'cucumber', 'cucumbers', 'pepper', 'peppers', 'chili', 'eggplant', 'broccoli', 'cauliflower',
        'cabbage', 'kale', 'chard', 'beet', 'beets', 'radish', 'turnip', 'parsnip', 'celery', 'leek', 'scallion',
        'corn', 'maize', 'wheat', 'rice', 'barley', 'oats', 'rye', 'quinoa', 'bean', 'beans', 'pea', 'peas',
        'lentil', 'chickpea', 'soybean', 'peanut', 'sunflower', 'basil', 'parsley', 'cilantro', 'dill', 'oregano',
        'thyme', 'rosemary', 'sage', 'mint', 'chive', 'fennel', 'strawberry', 'blueberry', 'raspberry', 'blackberry',
        'grape', 'apple', 'pear', 'cherry', 'peach', 'plum', 'citrus', 'lemon', 'lime', 'orange', 'grapefruit',
        'mango', 'avocado', 'banana', 'melon', 'watermelon', 'cantaloupe', 'pumpkin', 'squash', 'zucchini',
        'okra', 'artichoke', 'asparagus', 'rhubarb', 'ginger', 'turmeric', 'sweet potato', 'yam', 'cassava',
        'hemp', 'flax', 'cotton', 'tobacco', 'alfalfa', 'clover', 'grass', 'hay', 'pasture', 'fodder'
    ]
    
    # Check if input contains farming keywords OR is a known crop
    has_farming_keywords = any(keyword in user_input for keyword in farming_keywords)
    is_known_crop = user_input in known_crops or any(crop in user_input for crop in known_crops)
    
    # Check for invalid patterns (random strings, numbers, special characters)
    has_numbers = any(char.isdigit() for char in user_input)
    has_special_chars = any(char in user_input for char in ['@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '/', '~', '`'])
    has_question_words = any(word in user_input for word in ['?', '!', 'how', 'what', 'when', 'where', 'why', 'can you', 'tell me', 'explain'])
    is_too_long = len(user_input) > 25
    
    # Check if it looks like random text (no vowels pattern or weird letter combinations)
    vowels = 'aeiou'
    consonants = 'bcdfghjklmnpqrstvwxyz'
    vowel_count = sum(1 for char in user_input if char in vowels)
    consonant_count = sum(1 for char in user_input if char in consonants)
    
    # If it's not a known crop and doesn't contain farming keywords, it's likely invalid
    if not has_farming_keywords and not is_known_crop:
        # Additional checks for random strings
        if (has_numbers or has_special_chars or has_question_words or is_too_long or 
            len(user_input) < 2 or 
            (len(user_input) > 6 and vowel_count < 2) or  # Long words should have vowels
            (consonant_count > len(user_input) * 0.8)):   # Too many consonants
            response_data = {
                'type': 'validation_error',
                'message': 'Please enter a valid crop name or farming-related query. I specialize in providing information about growing crops, plants, and agricultural practices. For example, try "tomato", "lettuce", "wheat", or "cucumber".'
            }
            return jsonify(response_data)
    
    # If it looks like a valid crop or farming query, proceed with generating crop profile
    crop_name = data['crop_name']
    prompt = f'Generate a detailed crop profile for growing "{crop_name}" in a greenhouse. Respond with a JSON object that strictly follows the provided schema.'
    try:
        response = gemini_model.generate_content(prompt)
        response_text = response.text
        new_search = SearchHistory(user_id=current_user.id, crop_name=crop_name, generated_content=response_text)
        db.session.add(new_search)
        db.session.commit()
        return jsonify(response_text)
    except Exception as e:
        return jsonify({'error': f'Failed to generate profile: {e}'}), 500

@app.route('/api/history')
@login_required
def get_history():
    history = SearchHistory.query.filter_by(user_id=current_user.id).order_by(SearchHistory.id.desc()).limit(15).all()
    return jsonify([{'id': item.id, 'crop_name': item.crop_name} for item in history])

@app.route('/api/history/<int:history_id>')
@login_required
def get_history_item(history_id):
    history_item = SearchHistory.query.filter_by(id=history_id, user_id=current_user.id).first_or_404()
    return jsonify({'crop_name': history_item.crop_name, 'content': history_item.generated_content})

@app.route('/api/history/<int:history_id>/delete', methods=['DELETE'])
@login_required
def delete_history_item(history_id):
    try:
        history_item = SearchHistory.query.filter_by(id=history_id, user_id=current_user.id).first()
        if not history_item:
            return jsonify({'success': False, 'message': 'History item not found'}), 404
        
        db.session.delete(history_item)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/history/delete', methods=['POST'])
@login_required
def delete_history():
    try:
        SearchHistory.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Main Execution ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
