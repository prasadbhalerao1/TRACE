$ErrorActionPreference='Stop'
$src = (Resolve-Path 'TRACE_Idea_Submission.docx').Path
$dst = (Get-Location).Path + '\TRACE_Idea_Submission.pdf'
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
$d = $w.Documents.Open($src, $false, $true, $false)
# Stop Word downsampling the diagrams on export - this is what made them blurry
$pages = $d.ComputeStatistics(2)
# ExportAsFixedFormat: 17=PDF, quality 0 = print quality (not "minimum size"),
# BitmapMissingFonts=$false so vectors stay vector
$d.ExportAsFixedFormat([string]$dst, 17, $false, 0, 0, 0, 0, 0, $true, $true, 0, $false, $true, $false)
$d.Close(0); $w.Quit()
"PAGES=$pages" | Out-File -FilePath pages.txt -Encoding ascii
