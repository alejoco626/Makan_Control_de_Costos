"""Búsqueda e instalación de actualizaciones desde los Releases de GitHub.

Cómo funciona:
  1. Cada 6 horas (y al abrir la app) pide la lista de Releases del repositorio.
  2. Si hay una versión más nueva con el ejecutable adjunto, avisa a la pantalla.
  3. «Actualizar ahora» descarga el .exe, comprueba su suma SHA-256, y un pequeño script
     lo cambia por el actual cuando la app se cierra; después la vuelve a abrir.
  4. «Más tarde» silencia el aviso 4 horas.

El repositorio ("usuario/repositorio") se toma de config.json en la carpeta de datos o de la
variable de entorno CONTROL_COSTOS_REPO, o de REPO_PREDETERMINADO. Solo repositorios públicos.
Solo biblioteca estándar, para poder probarlo sin pywebview.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

REPO_PREDETERMINADO = ""  # por ejemplo "mi-usuario/control-de-costos"
API = "https://api.github.com"
EXE = "ControlDeCostos.exe"
REVISAR_CADA = timedelta(hours=6)
POSPONER = timedelta(hours=4)
PRIMERA_REVISION = 15  # segundos después de abrir la app
HOSTS_PERMITIDOS = ("github.com", "githubusercontent.com")


class ErrorActualizacion(Exception):
    pass


# ---------- Versiones ----------
_VERSION = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.]+))?$")


def clave_version(texto):
    """Clave ordenable de '1.3.0-beta'. Una versión final es mayor que su beta. None si no es válida."""
    m = _VERSION.match(str(texto or "").strip())
    if not m:
        return None
    mayor, menor, parche, pre = m.groups()
    if pre is None:
        previo = (1,)
    else:
        previo = (0,) + tuple((0, int(p), "") if p.isdigit() else (1, 0, p.lower()) for p in pre.split("."))
    return (int(mayor), int(menor), int(parche), previo)


def es_mas_nueva(candidata, actual):
    a, b = clave_version(candidata), clave_version(actual)
    return a is not None and b is not None and a > b


def _url_segura(url):
    p = urllib.parse.urlparse(str(url or ""))
    host = p.hostname or ""
    return p.scheme == "https" and any(host == h or host.endswith("." + h) for h in HOSTS_PERMITIDOS)


def elegir_release(lista, actual):
    """De la lista de Releases de GitHub devuelve la más nueva que supere a `actual` y traiga el .exe."""
    mejor = None
    for r in lista if isinstance(lista, list) else []:
        if not isinstance(r, dict) or r.get("draft"):
            continue
        version = str(r.get("tag_name") or "").lstrip("v")
        if not es_mas_nueva(version, actual):
            continue
        activos = {a.get("name"): a for a in r.get("assets") or [] if isinstance(a, dict)}
        exe = activos.get(EXE)
        if not exe or not _url_segura(exe.get("browser_download_url")):
            continue
        sha = None
        digest = str(exe.get("digest") or "")
        if digest.lower().startswith("sha256:"):
            sha = digest.split(":", 1)[1].strip().lower()
        archivo_sha = activos.get(EXE + ".sha256")
        candidata = {
            "version": version,
            "notas": str(r.get("body") or "").strip()[:600],
            "pagina": r.get("html_url") if _url_segura(r.get("html_url")) else None,
            "url_exe": exe["browser_download_url"],
            "tamano": int(exe.get("size") or 0),
            "sha256": sha,
            "url_sha256": archivo_sha.get("browser_download_url") if archivo_sha and _url_segura(archivo_sha.get("browser_download_url")) else None,
        }
        if mejor is None or es_mas_nueva(version, mejor["version"]):
            mejor = candidata
    return mejor


# ---------- Red ----------
def _pedir(url, timeout=20):
    solicitud = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "ControlDeCostos"})
    try:
        with urllib.request.urlopen(solicitud, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise ErrorActualizacion("No se encontró el repositorio de actualizaciones (¿es público?)") from exc
        if exc.code in (403, 429):
            raise ErrorActualizacion("GitHub limitó las consultas; se reintentará más tarde") from exc
        raise ErrorActualizacion(f"GitHub respondió con error {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ErrorActualizacion("No hay conexión para buscar actualizaciones") from exc


def _json(url):
    try:
        return json.loads(_pedir(url))
    except ValueError as exc:
        raise ErrorActualizacion("La respuesta de GitHub no es válida") from exc


def _descargar(url, destino, progreso=None):
    solicitud = urllib.request.Request(url, headers={"User-Agent": "ControlDeCostos"})
    sha = hashlib.sha256()
    try:
        with urllib.request.urlopen(solicitud, timeout=30) as r, open(destino, "wb") as f:
            total = int(r.headers.get("Content-Length") or 0)
            hecho = 0
            while True:
                bloque = r.read(1024 * 256)
                if not bloque:
                    break
                f.write(bloque)
                sha.update(bloque)
                hecho += len(bloque)
                if progreso and total:
                    progreso(hecho / total)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ErrorActualizacion("No se pudo descargar la actualización") from exc
    return sha.hexdigest()


def script_reemplazo(nuevo, destino, pid):
    """Script .bat que espera a que la app se cierre, cambia el .exe y la vuelve a abrir."""
    anterior = str(destino) + ".anterior"
    return (
        "@echo off\r\n"
        "chcp 65001 >nul\r\n"
        ":esperar\r\n"
        f'tasklist /FI "PID eq {pid}" 2>nul | find "{pid}" >nul\r\n'
        "if not errorlevel 1 (\r\n  timeout /t 1 /nobreak >nul\r\n  goto esperar\r\n)\r\n"
        f'if exist "{anterior}" del /F /Q "{anterior}"\r\n'
        f'move /Y "{destino}" "{anterior}" >nul\r\n'
        f'move /Y "{nuevo}" "{destino}" >nul\r\n'
        "if errorlevel 1 (\r\n"
        f'  move /Y "{anterior}" "{destino}" >nul\r\n'
        ")\r\n"
        f'start "" "{destino}"\r\n'
        'del "%~f0"\r\n'
    )


def _fecha(texto):
    try:
        return datetime.fromisoformat(texto) if texto else None
    except ValueError:
        return None


class Actualizador:
    def __init__(self, archivo, version, repo=None, api=API, ahora=datetime.now, al_cambiar=None,
                 empaquetado=None, exe_actual=None, pedir_json=None, descargar=None):
        self.archivo = Path(archivo)
        self.version = version
        self._repo = repo
        self._api = api
        self._ahora = ahora
        self._al_cambiar = al_cambiar
        self.empaquetado = bool(getattr(sys, "frozen", False)) if empaquetado is None else empaquetado
        self.exe_actual = Path(exe_actual or sys.executable)
        self._pedir_json = pedir_json or _json
        self._descargar = descargar or _descargar
        self._candado = threading.RLock()
        self._parar = threading.Event()
        self._hilo = None
        self._persistido = {"ultima_busqueda": None, "pospuesta": None}
        self._vivo = {"disponible": None, "error": None, "fase": "ninguna", "progreso": 0.0}
        self._intento = None
        self._cargar()

    # ---- estado ----
    def _cargar(self):
        try:
            datos = json.loads(self.archivo.read_text(encoding="utf-8"))
            if isinstance(datos, dict):
                self._persistido.update({k: datos[k] for k in ("ultima_busqueda", "pospuesta") if k in datos})
        except (OSError, ValueError):
            pass

    def _guardar(self):
        try:
            temporal = self.archivo.with_suffix(".tmp")
            temporal.write_text(json.dumps(self._persistido, ensure_ascii=False, indent=2), encoding="utf-8")
            temporal.replace(self.archivo)
        except OSError:
            pass

    def repo(self):
        if self._repo:
            return self._repo
        return os.environ.get("CONTROL_COSTOS_REPO") or REPO_PREDETERMINADO or ""

    def estado(self):
        with self._candado:
            disp = self._vivo["disponible"]
            pos = self._persistido.get("pospuesta") or {}
            hasta = _fecha(pos.get("hasta"))
            pospuesta = bool(disp and pos.get("version") == disp["version"] and hasta and hasta > self._ahora())
            publico = None
            if disp:
                publico = {k: disp[k] for k in ("version", "notas", "pagina", "tamano")}
            return {
                "version_actual": self.version,
                "repo_configurado": bool(self.repo()),
                "puede_instalar": self.empaquetado,
                "disponible": publico,
                "pospuesta": pospuesta,
                "pospuesta_hasta": pos.get("hasta") if pospuesta else None,
                "ultima_busqueda": self._persistido.get("ultima_busqueda"),
                "error": self._vivo["error"],
                "fase": self._vivo["fase"],
                "progreso": self._vivo["progreso"],
            }

    def _avisar(self):
        if self._al_cambiar:
            try:
                self._al_cambiar(self.estado())
            except Exception:  # la interfaz puede estar cerrándose
                pass

    # ---- búsqueda ----
    def buscar(self):
        repo = self.repo()
        self._intento = self._ahora()
        if not repo or not re.match(r"^[\w.-]+/[\w.-]+$", repo):
            with self._candado:
                self._vivo["error"] = "Falta configurar el repositorio de actualizaciones."
            self._avisar()
            return self.estado()
        self._intento = self._ahora()
        with self._candado:
            self._vivo.update(fase="buscando", error=None)
        self._avisar()
        try:
            lista = self._pedir_json(f"{self._api}/repos/{repo}/releases?per_page=15")
            nueva = elegir_release(lista, self.version)
            with self._candado:
                self._vivo["disponible"] = nueva
                self._persistido["ultima_busqueda"] = self._ahora().replace(microsecond=0).isoformat()
                self._guardar()
        except ErrorActualizacion as exc:
            with self._candado:
                self._vivo["error"] = str(exc)
        except Exception:
            with self._candado:
                self._vivo["error"] = "Error inesperado al buscar actualizaciones"
        with self._candado:
            self._vivo["fase"] = "ninguna"
        self._avisar()
        return self.estado()

    def posponer(self):
        with self._candado:
            disp = self._vivo["disponible"]
            if disp:
                self._persistido["pospuesta"] = {"version": disp["version"], "hasta": (self._ahora() + POSPONER).replace(microsecond=0).isoformat()}
                self._guardar()
        self._avisar()
        return self.estado()

    # ---- instalación ----
    def instalar(self, pid=None):
        """Descarga, comprueba y prepara el cambio. Devuelve el estado; 'reiniciar': True si la app debe cerrarse."""
        with self._candado:
            disp = self._vivo["disponible"]
        if not disp:
            return {**self.estado(), "reiniciar": False}
        if not self.empaquetado:
            with self._candado:
                self._vivo["error"] = "La actualización automática solo funciona en el programa instalado (.exe)."
            self._avisar()
            return {**self.estado(), "reiniciar": False}
        carpeta = Path(tempfile.mkdtemp(prefix="controlcostos_"))
        nuevo = carpeta / EXE
        try:
            with self._candado:
                self._vivo.update(fase="descargando", error=None, progreso=0.0)
            self._avisar()

            def progreso(x):
                with self._candado:
                    self._vivo["progreso"] = round(x, 2)

            suma = self._descargar(disp["url_exe"], nuevo, progreso)
            esperada = disp.get("sha256")
            if not esperada and disp.get("url_sha256"):
                try:
                    esperada = _pedir(disp["url_sha256"]).decode("utf-8", "ignore").split()[0].strip().lower()
                except (ErrorActualizacion, IndexError):
                    esperada = None
            if not esperada:
                raise ErrorActualizacion("La versión no trae suma de verificación (.sha256); no se instaló.")
            if suma.lower() != esperada.lower():
                raise ErrorActualizacion("La descarga no coincide con la suma de verificación; no se instaló.")
            if disp.get("tamano") and nuevo.stat().st_size != disp["tamano"]:
                raise ErrorActualizacion("La descarga quedó incompleta; no se instaló.")
            guion = carpeta / "actualizar.bat"
            guion.write_text(script_reemplazo(nuevo, self.exe_actual, pid or os.getpid()), encoding="utf-8")
            subprocess.Popen(
                ["cmd", "/c", str(guion)],
                creationflags=0x08000000 | 0x00000008,  # sin ventana y separado de la app
                close_fds=True,
            )
            with self._candado:
                self._vivo.update(fase="listo", progreso=1.0)
            self._avisar()
            return {**self.estado(), "reiniciar": True}
        except ErrorActualizacion as exc:
            with self._candado:
                self._vivo.update(fase="ninguna", error=str(exc))
        except Exception:
            with self._candado:
                self._vivo.update(fase="ninguna", error="Error inesperado al actualizar. La app sigue como estaba.")
        self._avisar()
        return {**self.estado(), "reiniciar": False}

    # ---- programador ----
    def toca_buscar(self):
        if self._intento is not None and self._ahora() - self._intento < timedelta(minutes=30):
            return False  # no insistir cuando falló hace poco
        ultima = _fecha(self._persistido.get("ultima_busqueda"))
        return ultima is None or self._ahora() - ultima >= REVISAR_CADA

    def _bucle(self):
        if self._parar.wait(PRIMERA_REVISION):
            return
        while not self._parar.is_set():
            try:
                if self.repo() and self.toca_buscar():
                    self.buscar()
            except Exception:
                pass
            self._parar.wait(60)

    def iniciar(self):
        if self._hilo and self._hilo.is_alive():
            return
        self._hilo = threading.Thread(target=self._bucle, name="actualizador", daemon=True)
        self._hilo.start()

    def detener(self):
        self._parar.set()
