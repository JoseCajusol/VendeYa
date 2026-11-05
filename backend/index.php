<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['app' => 'VendeYa API', 'ok' => true, 'endpoints' => [
    'api/productos.php', 'api/categorias.php', 'api/inventario.php',
    'api/ventas.php', 'api/reportes.php', 'api/configuracion.php',
]], JSON_UNESCAPED_SLASHES);
