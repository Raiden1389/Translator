param(
    [Parameter(Mandatory = $true)]
    [string]$ApiKey,

    [string]$Model = "gemini-2.5-flash",
    [string]$Location = "asia-southeast1",
    [string]$Text = "Dich sang tieng Viet that tu nhien: The stars danced in the midnight sky."
)

$bodyObject = @{
    contents = @(
        @{
            role = "user"
            parts = @(
                @{
                    text = $Text
                }
            )
        }
    )
    generationConfig = @{
        temperature = 0.1
        topP = 0.95
        maxOutputTokens = 512
        responseMimeType = "text/plain"
    }
}

$bodyJson = $bodyObject | ConvertTo-Json -Depth 10
$uri = "https://$Location-aiplatform.googleapis.com/v1/publishers/google/models/$Model`:generateContent?key=$ApiKey"

Write-Host "Testing Vertex AI latency..."
Write-Host "Location: $Location"
Write-Host "Model: $Model"
Write-Host ""

$startedAt = Get-Date
$response = $null
$duration = Measure-Command {
    $response = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $bodyJson
}

Write-Host ("Elapsed: {0:N2}s" -f $duration.TotalSeconds)
Write-Host ("Started: {0}" -f $startedAt.ToString("yyyy-MM-dd HH:mm:ss"))
Write-Host ""

if ($response.candidates[0].content.parts[0].text) {
    Write-Host "Output:"
    Write-Host $response.candidates[0].content.parts[0].text
} else {
    Write-Host "Raw response:"
    $response | ConvertTo-Json -Depth 20
}
