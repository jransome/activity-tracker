Add-Type -ReferencedAssemblies UIAutomationClient, UIAutomationTypes -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Windows.Automation;

namespace FocusMonitor
{
    public class FocusWatcher
    {
        public static void StartWatching()
        {
            Automation.AddAutomationFocusChangedEventHandler(OnFocusChangedHandler);
        }

        public static void StopWatching()
        {
            Automation.RemoveAllEventHandlers();
        }

        private static void OnFocusChangedHandler(object src, AutomationFocusChangedEventArgs args)
        {
            AutomationElement element = src as AutomationElement;
            if (element != null)
            {
                int processId = element.Current.ProcessId;
                using (Process process = Process.GetProcessById(processId))
                {
                    string output = processId + "_FOCUS_CHANGE_" + process.MainModule.FileName;
                    Console.WriteLine(output);
                }
            }
        }
    }
}
"@ 

[FocusMonitor.FocusWatcher]::StartWatching() 
