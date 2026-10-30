INSERT INTO entidad (clave, nombre)
VALUES
  ('02', 'Baja California'),
  ('26', 'Sonora')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre);

INSERT INTO municipio (entidad_clave, clave, nombre)
VALUES
  ('26', '030', 'Hermosillo'),
  ('26', '055', 'San Luis Rio Colorado'),
  ('02', '002', 'Mexicali'),
  ('02', '004', 'Tijuana')
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
