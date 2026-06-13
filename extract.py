import sys,json,pdfplumber;pdf=pdfplumber.open(sys.argv[1]);out={'mode':'text','pages':[p.extract_text() or '' for p in pdf.pages]};pdf.close();print(json.dumps(out))
