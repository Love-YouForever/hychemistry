@echo off
echo Starting "Little Magic Language" chemistry pet...
cd /d "C:\Users\16952\Desktop\Element\AIgent"
"C:\Users\16952\Desktop\Element\AIgent\oc.exe"
if errorlevel 1 (
    echo Program failed to start. Check if oc.exe exists.
    pause
)