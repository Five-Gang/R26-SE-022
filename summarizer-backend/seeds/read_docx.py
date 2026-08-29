"""Print the rest of the docx to get the weekly schedule."""
import sys
sys.path.insert(0, ".")
from app.services.ingestion import DocxParser
parser = DocxParser()
result = parser.extract("seeds/modules/SE4030_ModuleOutline2 (2).docx")
print(result.full_text[8000:])
