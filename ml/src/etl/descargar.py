"""Descarga las fuentes públicas y descomprime los archivos en data/raw/<clave>/.

Uso (desde la raíz del repositorio):
    python -m ml.src.etl.descargar            # descarga todas las fuentes
    python -m ml.src.etl.descargar eceg_2020  # solo una fuente
    python -m ml.src.etl.descargar --forzar   # vuelve a descargar aunque exista

Si un archivo ya existe en data/raw/<clave>/ no se vuelve a descargar, así que
también se puede colocar a mano (por ejemplo, descargado desde el navegador).
"""
import argparse
import sys
import time
import zipfile
from pathlib import Path

import requests

from .fuentes import FUENTES, RAW

CABECERAS = {"User-Agent": "Mozilla/5.0 (SIPA-INE hackathon; datos publicos)"}


def descargar(url: str, destino: Path, intentos: int = 3) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_suffix(destino.suffix + ".parcial")
    for intento in range(1, intentos + 1):
        try:
            with requests.get(url, headers=CABECERAS, stream=True, timeout=60) as r:
                r.raise_for_status()
                if "text/html" in r.headers.get("content-type", "") and not destino.suffix == ".html":
                    raise PermissionError(
                        "el sitio respondió con una página web (validación anti-robots) en lugar del archivo; "
                        "hay que descargarlo desde el navegador")
                # Si el servidor comprime la respuesta, content-length no coincide con los bytes descomprimidos
                comprimido = bool(r.headers.get("content-encoding"))
                total = 0 if comprimido else int(r.headers.get("content-length") or 0)
                leidos = 0
                with open(temporal, "wb") as f:
                    for bloque in r.iter_content(chunk_size=1 << 20):
                        f.write(bloque)
                        leidos += len(bloque)
                        if total:
                            print(f"\r  {leidos / 1e6:6.1f} / {total / 1e6:.1f} MB", end="")
                print()
            if total and leidos != total:
                raise IOError(f"descarga incompleta ({leidos} de {total} bytes)")
            temporal.replace(destino)
            return
        except PermissionError:
            temporal.unlink(missing_ok=True)
            raise
        except Exception as e:  # noqa: BLE001
            print(f"  intento {intento} falló: {e}")
            if intento == intentos:
                temporal.unlink(missing_ok=True)
                raise
            time.sleep(3 * intento)


def descomprimir(archivo: Path, carpeta: Path) -> None:
    """Descomprime un zip y, de forma recursiva, los zips que contenga."""
    with zipfile.ZipFile(archivo) as z:
        for miembro in z.infolist():
            ruta = (carpeta / miembro.filename).resolve()
            if not str(ruta).startswith(str(carpeta.resolve())):
                raise ValueError(f"ruta insegura dentro del zip: {miembro.filename}")
        z.extractall(carpeta)
    for interno in list(carpeta.rglob("*.zip")):
        if interno == archivo:
            continue
        destino = interno.with_suffix("")
        if not destino.exists():
            destino.mkdir(parents=True)
            descomprimir(interno, destino)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("fuentes", nargs="*", help="claves a descargar (por defecto todas)")
    p.add_argument("--forzar", action="store_true", help="volver a descargar aunque el archivo exista")
    args = p.parse_args(argv)

    claves = args.fuentes or list(FUENTES)
    desconocidas = [c for c in claves if c not in FUENTES]
    if desconocidas:
        print(f"Fuentes desconocidas: {desconocidas}. Disponibles: {list(FUENTES)}")
        return 1

    errores = []
    for clave in claves:
        f = FUENTES[clave]
        carpeta = RAW / clave
        archivo = carpeta / f["archivo"]
        print(f"[{clave}] {f['descripcion']}")
        try:
            if archivo.exists() and not args.forzar:
                print("  ya existe, se omite la descarga")
            elif f.get("manual"):
                errores.append(clave)
                print(f"  DESCARGA MANUAL: abra {f['pagina']} en el navegador, descargue el archivo")
                print(f"  y guárdelo como {archivo}")
                continue
            else:
                descargar(f["url"], archivo)
            if archivo.suffix.lower() == ".zip":
                extraido = carpeta / "extraido"
                if not extraido.exists() or args.forzar:
                    extraido.mkdir(parents=True, exist_ok=True)
                    descomprimir(archivo, extraido)
                    print(f"  descomprimido en {extraido.relative_to(RAW.parent.parent)}")
        except Exception as e:  # noqa: BLE001
            errores.append(clave)
            print(f"  ERROR: {e}")
            print(f"  Descárguelo a mano desde {f['pagina']} y guárdelo como {archivo}")

    print()
    if errores:
        print(f"Terminó con errores en: {errores}")
        return 1
    print("Todas las fuentes están listas en data/raw/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
