-- Ejecutar una sola vez en instalaciones existentes.
ALTER TABLE productos ADD COLUMN imagen VARCHAR(255) NULL COMMENT 'Nombre del archivo en backend/uploads' AFTER unidad;
