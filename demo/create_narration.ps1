param(
    [string]$OutputDirectory = "$PSScriptRoot\output\narration"
)

Add-Type -AssemblyName System.Speech
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$phrases = [ordered]@{
    "01-map-right.wav"       = "Turn right in 120 meters."
    "02-pothole-center.wav"  = "Pothole detected. Keep center."
    "03-pothole-left.wav"    = "Pothole detected. Go left."
    "04-pothole-right.wav"   = "Pothole detected. Go right."
    "05-map-straight.wav"    = "Continue straight for 40 meters."
}

$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = -1
$synth.Volume = 100

try {
    foreach ($entry in $phrases.GetEnumerator()) {
        $path = Join-Path $OutputDirectory $entry.Key
        $synth.SetOutputToWaveFile($path)
        $synth.Speak($entry.Value)
        $synth.SetOutputToNull()
        Write-Output "$($entry.Key): $($entry.Value)"
    }
}
finally {
    $synth.Dispose()
}
