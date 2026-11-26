@echo off
chcp 65001 >nul
echo Instalando dependencias...
python -m pip install -r requirements.txt pyinstaller
if errorlevel 1 goto error

echo Creando el ejecutable...
python -m PyInstaller --noconsole --onefile --clean --name ControlDeCostos --icon makan.ico --add-data "web;web" app.py
if errorlevel 1 goto error

echo Calculando la suma de verificacion...
powershell -NoProfile -Command "(Get-FileHash dist\ControlDeCostos.exe -Algorithm SHA256).Hash.ToLower() | Out-File -Encoding ascii -NoNewline dist\ControlDeCostos.exe.sha256"
if errorlevel 1 goto error

echo.
echo Listo: dist\ControlDeCostos.exe y dist\ControlDeCostos.exe.sha256
echo Para publicar una version: crea un Release en GitHub con la etiqueta de version y sube esos dos archivos.
pause
exit /b 0

:error
echo.
echo Algo fallo. Revisa el mensaje de arriba.
pause
exit /b 1
