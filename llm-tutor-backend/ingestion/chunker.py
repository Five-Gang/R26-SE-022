import re
import nltk
nltk.download('punkt')
from typing import List, Dict
from nltk.tokenize import word_tokenize

# If NLTK tokenizer is not downloaded, uncomment:
# import nltk
# nltk.download('punkt')


def clean_text(text: str) -> str:
    """
    Basic text cleaning:
    - Remove extra spaces
    - Remove weird characters
    - Normalize newlines
    """
    text = re.sub(r'\s+', ' ', text)  # collapse multiple spaces
    text = text.replace("\n", " ").strip()
    return text


def chunk_text(
    text: str,
    chunk_size: int = 300,
    chunk_overlap: int = 50
) -> List[str]:
    """
    Splits text into overlapping chunks based on token count.

    Args:
        text (str): The full extracted text from a PDF.
        chunk_size (int): Number of tokens per chunk.
        chunk_overlap (int): Number of overlapping tokens between chunks.

    Returns:
        List[str]: List of text chunks.
    """

    cleaned = clean_text(text)
    tokens = word_tokenize(cleaned)

    chunks = []
    start = 0
    total_tokens = len(tokens)

    while start < total_tokens:
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunk_text = " ".join(chunk_tokens)

        chunks.append(chunk_text)

        # Move forward by chunk_size - overlap
        start += chunk_size - chunk_overlap

    return chunks


def chunk_documents(documents: List[Dict], chunk_size=300, chunk_overlap=50):
    """
    Chunk multiple documents (PDFs).

    Args:
        documents (List[Dict]): Output from pdf_loader.load_all_pdfs()
        chunk_size (int): Tokens per chunk
        chunk_overlap (int): Overlap tokens

    Returns:
        List[Dict]: List of chunk dictionaries with metadata
    """

    chunked_docs = []

    for doc in documents:
        filename = doc["filename"]
        content = doc["content"]

        chunks = chunk_text(content, chunk_size, chunk_overlap)

        for i, chunk in enumerate(chunks):
            chunked_docs.append({
                "filename": filename,
                "chunk_id": f"{filename}_chunk_{i}",
                "text": chunk
            })

    return chunked_docs
