$content = Get-Content "index.html"

# Current line indices in HTML (1-based from previous view_file)
# 5494: <!-- 2006-2009 -->
# 5495: <details ...
# 5548: </details>
# 5549: </div> (end of background div)
# 5550: 
# 5551: <div background: rgb(248... (Start of Stammoprotokoll block)
# 5587: <div background: white... (Start of Aegarbyte specifically)
# 5593: </div> (End of Stammoprotokoll details)
# 5594: </div> (End of Stammoprotokoll background div)

# Indices are 0-based
# We want to keep 0 to 5492 (up to blanketter div)
# Skip 2006-2009 block (5493 to 5547)
# Keep 5548 to 5550 (the closing </div> and spacing)
# Skip Stammoprotokoll block header and archive (5551 to 5585)
# Keep from 5586 (Aegarbyte) to end.

$newContent = $content[0..5492] + $content[5548..5550] + $content[5586..($content.Length-1)]

$newContent | Set-Content "index.html"
