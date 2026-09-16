Add-Type -AssemblyName System.Speech
$chantDirectory = Join-Path (Get-Location).Path 'public/audio/chant'
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Heami Desktop')
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
# Keep the whole sentence intact for correct Korean liaison.
$phrase = -join (@(47924,44417,54868,44867,51060,32,54588,50632,49845,45768,45796,46) | ForEach-Object { [char]$_ })
try {
  foreach ($rate in @(-2,0,2,4)) {
    $synth.Rate = $rate
    $synth.SetOutputToWaveFile((Join-Path $chantDirectory "phrase-$rate.wav"), $format)
    $synth.Speak($phrase)
    $synth.SetOutputToNull()
  }
} finally { $synth.Dispose() }
Write-Output 'Created four whole-sentence Korean recordings.'
