Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class FocusPoller {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
  }
"@

while (($null -eq $activeHandle) -and ($retries -lt 20)) {
  $activeHandle = [FocusPoller]::GetForegroundWindow()
  $retries++
}

if ($null -ne $activeHandle) {
  $process = Get-Process | Where-Object { $_.MainWindowHandle -eq $activeHandle }
  [hashtable]$focusObj = @{ }
  $focusObj.pid = $process.Id
  $focusObj.path = $process.MainModule.FileName.Replace('\', '/')
  $json = $focusObj | ConvertTo-Json -Compress
}
else {
  $json = $null
}

Write-Host $json
