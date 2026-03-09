param(
  [Parameter(Mandatory = $true)]
  [string]$EncodedText
)

Add-Type -AssemblyName System.Windows.Forms

try {
  $Text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedText))
} catch {
  throw "Falha ao decodificar o texto em UTF-8 para colagem."
}

if ([string]::IsNullOrWhiteSpace($Text)) {
  exit 0
}

$previousText = $null
$hasPreviousText = $false

try {
  $previousText = Get-Clipboard -Raw -Format Text -ErrorAction Stop
  $hasPreviousText = $true
} catch {
  $hasPreviousText = $false
}

Set-Clipboard -Value $Text
Start-Sleep -Milliseconds 40
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 80

if ($hasPreviousText) {
  Set-Clipboard -Value $previousText
}
