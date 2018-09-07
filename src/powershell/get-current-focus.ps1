[CmdletBinding()]            
Param(            
)            
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class FocusPoller {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@  

$activeHandle = [FocusPoller]::GetForegroundWindow()
$process = Get-Process | Where-Object {$_.MainWindowHandle -eq $activeHandle}

[hashtable]$focusObj = @{}
$focusObj.pid = $process.Id
$focusObj.path = $process.MainModule.FileName.Replace('\', '/')

$json = $focusObj | ConvertTo-Json -Compress
Write-Host $json
