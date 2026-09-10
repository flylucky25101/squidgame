Add-Type -AssemblyName System.Speech
$chantDirectory = Join-Path (Get-Location).Path 'public/audio/chant'
New-Item -ItemType Directory -Path $chantDirectory -Force | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Heami Desktop')
$synth.Rate = 1
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$syllables = @(([string][char]47924),([string][char]44417),([string][char]54868),([string][char]44867),([string][char]51060),([string][char]54588),([string][char]50632),([string][char]49845),([string][char]45768),([string][char]45796))
try {
  for ($chantIndex=0; $chantIndex -lt $syllables.Length; $chantIndex++) {
    $synth.SetOutputToWaveFile((Join-Path $chantDirectory "$chantIndex.wav"), $format)
    $synth.Speak($syllables[$chantIndex])
    $synth.SetOutputToNull()
  }
} finally { $synth.Dispose() }
Write-Output 'Created 10 Korean chant clips.'
