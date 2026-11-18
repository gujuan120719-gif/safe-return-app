$file = "C:\Users\user\.gemini\antigravity\scratch\safe-return-app\scripts\supabase_import.csv"
$reader = [System.IO.File]::OpenText($file)
$lineCount = 0
$issues = 0
while ($null -ne ($line = $reader.ReadLine())) {
    $lineCount++
    $parts = $line.Split('"')
    if (($parts.Length - 1) % 2 -ne 0) {
        $issues++
        if ($issues -le 5) {
            Write-Host "Unbalanced quotes at line $lineCount : $line"
        }
    }
}
$reader.Close()
Write-Host "Total lines: $lineCount, Issues: $issues"
