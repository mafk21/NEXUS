!macro customUnInstall
  # Keep the startup preference during an update; remove only our own entry on uninstall.
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "NEXUS.Desktop"
  ${endIf}
!macroend
