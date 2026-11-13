@echo off
chcp 65001 >nul
echo ========================================
echo 小幻语 OCR 环境修复工具
echo ========================================
echo.

echo 1. 检查 Visual C++ 运行库...
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" >nul 2>nul
if %errorlevel%==0 (
    echo    ✓ 已安装 Visual C++ 运行库
) else (
    echo    ✗ 未检测到 Visual C++ 运行库
    echo    正在尝试下载并安装...
    powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '%temp%\vc_redist.x64.exe'"
    start /wait %temp%\vc_redist.x64.exe /quiet /norestart
    echo    安装完成，请重启电脑后重新运行桌宠。
)

echo.
echo 2. 检查 PaddleOCR 模型缓存...
set PADDLE_HOME=%USERPROFILE%\.paddleocr
if exist "%PADDLE_HOME%" (
    echo    ✓ 模型缓存已存在
) else (
    echo    ✗ 模型缓存不存在，正在尝试下载...
    python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='ch', show_log=True)" >nul 2>nul
    if %errorlevel%==0 (
        echo    ✓ 模型下载成功
    ) else (
        echo    ✗ 模型下载失败，请检查网络后重试
    )
)

echo.
echo 3. 测试 OCR 初始化...
python -c "from paddleocr import PaddleOCR; ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False); print('初始化成功')"
if %errorlevel%==0 (
    echo    ✓ OCR 可以正常初始化
) else (
    echo    ✗ OCR 初始化失败，请将上方错误信息反馈给开发者
)

echo.
echo 修复完成！请重启电脑后再次运行 run.bat。
pause
