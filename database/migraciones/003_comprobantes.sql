CREATE TABLE IF NOT EXISTS comprobantes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  venta_id INT UNSIGNED NOT NULL,
  tipo_doc ENUM('01','03') NOT NULL,
  serie VARCHAR(4) NOT NULL,
  correlativo INT UNSIGNED NOT NULL,
  estado ENUM('PENDIENTE','ENVIADO','ACEPTADO','OBSERVADO','RECHAZADO','ERROR_COMUNICACION','ANULADO') NOT NULL DEFAULT 'PENDIENTE',
  mensaje VARCHAR(500) NULL,
  hash VARCHAR(255) NULL,
  cdr_codigo VARCHAR(20) NULL,
  cdr_descripcion VARCHAR(500) NULL,
  respuesta_json JSON NULL,
  emitido_en DATETIME NULL,
  procesado_en DATETIME NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_comprobante_venta (venta_id),
  UNIQUE KEY uq_comprobante_numero (tipo_doc, serie, correlativo),
  CONSTRAINT fk_comprobante_venta FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE RESTRICT
) ENGINE=InnoDB;
