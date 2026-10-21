import os
from typing import List, Dict
from PyPDF2 import PdfReader


def load_pdf(file_path: str) -> str:
    """
    Load a single PDF file and extract its text.

    Args:
        file_path (str): Path to the PDF file.

    Returns:
        str: Extracted text from the PDF.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF not found: {file_path}")

    reader = PdfReader(file_path)
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    return text.strip()


def load_all_pdfs(pdf_folder: str) -> List[Dict]:
    """
    Load all PDF files inside a folder and return a list of documents.

    Args:
        pdf_folder (str): Path to the folder containing PDFs.

    Returns:
        List[Dict]: List of dictionaries containing filename and extracted text.
    """
    if not os.path.exists(pdf_folder):
        raise FileNotFoundError(f"PDF folder does not exist: {pdf_folder}")

    documents = []
    pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf")]

    if not pdf_files:
        print("⚠️ No PDF files found in:", pdf_folder)

    for pdf in pdf_files:
        file_path = os.path.join(pdf_folder, pdf)
        print(f"📄 Loading PDF: {pdf}")

        try:
            text = load_pdf(file_path)
            documents.append({
                "filename": pdf,
                "content": text
            })
        except Exception as e:
            print(f"❌ Error reading {pdf}: {e}")

    return documents