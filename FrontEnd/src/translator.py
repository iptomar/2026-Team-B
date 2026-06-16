import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from deep_translator import GoogleTranslator

# Full list of supported languages
TARGET_LANGUAGES = [
    'af', 'sq', 'am', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'be', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb', 'ny', 'zh-CN', 'zh-TW', 'co', 'hr', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha', 'haw', 'iw', 'hi', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn', 'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lg', 'lb', 'mk', 'mai', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'no', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro', 'ru', 'sm', 'sa', 'gd', 'nso', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
] 

FILE_PATH = '../public/translations.json'
WORKERS = 10 

def translate_single(term_key, base_text, lang):
    try:
        translator = GoogleTranslator(source='en', target=lang)
        translated_text = translator.translate(base_text)
        return term_key, lang, translated_text, None
    except Exception as e:
        return term_key, lang, None, str(e)

def update_translations():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tasks = []
    completed_count = 0

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        for term_key, translations in data.items():
            base_text = translations.get('en')
            if not base_text:
                continue

            for lang in TARGET_LANGUAGES:
                if lang not in translations:
                    tasks.append(executor.submit(translate_single, term_key, base_text, lang))

        for future in as_completed(tasks):
            term_key, lang, translated_text, error = future.result()
            if translated_text:
                data[term_key][lang] = translated_text
                print(f"Translated '{term_key}' to {lang}")
                completed_count += 1
                
                # Save checkpoint every 500 successful translations
                if completed_count % 500 == 0:
                    with open(FILE_PATH, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=8)
                    print(f"--- Checkpoint saved at {completed_count} translations ---")
            else:
                print(f"Failed '{term_key}' to {lang}. Error: {error}")

    # Final save
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=8)
        
    print("Translation complete. File overwritten.")

if __name__ == "__main__":
    update_translations()