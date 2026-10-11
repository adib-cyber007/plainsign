$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$plainRoot = Split-Path -Parent $PSScriptRoot
$plainNarration = Get-Content -LiteralPath (Join-Path $plainRoot 'docs/video-narration.json') -Raw | ConvertFrom-Json
$plainOut = Join-Path $plainRoot 'output/video-build'
New-Item -ItemType Directory -Path $plainOut -Force | Out-Null
$plainVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$plainVoice.SelectVoice('Microsoft Zira Desktop')
$plainVoice.Rate = 0
$plainVoice.Volume = 100
foreach ($plainKind in @('presentation', 'demo')) {
    $plainIndex = 0
    foreach ($plainSegment in $plainNarration.$plainKind) {
        $plainIndex++
        $plainFile = Join-Path $plainOut ('{0}-{1:d2}.wav' -f $plainKind, $plainIndex)
        $plainVoice.SetOutputToWaveFile($plainFile)
        $plainVoice.Speak($plainSegment.text)
        $plainVoice.SetOutputToNull()
    }
}
$plainVoice.Dispose()
Write-Output 'Generated synthetic narration with Microsoft Zira Desktop.'
