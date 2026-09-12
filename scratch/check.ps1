$lines = Get-Content 'api/bot.js'
$depth = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $depth += ($opens - $closes)
    if ($depth -lt 0) {
        Write-Host "Negative depth at line $($i + 1): $line"
        break
    }
}
Write-Host "Final depth: $depth"
