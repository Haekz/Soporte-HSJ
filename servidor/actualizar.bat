@echo off
REM Descarga los últimos cambios aprobados (rama main) desde GitHub al PC servidor.
REM Lo ejecuta una tarea programada cada 10 minutos (ver servidor\GUIA-SERVIDOR-LOCAL.md).
cd /d C:\SoporteHSJ\web || exit /b 1
git fetch --quiet origin main || exit /b 1
git reset --quiet --hard origin/main
echo %date% %time% actualizado >> C:\SoporteHSJ\caddy\actualizar.log
