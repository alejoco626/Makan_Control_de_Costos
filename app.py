"""Makan · Control de costos: app de escritorio (pywebview).

Ejecutar en desarrollo:   python app.py
Crear el .exe:            build.bat
"""
import json
import os
import sys
import threading
import webbrowser
from pathlib import Path

import webview

from actualizador import Actualizador
from banguat import TipoCambio
from version import VERSION

APP_NAME = "RelacionDocumentos"

_window = None  # se asigna en main(); fuera de la clase para que pywebview no la exponga
_tipo_cambio = None
_actualizador = None


def recurso(*partes):
    """Ruta a un archivo incluido en la app (funciona en desarrollo y dentro del .exe)."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str(base.joinpath(*partes))


def carpeta_datos():
    raiz = os.environ.get("APPDATA") or str(Path.home())
    carpeta = Path(raiz) / APP_NAME
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


ARCHIVO = carpeta_datos() / "datos.json"
ARCHIVO_TC = carpeta_datos() / "tipo_cambio.json"
ARCHIVO_ACT = carpeta_datos() / "actualizaciones.json"
ARCHIVO_CONFIG = carpeta_datos() / "config.json"


def _avisar_interfaz(estado):
    """Empuja a la pantalla cada resultado de la consulta programada."""
    if _window is not None:
        try:
            _window.evaluate_js(
                "window.onTipoCambio && window.onTipoCambio(" + json.dumps(estado, ensure_ascii=False) + ")"
            )
        except Exception:  # la ventana puede estar cerrándose
            pass


def leer_repo():
    """Repositorio de GitHub con las versiones, desde config.json: {"repo": "usuario/repositorio"}."""
    try:
        return str(json.loads(ARCHIVO_CONFIG.read_text(encoding="utf-8")).get("repo") or "") or None
    except (OSError, ValueError, AttributeError):
        return None


def _avisar_actualizacion(estado):
    if _window is not None:
        try:
            _window.evaluate_js(
                "window.onActualizacion && window.onActualizacion(" + json.dumps(estado, ensure_ascii=False) + ")"
            )
        except Exception:
            pass


class Api:
    """Métodos que el JavaScript llama con pywebview.api.<nombre>()."""

    def cargar(self):
        """Devuelve los datos guardados, o None si todavía no hay (la interfaz usa los de demo)."""
        if not ARCHIVO.exists():
            return None
        try:
            datos = json.loads(ARCHIVO.read_text(encoding="utf-8"))
            if isinstance(datos, dict):
                return datos
        except (OSError, ValueError):
            pass
        # El archivo está dañado: se aparta para no perderlo y la app arranca con datos de ejemplo
        try:
            ARCHIVO.replace(ARCHIVO.with_name("datos.dañado.json"))
        except OSError:
            pass
        return None

    def guardar(self, datos):
        if not isinstance(datos, dict) or not datos.get("expedientes"):
            return False
        temporal = ARCHIVO.with_suffix(".tmp")
        temporal.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
        temporal.replace(ARCHIVO)
        return True

    def restaurar_demo(self):
        try:
            if ARCHIVO.exists():
                ARCHIVO.unlink()
        except OSError:
            return False
        return True

    def tc_estado(self):
        return _tipo_cambio.estado() if _tipo_cambio else {"actual": None, "ultima": {}, "historial": []}

    def tc_consultar(self):
        """Consulta al Banguat ahora mismo (botón 'Consultar ahora')."""
        return _tipo_cambio.consultar("manual") if _tipo_cambio else self.tc_estado()

    # ---- actualizaciones ----
    def act_estado(self):
        return _actualizador.estado() if _actualizador else {}

    def act_buscar(self):
        return _actualizador.buscar() if _actualizador else {}

    def act_posponer(self):
        return _actualizador.posponer() if _actualizador else {}

    def act_instalar(self):
        """Descarga y prepara la actualización; si todo sale bien cierra la app para que el script la cambie."""
        if not _actualizador:
            return {}
        resultado = _actualizador.instalar()
        if resultado.get("reiniciar") and _window is not None:
            threading.Timer(1.5, _window.destroy).start()
        return resultado

    def act_abrir_pagina(self):
        pagina = (_actualizador.estado().get("disponible") or {}).get("pagina") if _actualizador else None
        if pagina:
            webbrowser.open(pagina)
        return bool(pagina)

    def exportar_csv(self, texto, nombre="expediente.csv"):
        """Abre 'Guardar como' y escribe el CSV. Devuelve la ruta o None si se canceló."""
        if _window is None:
            return None
        tipo = webview.FileDialog.SAVE if hasattr(webview, "FileDialog") else webview.SAVE_DIALOG
        destino = _window.create_file_dialog(
            tipo, save_filename=nombre, file_types=("Archivo CSV (*.csv)",)
        )
        if isinstance(destino, (list, tuple)):
            destino = destino[0] if destino else None
        if not destino:
            return None
        Path(destino).write_text(texto, encoding="utf-8")
        return str(destino)


def iniciar_programador():
    """Se ejecuta en un hilo cuando la ventana ya está lista: consulta al Banguat a las 00:00, 06:00, 12:00 y 16:00
    y busca actualizaciones al abrir y cada 6 horas."""
    _tipo_cambio.iniciar()
    _actualizador.iniciar()


def main():
    global _window, _tipo_cambio, _actualizador
    _tipo_cambio = TipoCambio(ARCHIVO_TC, al_cambiar=_avisar_interfaz)
    _actualizador = Actualizador(ARCHIVO_ACT, VERSION, repo=leer_repo(), al_cambiar=_avisar_actualizacion)
    _window = webview.create_window(
        "Makan · Control de costos",
        recurso("web", "index.html"),
        js_api=Api(),
        width=1320,
        height=860,
        min_size=(1040, 680),
    )
    webview.start(iniciar_programador)
    _tipo_cambio.detener()
    _actualizador.detener()


if __name__ == "__main__":
    main()
