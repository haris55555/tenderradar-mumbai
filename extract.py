import sys,json,pdfplumber;pdf=pdfplumber.open(sys.argv[1]);out=[];[out.extend([t for t in (p.extract_tables() or []) if t]) or p.flush_cache() for p in pdf.pages];pdf.close();print(json.dumps(out))
