import sys,json,pdfplumber; pdf=pdfplumber.open(sys.argv[1]); tables=[t for p in pdf.pages for t in p.extract_tables()]; print(json.dumps(tables))
