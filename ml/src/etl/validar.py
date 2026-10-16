"""Valida las fuentes descargadas y genera las tablas intermedias.

Uso (desde la raíz del repositorio, después de descargar):
    python -m ml.src.etl.validar                 # Sonora y Baja California
    python -m ml.src.etl.validar --entidades 26  # solo Sonora
    python -m ml.src.etl.validar --todas         # todo el país

Genera en data/interim/:
    resultados_seccion.parquet   abstención por sección y elección
    censo_seccion.parquet        variables del Censo 2020 por sección
    marginacion_municipio.parquet
    reporte_validacion.md        resumen para revisar con el equipo
"""
import argparse
import sys
from datetime import datetime

import pandas as pd

from . import censo, computos, marginacion
from .fuentes import ENTIDADES_MVP, FUENTES, INTERIM, RAW


def _tabla_md(df: pd.DataFrame) -> str:
    cols = [str(c) for c in df.columns]
    filas = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    for _, r in df.iterrows():
        filas.append("| " + " | ".join(str(v) for v in r.values) + " |")
    return "\n".join(filas)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--entidades", nargs="*", type=int, help="claves de entidad (por defecto 2 y 26)")
    p.add_argument("--todas", action="store_true", help="procesar las 32 entidades")
    args = p.parse_args(argv)
    entidades = None if args.todas else (args.entidades or list(ENTIDADES_MVP))

    INTERIM.mkdir(parents=True, exist_ok=True)
    md = [f"# Reporte de validación de fuentes - SIPA-INE",
          f"Generado: {datetime.now():%Y-%m-%d %H:%M}",
          f"Entidades: {'todas' if entidades is None else entidades}", ""]
    problemas = []

    # 1. Resultados electorales
    md.append("## 1. Resultados electorales (diputaciones federales MR)")
    tablas, filas_resumen = [], []
    for clave, f in FUENTES.items():
        if f["tipo"] != "computos":
            continue
        carpeta = RAW / clave / "extraido"
        try:
            ruta = computos.encontrar_archivo_diputaciones(carpeta)
            cas = computos.casillas(ruta)
            sec, res = computos.por_seccion(cas, f["anio"], f["tipo_eleccion"], entidades)
            tablas.append(sec)
            filas_resumen.append({"anio": f["anio"], "archivo": ruta.name, **res,
                                  "abstencion_media": round(sec["abstencion"].mean(), 4),
                                  "abstencion_min": round(sec["abstencion"].min(), 4),
                                  "abstencion_max": round(sec["abstencion"].max(), 4)})
            print(f"[{clave}] {res['secciones']} secciones a partir de {ruta.name}")
        except Exception as e:  # noqa: BLE001
            problemas.append(f"{clave}: {e}")
            print(f"[{clave}] ERROR: {e}")
    if filas_resumen:
        md.append(_tabla_md(pd.DataFrame(filas_resumen)))
    resultados = pd.concat(tablas, ignore_index=True) if tablas else pd.DataFrame()
    if not resultados.empty:
        resultados.to_parquet(INTERIM / "resultados_seccion.parquet", index=False)

    # 2. Continuidad de secciones entre elecciones (reseccionamiento)
    md.append("\n## 2. Continuidad de secciones entre elecciones")
    if not resultados.empty:
        conj = {a: set(map(tuple, g[["entidad", "seccion"]].values)) for a, g in resultados.groupby("anio")}
        anios = sorted(conj)
        comunes = set.intersection(*conj.values()) if conj else set()
        filas = []
        for ent in sorted(resultados["entidad"].unique()):
            fila = {"entidad": int(ent)}
            for a in anios:
                fila[f"secciones_{a}"] = sum(1 for e, _ in conj[a] if e == ent)
            fila["en_todas"] = sum(1 for e, _ in comunes if e == ent)
            filas.append(fila)
        md.append(_tabla_md(pd.DataFrame(filas)))
        md.append("\nSolo las secciones presentes en todas las elecciones pueden tener variables de rezago completas.")
    else:
        comunes = set()

    # 3. Censo por sección
    md.append("\n## 3. Censo 2020 por sección (ECEG)")
    censo_df = pd.DataFrame()
    try:
        censo_df, rep = censo.leer(RAW / "eceg_2020" / "extraido", entidades)
        censo_df.to_parquet(INTERIM / "censo_seccion.parquet", index=False)
        md.append(f"Secciones con datos censales: {rep['secciones']}\n")
        md.append(_tabla_md(pd.DataFrame([{"variable_modelo": k, "origen": v} for k, v in rep["variables"].items()])))
        faltantes = [k for k, v in rep["variables"].items() if v == "FALTANTE"]
        if faltantes:
            problemas.append(f"ECEG: variables no encontradas {faltantes}; revisar nombres en el diccionario de datos")
            md.append(f"\nPrimeras columnas del archivo, para ajustar el mapeo: {', '.join(rep['muestra_columnas'])}")
        if comunes:
            claves_censo = set(map(tuple, censo_df[["entidad", "seccion"]].values))
            usables = comunes & claves_censo
            md.append(f"\nSecciones con historial completo y censo: **{len(usables)}** de {len(comunes)}")
        print(f"[eceg_2020] {rep['secciones']} secciones")
    except Exception as e:  # noqa: BLE001
        problemas.append(f"eceg_2020: {e}")
        print(f"[eceg_2020] ERROR: {e}")

    # 4. Marginación municipal (requiere la equivalencia de claves INE -> INEGI)
    md.append("\n## 4. Marginación municipal (CONAPO)")
    ruta_imm = RAW / "imm_2020" / FUENTES["imm_2020"]["archivo"]
    try:
        equiv = marginacion.equivalencias_ine_inegi(RAW / "eceg_2020" / "extraido")
        equiv.to_parquet(INTERIM / "equivalencia_municipios.parquet", index=False)
        if not censo_df.empty:
            con_equiv = censo_df.merge(equiv, on=["entidad", "municipio_ine"], how="left")
            sin = int(con_equiv["municipio_inegi"].isna().sum())
            md.append(f"Equivalencia de municipios INE -> INEGI: {len(equiv)} municipios; "
                      f"secciones sin equivalencia: {sin}")
            if sin:
                problemas.append(f"{sin} secciones sin municipio INEGI equivalente")
        if not ruta_imm.exists():
            raise FileNotFoundError("falta el archivo de marginación; correr: python -m ml.src.etl.descargar imm_2020")
        marg = marginacion.leer(ruta_imm, entidades)
        marg.to_parquet(INTERIM / "marginacion_municipio.parquet", index=False)
        md.append(f"\nMunicipios con índice de marginación: {len(marg)}")
        if not censo_df.empty:
            unida = con_equiv.merge(marg, on=["entidad", "municipio_inegi"], how="left")
            sin_marg = int(unida["ind_marginacion"].isna().sum())
            md.append(f"Secciones sin índice de marginación tras la unión: {sin_marg}")
        print(f"[imm_2020] {len(marg)} municipios")
    except Exception as e:  # noqa: BLE001
        problemas.append(f"imm_2020: {e}")
        print(f"[imm_2020] ERROR: {e}")

    md.append("\n## 5. Problemas encontrados")
    md.extend([f"- {x}" for x in problemas] or ["- Ninguno"])
    (INTERIM / "reporte_validacion.md").write_text("\n".join(md), encoding="utf-8")
    print(f"\nReporte: {INTERIM / 'reporte_validacion.md'}")
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main())
