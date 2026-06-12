import sys
import json
import pdfplumber


def extract_tables(pdf_path):
all_tables = []
with pdfplumber.open(pdf_path) as pdf:
for page_num, page in enumerate(pdf.pages):
tables = page.extract_tables()
for table in tables:
cleaned_table = []
for row in table:
cleaned_row = [(cell or '').strip().replace('\n', ' ') for cell in row]
if any(cell for cell in cleaned_row):
cleaned_table.append(cleaned_row)
if len(cleaned_table) > 0:
all_tables.append(cleaned_table)
return all_tables


if __name__ == '__main__':
pdf_path = sys.argv[1]
tables = extract_tables(pdf_path)
print(json.dumps(tables))

