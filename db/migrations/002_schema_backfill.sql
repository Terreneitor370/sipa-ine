CREATE TABLE IF NOT EXISTS usuario (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'ANALISTA') NOT NULL DEFAULT 'ANALISTA',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS login_attempt (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(120) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  succeeded TINYINT(1) NOT NULL DEFAULT 0,
  attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_login_attempt_email_ip_time (email, ip_address, attempted_at)
);

CREATE TABLE IF NOT EXISTS entidad (
  clave VARCHAR(2) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  PRIMARY KEY (clave)
);

CREATE TABLE IF NOT EXISTS municipio (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entidad_clave VARCHAR(2) NOT NULL,
  clave VARCHAR(3) NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_municipio_entidad_clave (entidad_clave, clave),
  CONSTRAINT fk_municipio_entidad
    FOREIGN KEY (entidad_clave) REFERENCES entidad (clave)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS seccion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave_seccion VARCHAR(16) NOT NULL UNIQUE,
  entidad_clave VARCHAR(2) NOT NULL,
  municipio_clave VARCHAR(3) NOT NULL,
  nombre_municipio VARCHAR(160) NOT NULL,
  nombre_seccion VARCHAR(160) NOT NULL,
  lista_nominal INT UNSIGNED NOT NULL DEFAULT 0,
  geo_ref VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_seccion_entidad_municipio (entidad_clave, municipio_clave),
  CONSTRAINT fk_seccion_entidad
    FOREIGN KEY (entidad_clave) REFERENCES entidad (clave)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS colonia (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave_colonia VARCHAR(24) NOT NULL UNIQUE,
  nombre_colonia VARCHAR(160) NOT NULL,
  entidad_clave VARCHAR(2) NOT NULL,
  municipio_clave VARCHAR(3) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_colonia_entidad_municipio (entidad_clave, municipio_clave),
  CONSTRAINT fk_colonia_entidad
    FOREIGN KEY (entidad_clave) REFERENCES entidad (clave)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS seccion_colonia (
  seccion_id BIGINT UNSIGNED NOT NULL,
  colonia_id BIGINT UNSIGNED NOT NULL,
  cobertura_pct DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  PRIMARY KEY (seccion_id, colonia_id),
  CONSTRAINT fk_seccion_colonia_seccion
    FOREIGN KEY (seccion_id) REFERENCES seccion (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_seccion_colonia_colonia
    FOREIGN KEY (colonia_id) REFERENCES colonia (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS riesgo_seccion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seccion_id BIGINT UNSIGNED NOT NULL UNIQUE,
  abstencion_predicha DECIMAL(6,5) NOT NULL,
  nivel_riesgo ENUM('BAJO', 'MEDIO', 'ALTO', 'CRITICO') NOT NULL,
  prioridad_score DECIMAL(7,5) NOT NULL DEFAULT 0,
  modelo_version VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_riesgo_nivel_score (nivel_riesgo, prioridad_score),
  CONSTRAINT fk_riesgo_seccion
    FOREIGN KEY (seccion_id) REFERENCES seccion (id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_cache (
  payload_hash CHAR(64) NOT NULL,
  payload_json JSON NOT NULL,
  response_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payload_hash),
  INDEX idx_scenario_cache_created_at (created_at)
);
