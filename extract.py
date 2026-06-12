import sys
import json
import pdfplumber

def extract_tables(pdf_path):
  pdf = pdfplumber.open(pdf_path)
  all_tables = []
  for page in pdf.pages:
    tables = page.extract_tables()
    for table in tables:
      all_tables.append(table)
  pdf.close()
  return all_tables

pdf_path = sys.argv[1]
result = extract_tables(pdf_path)
print(json.dumps(result))

