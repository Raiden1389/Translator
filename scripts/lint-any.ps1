# Parse ESLint output and show file paths with any types
$output = npm run lint 2>&1 | Out-String
$lines = $output -split "`n"

$currentFile = ""
$anyErrors = @()

foreach ($line in $lines) {
    # Detect file path - ESLint format: "path/to/file.ts"
    # Usually appears as a standalone line before errors
    $trimmed = $line.Trim()
    
    # Check if line looks like a file path (ends with .ts, .tsx, .js, .jsx)
    if ($trimmed -match '\.(tsx?|jsx?)$' -and $trimmed -notmatch '^\s*\d+:\d+') {
        $currentFile = $trimmed
    }
    # Detect 'any' error
    elseif ($line -match '@typescript-eslint/no-explicit-any') {
        if ($currentFile) {
            # Extract line:col
            if ($line -match '^\s*(\d+):(\d+)\s+error') {
                $lineNum = $matches[1]
                $colNum = $matches[2]
                $anyErrors += "$currentFile`:$lineNum`:$colNum"
            }
        }
    }
}

if ($anyErrors.Count -eq 0) {
    Write-Host "No 'any' types found!" -ForegroundColor Green
} else {
    Write-Host "`nFound $($anyErrors.Count) 'any' types:`n" -ForegroundColor Yellow
    $anyErrors | ForEach-Object { Write-Host $_ }
}
