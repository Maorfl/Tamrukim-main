import easyocr
from pdf2image import convert_from_path
import re
import sys
import os
import numpy as np
import json
import pdfplumber

def extract_numbers(pdf_path):
    found_numbers = set()
    # Regex: Match 8-digit numbers starting with 6 or 8
    eight_digit_regex = r'\b[68]\d{7}\b'

    # Step 1: Fast Text Extraction
    sys.stderr.write("Step 1: Fast Text Extraction...\n")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    matches = re.findall(eight_digit_regex, text)
                    found_numbers.update(matches)
    except Exception as e:
        sys.stderr.write(f"Fast extraction failed: {e}\n")

    if found_numbers:
        sys.stderr.write(f"Success! Found {len(found_numbers)} items via Text Layer.\n")
        return list(found_numbers)

    # Step 2: OCR with Cropping
    sys.stderr.write("Step 2: Scanned PDF detected. Starting Cropped OCR...\n")
    try:
        images = convert_from_path(pdf_path, dpi=150)
        reader = easyocr.Reader(['en'], gpu=True) 

        for i, img in enumerate(images):
            sys.stderr.write(f"Processing page {i+1}...\n")
            
            w, h = img.size
            # Crop: cut 5% left, 40% top, keep width till 70%, keep height till 80%
            cropped_img = img.crop((0.05 * w, 0.4 * h, 0.7 * w, 0.8 * h))
            
            image_np = np.array(cropped_img)
            
            results = reader.readtext(image_np, detail=0, paragraph=True, decoder='greedy')
            text_content = " ".join(results)
            
            matches = re.findall(eight_digit_regex, text_content)
            found_numbers.update(matches)
            
    except Exception as e:
        sys.stderr.write(f"OCR Error: {e}\n")

    return list(found_numbers)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("[]")
    else:
        path = sys.argv[1].strip('"').strip("'")
        if os.path.exists(path):
            result = extract_numbers(path)
            print(json.dumps(result))
        else:
            sys.stderr.write("File not found\n")
            print("[]")