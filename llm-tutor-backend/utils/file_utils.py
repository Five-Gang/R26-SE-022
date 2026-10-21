import os
import shutil
from pathlib import Path
from typing import List, Optional


def ensure_directory_exists(directory: str) -> bool:
    """
    Create directory if it doesn't exist.
    
    Args:
        directory: Directory path
        
    Returns:
        True if directory exists or was created
    """
    try:
        os.makedirs(directory, exist_ok=True)
        return True
    except Exception as e:
        print(f"❌ Failed to create directory {directory}: {e}")
        return False


def file_exists(file_path: str) -> bool:
    """
    Check if a file exists.
    
    Args:
        file_path: Path to file
        
    Returns:
        True if file exists
    """
    return os.path.isfile(file_path)


def directory_exists(directory: str) -> bool:
    """
    Check if a directory exists.
    
    Args:
        directory: Directory path
        
    Returns:
        True if directory exists
    """
    return os.path.isdir(directory)


def get_file_size(file_path: str) -> int:
    """
    Get file size in bytes.
    
    Args:
        file_path: Path to file
        
    Returns:
        File size in bytes
    """
    if not file_exists(file_path):
        return 0
    return os.path.getsize(file_path)


def get_files_in_directory(directory: str, extension: Optional[str] = None) -> List[str]:
    """
    Get list of files in a directory.
    
    Args:
        directory: Directory path
        extension: File extension filter (e.g., '.pdf')
        
    Returns:
        List of file paths
    """
    if not directory_exists(directory):
        return []
    
    files = []
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path):
            if extension is None or filename.lower().endswith(extension.lower()):
                files.append(file_path)
    
    return files


def delete_file(file_path: str) -> bool:
    """
    Delete a file.
    
    Args:
        file_path: Path to file
        
    Returns:
        True if successful
    """
    try:
        if file_exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"❌ Failed to delete {file_path}: {e}")
        return False


def delete_directory(directory: str, recursive: bool = True) -> bool:
    """
    Delete a directory.
    
    Args:
        directory: Directory path
        recursive: If True, delete directory and contents
        
    Returns:
        True if successful
    """
    try:
        if directory_exists(directory):
            if recursive:
                shutil.rmtree(directory)
            else:
                os.rmdir(directory)
            return True
        return False
    except Exception as e:
        print(f"❌ Failed to delete {directory}: {e}")
        return False


def copy_file(src: str, dest: str) -> bool:
    """
    Copy a file.
    
    Args:
        src: Source file path
        dest: Destination file path
        
    Returns:
        True if successful
    """
    try:
        shutil.copy2(src, dest)
        return True
    except Exception as e:
        print(f"❌ Failed to copy {src} to {dest}: {e}")
        return False


def read_file_content(file_path: str, encoding: str = 'utf-8') -> Optional[str]:
    """
    Read file content.
    
    Args:
        file_path: Path to file
        encoding: File encoding
        
    Returns:
        File content or None if error
    """
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return f.read()
    except Exception as e:
        print(f"❌ Failed to read {file_path}: {e}")
        return None


def write_file_content(file_path: str, content: str, encoding: str = 'utf-8') -> bool:
    """
    Write content to file.
    
    Args:
        file_path: Path to file
        content: Content to write
        encoding: File encoding
        
    Returns:
        True if successful
    """
    try:
        with open(file_path, 'w', encoding=encoding) as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"❌ Failed to write to {file_path}: {e}")
        return False
