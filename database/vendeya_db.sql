-- =====================================================================
--  VendeYa - Base de datos para MySQL / MariaDB (XAMPP)
--  Importar desde phpMyAdmin: Importar > Seleccionar este archivo > Importar
--  o desde consola:  C:\xampp\mysql\bin\mysql.exe -u root < vendeya_db.sql
-- =====================================================================

DROP DATABASE IF EXISTS vendeya_db;
CREATE DATABASE vendeya_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vendeya_db;

-- ---------------------------------------------------------------------
-- Configuración del negocio (una sola fila, id = 1)
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
  id              TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  nombre_negocio  VARCHAR(120) NOT NULL DEFAULT 'Mi Negocio',
  ruc             VARCHAR(11)  NULL,
  direccion       VARCHAR(200) NULL,
  telefono        VARCHAR(20)  NULL,
  yape_numero     VARCHAR(15)  NULL,
  yape_titular    VARCHAR(120) NULL,
  yape_qr         VARCHAR(255) NULL COMMENT 'Nombre del archivo del QR en backend/uploads',
  umbral_stock    INT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'Avisar cuando el stock sea menor o igual a este valor',
  moneda          VARCHAR(5)   NOT NULL DEFAULT 'S/',
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_config_unica CHECK (id = 1)
) ENGINE=InnoDB;

INSERT INTO configuracion (id, nombre_negocio) VALUES (1, 'Mi Negocio');

-- ---------------------------------------------------------------------
-- Categorías de productos
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(80)  NOT NULL,
  activo     TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categoria_nombre (nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codigo_barras   VARCHAR(50)   NULL,
  nombre          VARCHAR(150)  NOT NULL,
  descripcion     VARCHAR(255)  NULL,
  categoria_id    INT UNSIGNED  NULL,
  precio_compra   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  precio_venta    DECIMAL(10,2) NOT NULL,
  stock           INT           NOT NULL DEFAULT 0,
  unidad          VARCHAR(20)   NOT NULL DEFAULT 'unidad',
  activo          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_producto_codigo (codigo_barras),
  KEY idx_producto_nombre (nombre),
  KEY idx_producto_stock (stock),
  CONSTRAINT fk_producto_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_producto_precios CHECK (precio_venta >= 0 AND precio_compra >= 0),
  CONSTRAINT chk_producto_stock CHECK (stock >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Ventas (cabecera)
-- ---------------------------------------------------------------------
CREATE TABLE ventas (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(20)   NULL COMMENT 'Ej: V-000001',
  fecha           DATETIME      NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  metodo_pago     ENUM('EFECTIVO','YAPE') NOT NULL,
  monto_recibido  DECIMAL(10,2) NULL COMMENT 'Solo para pagos en efectivo',
  vuelto          DECIMAL(10,2) NULL,
  estado          ENUM('COMPLETADA','ANULADA') NOT NULL DEFAULT 'COMPLETADA',
  observacion     VARCHAR(255)  NULL,
  anulada_en      DATETIME      NULL,
  UNIQUE KEY uq_venta_codigo (codigo),
  KEY idx_venta_fecha (fecha),
  KEY idx_venta_estado_fecha (estado, fecha)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Detalle de cada venta
-- (se guarda el nombre y precio del momento para que el historial
--  no cambie si luego se edita el producto)
-- ---------------------------------------------------------------------
CREATE TABLE venta_detalle (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  venta_id         INT UNSIGNED  NOT NULL,
  producto_id      INT UNSIGNED  NOT NULL,
  nombre_producto  VARCHAR(150)  NOT NULL,
  codigo_barras    VARCHAR(50)   NULL,
  precio_unitario  DECIMAL(10,2) NOT NULL,
  precio_compra    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cantidad         INT UNSIGNED  NOT NULL,
  subtotal         DECIMAL(10,2) NOT NULL,
  KEY idx_detalle_venta (venta_id),
  KEY idx_detalle_producto (producto_id),
  CONSTRAINT fk_detalle_venta FOREIGN KEY (venta_id)
    REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Movimientos de inventario (kardex simple)
--   ENTRADA   = compra / reposición de mercadería
--   SALIDA    = merma, pérdida, consumo interno
--   AJUSTE    = corrección por conteo físico
--   VENTA     = descuento automático al vender
--   ANULACION = devolución de stock al anular una venta
-- ---------------------------------------------------------------------
CREATE TABLE movimientos_inventario (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  producto_id     INT UNSIGNED NOT NULL,
  tipo            ENUM('ENTRADA','SALIDA','AJUSTE','VENTA','ANULACION') NOT NULL,
  cantidad        INT          NOT NULL COMMENT 'Positivo suma, negativo resta',
  stock_anterior  INT          NOT NULL,
  stock_nuevo     INT          NOT NULL,
  venta_id        INT UNSIGNED NULL,
  motivo          VARCHAR(255) NULL,
  fecha           DATETIME     NOT NULL,
  KEY idx_mov_producto (producto_id),
  KEY idx_mov_fecha (fecha),
  CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_mov_venta FOREIGN KEY (venta_id)
    REFERENCES ventas (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Vista: productos con stock bajo (según el umbral configurado)
-- ---------------------------------------------------------------------
CREATE VIEW v_productos_stock_bajo AS
SELECT p.id, p.codigo_barras, p.nombre, p.stock, c.umbral_stock
FROM productos p
CROSS JOIN configuracion c
WHERE p.activo = 1 AND p.stock <= c.umbral_stock;
