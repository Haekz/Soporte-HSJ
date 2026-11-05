# Soporte HSJ: seguridad y servidor local

Guía para (A) cerrar los puntos de seguridad en Supabase y (B) servir la página desde un PC con IP fija, con HTTPS válido y sin costo.

Por qué HTTPS es obligatorio: sin un certificado válido, los celulares no instalan la app (PWA), no activan el service worker y bloquean funciones como la cámara. `http://IP` no sirve.

---

## A. Seguridad en Supabase (hacer primero, sirve para cualquier hosting)

1. **Desactivar el registro público (lo más importante).**
   Authentication > Sign In / Providers > Email (o "User Signups"): apagar **Allow new users to sign up**.
   La clave `anon` de `config.js` es pública por diseño. Si el registro está abierto, cualquiera que la vea podría crearse una cuenta y leer todos los reportes.
2. **Ejecutar `supabase/seguridad.sql`** en SQL Editor. Hace lo siguiente:
   - Bloquea por completo a quien no inició sesión.
   - Desde la página solo se puede cambiar el estado (pendiente, reportado, resuelto). Nadie puede reescribir la falla, la serie ni la foto de un reporte ya guardado.
   - Solo quien creó un reporte, o un administrador, puede eliminarlo (lo mismo para su foto).
   - Las fotos solo se pueden subir con el nombre que genera la página.
   - Limita el largo de los textos.
3. **Nombrarse administrador** (ejecutar en SQL Editor, con su correo):
   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol":"admin"}'
   where email = 'nombre.apellido@redsalud.gob.cl';
   ```
   Luego cerrar sesión y volver a entrar.
4. **Contraseñas:** en Authentication > Providers > Email, fijar un largo mínimo de 10 caracteres.
5. **URL del sitio:** cuando el servidor local funcione, en Authentication > URL Configuration poner la nueva dirección (`https://su-nombre.duckdns.org`) en *Site URL* y en *Redirect URLs*.
6. **Nunca** poner la clave `service_role` en `config.js` ni en el repositorio. Solo va la `anon public`.

---

## B. Servidor en el PC local (Windows)

Antes de empezar: confirme con TI del hospital que puede tener un servidor web en ese PC y si la IP fija es **interna** (10.x, 172.16-31.x, 192.168.x) o **pública**.

- IP interna: la página solo abrirá desde la red del hospital (cable o wifi). Con datos móviles no abrirá. Es lo más seguro.
- IP pública: TI debe permitir la entrada por el puerto 443 (y 80) hacia ese PC.

Todo lo que sigue funciona en ambos casos.

### 1. Dominio gratuito (DuckDNS)

1. Entrar a https://www.duckdns.org e iniciar sesión (con GitHub o Google).
2. Crear un subdominio, por ejemplo `soportehsj` → queda `soportehsj.duckdns.org`.
3. En *current ip* escribir la IP fija del PC (se ve con `ipconfig`) y presionar *update ip*.
4. Copiar el **token** que aparece arriba. Es secreto: no lo comparta ni lo suba a GitHub.

### 2. Programas

1. Instalar **Git for Windows**: https://git-scm.com/download/win (opciones por defecto).
2. Descargar **Caddy con el módulo DuckDNS**: https://caddyserver.com/download → Platform *Windows amd64* → buscar y marcar `github.com/caddy-dns/duckdns` → *Download*. Renombrar el archivo a `caddy.exe`.
3. Crear las carpetas `C:\SoporteHSJ\caddy` y poner ahí `caddy.exe`.

### 3. Copia de la página

En PowerShell:
```powershell
cd C:\SoporteHSJ
git clone https://github.com/Haekz/Soporte-HSJ.git web
```
Si el repositorio es privado, Git abrirá una ventana para iniciar sesión en GitHub (solo la primera vez).

### 4. Configurar Caddy

1. Copiar `C:\SoporteHSJ\web\servidor\Caddyfile.ejemplo` a `C:\SoporteHSJ\caddy\Caddyfile` (sin extensión).
2. Abrirlo con el Bloc de notas y reemplazar `<<<su-nombre>>>` y `<<<TOKEN-DE-DUCKDNS>>>`.
3. Probar (PowerShell como administrador):
   ```powershell
   cd C:\SoporteHSJ\caddy
   .\caddy.exe validate --config Caddyfile
   .\caddy.exe run --config Caddyfile
   ```
   La primera vez tarda 1 o 2 minutos en obtener el certificado. Abra `https://su-nombre.duckdns.org` desde un celular conectado a la red. Si funciona, cierre con Ctrl+C.

El Caddyfile ya incluye: HTTPS automático (se renueva solo), bloqueo de archivos internos (`.git`, SQL, guías, planillas), y cabeceras de seguridad (CSP, HSTS, anti-iframe).

### 5. Dejarlo como servicio (arranca solo con Windows)

PowerShell como administrador:
```powershell
sc.exe create caddy start= auto binPath= "C:\SoporteHSJ\caddy\caddy.exe run --config C:\SoporteHSJ\caddy\Caddyfile"
sc.exe start caddy
New-NetFirewallRule -DisplayName "Soporte HSJ HTTPS" -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow
```

### 6. Actualización automática desde GitHub

Cada vez que usted aprueba un cambio en GitHub (merge a `main`), el PC lo descarga solo cada 10 minutos.

1. Copiar `C:\SoporteHSJ\web\servidor\actualizar.bat` a `C:\SoporteHSJ\actualizar.bat` (fuera del repositorio, para que un cambio en GitHub no pueda alterar el script que se ejecuta).
2. PowerShell (pedirá su contraseña de Windows):
   ```powershell
   schtasks /create /tn "Soporte HSJ actualizar" /tr "C:\SoporteHSJ\actualizar.bat" /sc minute /mo 10 /ru "$env:USERDOMAIN\$env:USERNAME" /rp
   ```

### 7. Repositorio privado (opcional, recomendado)

Con el servidor local ya no necesita GitHub Pages, así que el repositorio puede ser privado (gratis):
GitHub > Soporte-HSJ > Settings > General > Danger Zone > *Change visibility* > Private.
Al hacerlo, `https://haekz.github.io/Soporte-HSJ/` deja de funcionar. Hágalo solo cuando el servidor local ya esté operativo.

---

## Mantenimiento

- Mantener Windows Update al día en ese PC y no usarlo para navegar o abrir correos.
- El PC debe quedar encendido y sin suspensión (Configuración > Energía > Suspender: Nunca).
- Registro de visitas: `C:\SoporteHSJ\caddy\acceso.log`.
- Si cambia la IP del PC, actualizarla en duckdns.org.
- Si el wifi del hospital no resuelve el nombre (protección "DNS rebinding" con IP interna), pedir a TI que agregue `su-nombre.duckdns.org` a su DNS interno apuntando a la IP del PC.
