# Get full ESLint output and parse file paths correctly
$output = npm run lint 2>&1 | Out-String
$lines = $output -split "`r?`n"

$results = @()
$currentFile = ""

foreach ($line in $lines) {
    # Detect file path (line without leading spaces, ends with .ts/.tsx/.js/.jsx)
    if ($line -match '^[^\s].*\.(tsx?|jsx?)$') {
        $currentFile = $line.Trim()
    }
    # Detect 'any' error line
    elseif ($line -match '@typescript-eslint/no-explicit-any' -and $line -match '^\s*(\d+):(\d+)') {
        if ($currentFile) {
            $results += "$currentFile`:$($matches[1]):$($matches[2])"
        }
    }
}

if ($results.Count -eq 0) {
    Write-Host "No 'any' types found!" -ForegroundColor Green
} else {
    Write-Host "`nFound $($results.Count) 'any' types:`n" -ForegroundColor Yellow
    $results | ForEach-Object { Write-Host $_ }
}
