import json
import time
from deep_translator import GoogleTranslator

# Supported languages from your list
NEW_LANGUAGES = ['ja', 'el', 'ko', 'id', 'vi', 'ms', 'iw', 'eu', 'ka', 'hy'] 
FILE_PATH = 'translations.json'

def update_translations():
    # Read the existing file
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for term_key, translations in data.items():
        base_text = translations.get('en')
        if not base_text:
            continue

        for lang in NEW_LANGUAGES:
            if lang not in translations:
                try:
                    translator = GoogleTranslator(source='en', target=lang)
                    translated_text = translator.translate(base_text)
                    
                    translations[lang] = translated_text
                    print(f"Translated '{term_key}' to {lang}: {translated_text}")
                    time.sleep(0.5) 
                except Exception as e:
                    print(f"Failed to translate '{term_key}' to {lang}. Error: {e}")

    # Write directly back to the same file
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=8)
        
    print("Translation complete. File overwritten.")

if __name__ == "__main__":
    update_translations()