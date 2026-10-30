"""Genera mocks de ejemplo del frontend (contrato congelado 16 oct 2026). No forma parte del ETL."""
import json
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "mocks")
os.makedirs(OUT, exist_ok=True)

MUNICIPIOS = [
    "Hermosillo", "Nogales", "Cajeme", "Guaymas", "San Luis Río Colorado",
    "Empalme", "Navojoa", "Agua Prieta", "Puerto Peñasco", "Obregón", "Etchojoa",
]
UMBRALES = {"MUY_ALTO": 0.559, "ALTO": 0.522, "MEDIO": 0.485, "BAJO": 0.0}


def nivel(a: float) -> str:
    if a >= UMBRALES["MUY_ALTO"]:
        return "MUY_ALTO"
    if a >= UMBRALES["ALTO"]:
        return "ALTO"
    if a >= UMBRALES["MEDIO"]:
        return "MEDIO"
    return "BAJO"


rng = random.Random(42)
cols, rows = 8, 6
lon0, lat0 = -114.8, 26.6
d_lon, d_lat = 0.72, 0.85

features = []
secciones = []
counts = {"MUY_ALTO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
suma = 0.0

for r in range(rows):
    for c in range(cols):
        idx = r * cols + c
        clave = f"{400 + idx + 1:04d}"
        base = 0.44 + 0.16 * math.sin(idx / 3.1) + rng.uniform(-0.03, 0.03)
        abst = round(min(0.64, max(0.40, base)), 3)
        niv = nivel(abst)
        counts[niv] += 1
        suma += abst
        mun = MUNICIPIOS[idx % len(MUNICIPIOS)]
        distrito = (idx % 7) + 1
        lista = rng.randint(900, 9800)
        lon = lon0 + c * d_lon
        lat = lat0 + r * d_lat
        ring = [
            [lon, lat], [lon + d_lon * 0.92, lat],
            [lon + d_lon * 0.92, lat + d_lat * 0.92], [lon, lat + d_lat * 0.92],
            [lon, lat],
        ]
        features.append({
            "type": "Feature",
            "properties": {"claveSeccion": clave},
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })
        secciones.append({
            "seccionId": int(clave),
            "claveSeccion": clave,
            "nombre": f"Sección {clave}",
            "municipio": mun,
            "distrito": distrito,
            "listaNominal": lista,
            "abstencionPredicha": abst,
            "p10": round(max(0.0, abst - 0.045), 3),
            "p90": round(min(1.0, abst + 0.047), 3),
            "nivel": niv,
        })

geo = {"type": "FeatureCollection", "features": features}
with open(os.path.join(OUT, "geo-sonora.json"), "w", encoding="utf-8") as f:
    json.dump(geo, f, ensure_ascii=False)

riesgo = {
    "entidad": "26",
    "escenario": "inercial",
    "totalSecciones": len(secciones),
    "abstencionPromedio": round(suma / len(secciones), 3),
    "porNivel": counts,
    "umbrales": {
        "MUY_ALTO": {"min": UMBRALES["MUY_ALTO"], "max": None},
        "ALTO": {"min": UMBRALES["ALTO"], "max": UMBRALES["MUY_ALTO"]},
        "MEDIO": {"min": UMBRALES["MEDIO"], "max": UMBRALES["ALTO"]},
        "BAJO": {"min": None, "max": UMBRALES["MEDIO"]},
    },
    "secciones": secciones,
}
with open(os.path.join(OUT, "riesgo.json"), "w", encoding="utf-8") as f:
    json.dump(riesgo, f, ensure_ascii=False, indent=2)

# ranking de priorización: secciones con más votos recuperables
filas = sorted(secciones, key=lambda s: s["listaNominal"] * (0.03 + (s["seccionId"] % 7) / 1000), reverse=True)[:12]
prior = {
    "escenarioId": 12,
    "total": 50,
    "filas": [
        {
            "seccionId": s["seccionId"],
            "claveSeccion": s["claveSeccion"],
            "municipio": s["municipio"],
            "listaNominal": s["listaNominal"],
            "abstencionA": s["abstencionPredicha"],
            "deltaPp": -round(2.0 + (s["seccionId"] % 40) / 10, 1),
            "votosRecuperables": int(s["listaNominal"] * (0.02 + (s["seccionId"] % 7) / 100)),
            "nivel": s["nivel"],
        }
        for s in filas
    ],
}
with open(os.path.join(OUT, "priorizacion.json"), "w", encoding="utf-8") as f:
    json.dump(prior, f, ensure_ascii=False, indent=2)

print("mocks generados:", len(secciones), "secciones", counts)
