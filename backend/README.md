# Movie Recommendation System Backend

## Project Structure
```
backend/
├── app/                    # Main application package
│   ├── __init__.py
│   ├── api/               # API endpoints
│   │   ├── __init__.py
│   │   ├── routes.py      # API routes
│   │   └── models.py      # API data models
│   ├── core/              # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py      # Configuration settings
│   │   └── logging.py     # Logging setup
│   ├── data/              # Data processing
│   │   ├── __init__.py
│   │   └── processor.py   # Data loading and preprocessing
│   └── models/            # Recommendation models
│       ├── __init__.py
│       ├── base.py        # Base model class
│       ├── content.py     # Content-based model
│       ├── collaborative.py # Collaborative filtering model
│       └── hybrid.py      # Hybrid model
├── tests/                 # Test files
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_data.py
│   └── test_models.py
├── scripts/               # Utility scripts
│   ├── train.py          # Model training script
│   └── evaluate.py       # Model evaluation script
├── saved_models/         # Saved model files
├── logs/                 # Log files
├── requirements.txt      # Project dependencies
└── main.py              # Application entry point
```

## Setup and Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Train the model:
```bash
python scripts/train.py
```

2. Start the API server:
```bash
python main.py
```

The API will be available at http://localhost:8000

## API Documentation

Once the server is running, visit:
- API documentation: http://localhost:8000/docs
- Alternative documentation: http://localhost:8000/redoc 