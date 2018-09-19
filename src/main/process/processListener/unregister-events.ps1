param(
    [Parameter(Mandatory=$true)][string]$StartEventIdentifier,
    [Parameter(Mandatory=$true)][string]$StopEventIdentifier
)

Unregister-Event $StartEventIdentifier
Unregister-Event $StopEventIdentifier
