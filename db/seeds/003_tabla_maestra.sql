INSERT INTO entidad (clave, nombre)
VALUES
  ('02', 'Baja California'),
  ('26', 'Sonora')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre);

INSERT INTO municipio (entidad_clave, clave, nombre)
VALUES
  ('26', '030', 'Hermosillo'),
  ('02', '002', 'Mexicali')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre);

INSERT INTO colonia (clave_colonia, nombre_colonia, entidad_clave, municipio_clave)
VALUES
  ('260300001', 'Hermosillo Centro Norte', '26', '030'),
  ('260300002', 'Hermosillo Centro Sur', '26', '030'),
  ('020020001', 'Mexicali Centro', '02', '002')
ON DUPLICATE KEY UPDATE
  nombre_colonia = VALUES(nombre_colonia),
  entidad_clave = VALUES(entidad_clave),
  municipio_clave = VALUES(municipio_clave);

INSERT INTO seccion (
  clave_seccion,
  entidad_clave,
  municipio_clave,
  nombre_municipio,
  nombre_seccion,
  lista_nominal,
  geo_ref
) VALUES
  ('260300001', '26', '030', 'Hermosillo', 'Hermosillo Centro 1', 1350, 'public-geo/26/030/260300001.topojson'),
  ('260300002', '26', '030', 'Hermosillo', 'Hermosillo Centro 2', 1278, 'public-geo/26/030/260300002.topojson'),
  ('020020001', '02', '002', 'Mexicali', 'Mexicali Norte 1', 1495, 'public-geo/02/002/020020001.topojson')
ON DUPLICATE KEY UPDATE
  nombre_seccion = VALUES(nombre_seccion),
  lista_nominal = VALUES(lista_nominal),
  geo_ref = VALUES(geo_ref);

INSERT INTO seccion_colonia (seccion_id, colonia_id, cobertura_pct)
SELECT s.id, c.id, 100.00
FROM seccion s
JOIN colonia c
  ON c.clave_colonia = '260300001'
WHERE s.clave_seccion = '260300001'
ON DUPLICATE KEY UPDATE cobertura_pct = VALUES(cobertura_pct);

INSERT INTO seccion_colonia (seccion_id, colonia_id, cobertura_pct)
SELECT s.id, c.id, 100.00
FROM seccion s
JOIN colonia c
  ON c.clave_colonia = '260300002'
WHERE s.clave_seccion = '260300002'
ON DUPLICATE KEY UPDATE cobertura_pct = VALUES(cobertura_pct);

INSERT INTO seccion_colonia (seccion_id, colonia_id, cobertura_pct)
SELECT s.id, c.id, 100.00
FROM seccion s
JOIN colonia c
  ON c.clave_colonia = '020020001'
WHERE s.clave_seccion = '020020001'
ON DUPLICATE KEY UPDATE cobertura_pct = VALUES(cobertura_pct);

INSERT INTO riesgo_seccion (seccion_id, abstencion_predicha, nivel_riesgo, prioridad_score, modelo_version)
SELECT s.id,
       vals.abstencion_predicha,
       vals.nivel_riesgo,
       vals.prioridad_score,
       'v0.1.0'
FROM seccion s
JOIN (
  SELECT '260300001' AS clave_seccion, 0.43210 AS abstencion_predicha, 'ALTO' AS nivel_riesgo, 0.78000 AS prioridad_score
  UNION ALL
  SELECT '260300002', 0.36750, 'MEDIO', 0.52000
  UNION ALL
  SELECT '020020001', 0.28900, 'BAJO', 0.31000
) vals ON vals.clave_seccion = s.clave_seccion
ON DUPLICATE KEY UPDATE
  abstencion_predicha = VALUES(abstencion_predicha),
  nivel_riesgo = VALUES(nivel_riesgo),
  prioridad_score = VALUES(prioridad_score),
  modelo_version = VALUES(modelo_version);
