
import sys

try:
    with open('public/docs/BNCC_EI_EF_110518_versaofinal_site.pdf', 'rb') as f:
        content = f.read(100)
        print(f"Successfully opened PDF. First 100 bytes: {content[:20]}...")
except Exception as e:
    print(f"Error opening PDF: {e}")
