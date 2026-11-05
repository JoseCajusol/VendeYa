-- =====================================================================
--  VendeYa - Datos de prueba (OPCIONAL)
--  Importar DESPUÉS de vendeya_db.sql. Los códigos de barras son de
--  ejemplo; registra los tuyos desde la app escaneando tus productos.
-- =====================================================================
USE vendeya_db;

UPDATE configuracion
SET nombre_negocio = 'Minimarket VendeYa',
    direccion      = 'Av. Principal 123',
    telefono       = '999888777',
    yape_numero    = '999888777',
    yape_titular   = 'Minimarket VendeYa'
WHERE id = 1;

INSERT INTO categorias (nombre) VALUES
  ('Bebidas'), ('Abarrotes'), ('Lácteos'), ('Snacks'), ('Limpieza');

INSERT INTO productos (codigo_barras, nombre, categoria_id, precio_compra, precio_venta, stock, unidad) VALUES
  ('7750000000011', 'Gaseosa 500 ml',          1, 1.80, 2.50, 40, 'unidad'),
  ('7750000000028', 'Agua mineral 625 ml',     1, 0.90, 1.50, 30, 'unidad'),
  ('7750000000035', 'Arroz extra 1 kg',        2, 3.60, 4.80, 25, 'bolsa'),
  ('7750000000042', 'Azúcar rubia 1 kg',       2, 3.20, 4.20,  4, 'bolsa'),
  ('7750000000059', 'Aceite vegetal 1 L',      2, 7.50, 9.90, 12, 'botella'),
  ('7750000000066', 'Leche evaporada 400 g',   3, 3.10, 4.00,  3, 'lata'),
  ('7750000000073', 'Yogurt fresa 1 L',        3, 4.80, 6.50,  8, 'botella'),
  ('7750000000080', 'Galletas de soda',        4, 0.60, 1.00, 50, 'paquete'),
  ('7750000000097', 'Papas fritas 45 g',       4, 1.20, 2.00,  5, 'bolsa'),
  ('7750000000103', 'Detergente 500 g',        5, 4.50, 6.00, 10, 'bolsa');

-- Movimiento inicial de inventario para cada producto
INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha)
SELECT id, 'ENTRADA', stock, 0, stock, 'Inventario inicial', NOW() FROM productos;
