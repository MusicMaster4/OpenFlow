param(
  [Parameter(Mandatory = $true)]
  [string]$EncodedText
)

try {
  $Text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedText))
} catch {
  throw "Falha ao decodificar o texto em UTF-8 para envio."
}

if ([string]::IsNullOrEmpty($Text)) {
  exit 0
}

Add-Type -AssemblyName System.Windows.Forms

Set-Clipboard -Value $Text
Start-Sleep -Milliseconds 40
[System.Windows.Forms.SendKeys]::SendWait('^v')
Start-Sleep -Milliseconds 80
[System.Windows.Forms.Clipboard]::Clear()
