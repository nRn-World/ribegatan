"""
fix_mobile.py - Lägger till viewport meta-tag i alla HTML-filer
så att mobilbrowsern skalar sidan korrekt.
"""
import os
import codecs
import glob

SITE_DIR = r"d:\APPS By nRn World\Ribegatan\RIBE NY\ribegatan.se"

VIEWPORT_TAG = '	<meta name="viewport" content="width=device-width, initial-scale=1.0" />\r\n'

# Hitta alla HTML-filer i site-mappen (ej undermappar som admin/)
html_files = glob.glob(os.path.join(SITE_DIR, "*.html"))

fixed = 0
already = 0
skipped = 0

for filepath in html_files:
    try:
        with codecs.open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  FEL läsning: {os.path.basename(filepath)} -> {e}")
        skipped += 1
        continue

    # Hoppa över om viewport redan finns
    if 'name="viewport"' in content:
        already += 1
        continue

    # Lägg till viewport efter första <meta http-equiv="content-type" ...>
    # eller efter <head>
    if 'charset=utf-8' in content:
        new_content = content.replace(
            'content="text/html; charset=utf-8" />',
            'content="text/html; charset=utf-8" />\r\n' + VIEWPORT_TAG.rstrip('\r\n'),
            1
        )
    elif '<head>' in content.lower():
        new_content = content.replace('<head>', '<head>\r\n' + VIEWPORT_TAG.rstrip('\r\n'), 1)
    else:
        print(f"  HOPPAR: {os.path.basename(filepath)} (hittar inte rätt plats)")
        skipped += 1
        continue

    try:
        with codecs.open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  FIXAD: {os.path.basename(filepath)}")
        fixed += 1
    except Exception as e:
        print(f"  FEL skrivning: {os.path.basename(filepath)} -> {e}")
        skipped += 1

print(f"\n=== KLART ===")
print(f"Fixade: {fixed}")
print(f"Redan OK: {already}")
print(f"Hoppade: {skipped}")
print(f"Totalt: {len(html_files)}")
