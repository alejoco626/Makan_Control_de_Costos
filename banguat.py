"""Consulta del tipo de cambio de referencia del Banco de Guatemala (Banguat).

Usa el servicio web SOAP TipoCambioDia. El Banguat aclara que ese servicio es gratuito y no
es la fuente oficial: la información oficial es la de https://www.banguat.gob.gt
Sin dependencias externas (solo biblioteca estándar), para poder probarlo sin pywebview.
"""
import json
import threading
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

URL_SERVICIO = "https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx"
NAMESPACE = "http://www.banguat.gob.gt/variables/ws/"
SOAP_ACTION = '"http://www.banguat.gob.gt/variables/ws/TipoCambioDia"'
SOBRE = (
    '<?xml version="1.0" encoding="utf-8"?>'
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
    'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
    'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
    '<soap:Body><TipoCambioDia xmlns="' + NAMESPACE + '" /></soap:Body></soap:Envelope>'
)

# Horas locales de la consulta automática: 00:00, 06:00, 12:00 y 16:00.
HORAS = [(0, 0), (6, 0), (12, 0), (16, 0)]
REINTENTO = timedelta(minutes=10)
MAX_HISTORIAL = 90


class ErrorConsulta(Exception):
    pass


def _nombre(etiqueta):
    return etiqueta.split("}")[-1]


def parsear_respuesta(contenido):
    """Extrae fecha y referencia de la respuesta SOAP. Devuelve {'fecha': 'AAAA-MM-DD', 'referencia': float}."""
    try:
        raiz = ET.fromstring(contenido)
    except ET.ParseError as exc:
        raise ErrorConsulta("La respuesta del Banguat no es XML válido") from exc
    for elemento in raiz.iter():
        if _nombre(elemento.tag) != "VarDolar":
            continue
        datos = {_nombre(h.tag): (h.text or "").strip() for h in elemento}
        try:
            dia, mes, anio = datos["fecha"].split("/")
            fecha = f"{int(anio):04d}-{int(mes):02d}-{int(dia):02d}"
            referencia = float(datos["referencia"])
        except (KeyError, ValueError) as exc:
            raise ErrorConsulta("La respuesta del Banguat no trae fecha o referencia válidas") from exc
        if referencia <= 0:
            raise ErrorConsulta("El Banguat devolvió un tipo de cambio no válido")
        return {"fecha": fecha, "referencia": referencia}
    raise ErrorConsulta("La respuesta del Banguat no incluye el tipo de cambio de referencia")


def consultar_banguat(url=URL_SERVICIO, timeout=20):
    solicitud = urllib.request.Request(
        url,
        data=SOBRE.encode("utf-8"),
        headers={"Content-Type": "text/xml; charset=utf-8", "SOAPAction": SOAP_ACTION},
    )
    try:
        with urllib.request.urlopen(solicitud, timeout=timeout) as respuesta:
            return parsear_respuesta(respuesta.read())
    except urllib.error.HTTPError as exc:
        raise ErrorConsulta(f"El Banguat respondió con error {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ErrorConsulta("No hay conexión con el Banguat") from exc


def ultima_programada(ahora):
    """Última hora programada que ya pasó (siempre existe: las 00:00 de hoy)."""
    candidatas = [ahora.replace(hour=h, minute=m, second=0, microsecond=0) for h, m in HORAS]
    return max(c for c in candidatas if c <= ahora)


def proxima_programada(ahora):
    for h, m in HORAS:
        c = ahora.replace(hour=h, minute=m, second=0, microsecond=0)
        if c > ahora:
            return c
    return (ahora + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


def _fecha(texto):
    try:
        return datetime.fromisoformat(texto) if texto else None
    except ValueError:
        return None


class TipoCambio:
    """Guarda el último valor y consulta al Banguat en las horas programadas mientras la app está abierta."""

    def __init__(self, archivo, consultar=consultar_banguat, ahora=datetime.now, al_cambiar=None):
        self.archivo = Path(archivo)
        self._consultar = consultar
        self._ahora = ahora
        self._al_cambiar = al_cambiar
        self._candado = threading.RLock()
        self._parar = threading.Event()
        self._hilo = None
        self._estado = {"actual": None, "ultima": {}, "historial": []}
        self._cargar()

    # ---- estado ----
    def _cargar(self):
        try:
            datos = json.loads(self.archivo.read_text(encoding="utf-8"))
            if isinstance(datos, dict):
                self._estado.update({k: datos[k] for k in ("actual", "ultima", "historial") if k in datos})
        except (OSError, ValueError):
            pass

    def _guardar(self):
        try:
            temporal = self.archivo.with_suffix(".tmp")
            temporal.write_text(json.dumps(self._estado, ensure_ascii=False, indent=2), encoding="utf-8")
            temporal.replace(self.archivo)
        except OSError:
            pass

    def estado(self):
        with self._candado:
            return json.loads(json.dumps(self._estado))

    # ---- consulta ----
    def consultar(self, origen="manual"):
        """Consulta al Banguat y guarda el resultado, sea bueno o malo. Devuelve el estado."""
        ahora = self._ahora().replace(microsecond=0)
        try:
            dato = self._consultar()
            with self._candado:
                self._estado["actual"] = dato
                self._estado["ultima"] = {
                    "ok": True, "intento_en": ahora.isoformat(), "consultado_en": ahora.isoformat(),
                    "error": None, "origen": origen,
                }
                historial = self._estado["historial"]
                historial.append({"consultado_en": ahora.isoformat(), **dato})
                del historial[:-MAX_HISTORIAL]
        except Exception as exc:  # ErrorConsulta u otro fallo inesperado: se registra y se sigue
            with self._candado:
                previa = self._estado["ultima"] or {}
                self._estado["ultima"] = {
                    "ok": False, "intento_en": ahora.isoformat(),
                    "consultado_en": previa.get("consultado_en"), "error": str(exc) if isinstance(exc, ErrorConsulta) else "Error inesperado al consultar", "origen": origen,
                }
        with self._candado:
            self._guardar()
        estado = self.estado()
        if self._al_cambiar:
            try:
                self._al_cambiar(estado)
            except Exception:  # la interfaz puede estar cerrándose
                pass
        return estado

    def toca_consultar(self, ahora=None):
        """True si hay una hora programada sin cubrir, o si el último intento falló hace 10 min o más."""
        ahora = ahora or self._ahora()
        programada = ultima_programada(ahora)
        with self._candado:
            ultima = self._estado.get("ultima") or {}
        exito = _fecha(ultima.get("consultado_en"))
        intento = _fecha(ultima.get("intento_en"))
        if exito is not None and exito >= programada:
            return False
        if intento is None or intento < programada:
            return True
        return ahora - intento >= REINTENTO

    # ---- programador ----
    def _bucle(self):
        while not self._parar.is_set():
            try:
                if self.toca_consultar():
                    self.consultar("programada")
            except Exception:  # un error inesperado no debe detener el programador
                pass
            self._parar.wait(30)

    def iniciar(self):
        if self._hilo and self._hilo.is_alive():
            return
        self._hilo = threading.Thread(target=self._bucle, name="tipo-cambio", daemon=True)
        self._hilo.start()

    def detener(self):
        self._parar.set()
