Register-WMIEvent -query "SELECT * FROM Win32_ProcessStartTrace" -SourceIdentifier "startevent" -action { 
    $e = $Event.SourceEventArgs.NewEvent 
    Write-Host $e.ProcessName,"started" 
}

Register-WMIEvent -query "SELECT * FROM Win32_ProcessStopTrace" -SourceIdentifier "stopevent" -action { 
    $e = $Event.SourceEventArgs.NewEvent 
    Write-Host $e.ProcessName,"stopped" 
}
