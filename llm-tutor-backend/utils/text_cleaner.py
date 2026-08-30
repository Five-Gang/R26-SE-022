import re
import string
from typing import List


def remove_extra_whitespace(text: str) -> str:
    """
    Remove extra whitespace and normalize newlines.
    
    Args:
        text: Input text
        
    Returns:
        Cleaned text
    """
    text = re.sub(r'\s+', ' ', text)  # collapse multiple spaces
    text = text.replace("\n", " ").strip()
    return text


def remove_special_characters(text: str, keep_punctuation: bool = True) -> str:
    """
    Remove special characters from text.
    
    Args:
        text: Input text
        keep_punctuation: Whether to keep basic punctuation
        
    Returns:
        Cleaned text
    """
    if not keep_punctuation:
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    else:
        # Keep alphanumeric, spaces, and basic punctuation
        text = re.sub(r'[^a-zA-Z0-9\s.,!?;:\'\"-]', '', text)
    return text


def lowercase_text(text: str) -> str:
    """
    Convert text to lowercase.
    
    Args:
        text: Input text
        
    Returns:
        Lowercase text
    """
    return text.lower()


def remove_urls(text: str) -> str:
    """
    Remove URLs from text.
    
    Args:
        text: Input text
        
    Returns:
        Text without URLs
    """
    url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
    return re.sub(url_pattern, '', text)


def remove_emails(text: str) -> str:
    """
    Remove email addresses from text.
    
    Args:
        text: Input text
        
    Returns:
        Text without emails
    """
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.sub(email_pattern, '', text)


def clean_text(text: str, aggressive: bool = False) -> str:
    """
    Comprehensive text cleaning.
    
    Args:
        text: Input text
        aggressive: If True, removes more characters
        
    Returns:
        Cleaned text
    """
    # Remove URLs and emails
    text = remove_urls(text)
    text = remove_emails(text)
    
    # Remove extra whitespace
    text = remove_extra_whitespace(text)
    
    # Optionally remove special characters
    if aggressive:
        text = remove_special_characters(text, keep_punctuation=False)
    
    return text


def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences.
    
    Args:
        text: Input text
        
    Returns:
        List of sentences
    """
    # Simple sentence split on periods, exclamation, question marks
    sentence_pattern = r'(?<=[.!?])\s+'
    sentences = re.split(sentence_pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def truncate_text(text: str, max_length: int) -> str:
    """
    Truncate text to maximum length.
    
    Args:
        text: Input text
        max_length: Maximum length
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."
