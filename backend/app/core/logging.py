import logging
from pathlib import Path
from .config import settings

def setup_logging(name: str = None) -> logging.Logger:
    """
    Setup logging configuration
    Args:
        name: Logger name (optional)
    Returns:
        Logger instance
    """
    # Create logs directory if it doesn't exist
    settings.LOGS_PATH.mkdir(parents=True, exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(name or __name__)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Create formatters
    file_formatter = logging.Formatter(settings.LOG_FORMAT)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Create handlers
    file_handler = logging.FileHandler(
        settings.LOGS_PATH / f"{name or 'app'}.log"
    )
    file_handler.setFormatter(file_formatter)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Create default logger
logger = setup_logging('app') 