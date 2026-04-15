import codecs

def main():
    filename = r"d:\APPS By nRn World\Ribegatan\RIBE NY\index.html"
    with codecs.open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # The user wants to remove:
    # 2010 - 2019
    # 2006 - 2009
    # Stämmoprotokoll Arkiv (2004-2024)
    # The block containing these corresponds to lines 5459 through 5712.
    # Line 5459 is index 5458. Line 5712 is index 5711. 
    # Let's delete this slice:
    del lines[5458:5712]

    with codecs.open(filename, 'w', encoding='utf-8') as f:
        f.writelines(lines)

if __name__ == '__main__':
    main()
