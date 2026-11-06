CREATE TABLE IF NOT EXISTS clientes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tipo_documento ENUM('DNI','RUC') NOT NULL,
  nombres VARCHAR(120) NULL,
  apellido_paterno VARCHAR(80) NULL,
  apellido_materno VARCHAR(80) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cliente_documento (tipo_documento, numero_documento)
) ENGINE=InnoDB;

ALTER TABLE ventas ADD COLUMN cliente_id INT UNSIGNED NULL AFTER observacion;
ALTER TABLE ventas ADD CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL;
