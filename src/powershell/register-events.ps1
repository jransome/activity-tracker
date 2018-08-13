param(
    [Parameter(Mandatory = $true)][string]$StartEventIdentifier,
    [Parameter(Mandatory = $true)][string]$StopEventIdentifier
)
function global:Convert-EventToJson {
    param($Type, $TraceEvent)
    [hashtable]$eventObj = @{}
    $eventObj.Type = $Type
    $eventObj.ProcessID = $TraceEvent.ProcessID
    $eventObj.ProcessName = $TraceEvent.ProcessName
    $eventObj.TimeCreated = $TraceEvent.TIME_CREATED

    $json = $eventObj | ConvertTo-Json -Compress
    Write-Host $json
}

Register-WMIEvent -query "SELECT * FROM Win32_ProcessStartTrace" -SourceIdentifier "startevent" -action { 
    $e = $Event.SourceEventArgs.NewEvent
    global:Convert-EventToJson -Type startTrace -TraceEvent $e
}

Register-WMIEvent -query "SELECT * FROM Win32_ProcessStopTrace" -SourceIdentifier "stopevent" -action { 
    $e = $Event.SourceEventArgs.NewEvent  
    global:Convert-EventToJson -Type "stopTrace" -TraceEvent $e
}
