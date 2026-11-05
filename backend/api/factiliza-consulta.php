<?php
require __DIR__ . '/_bootstrap.php';
require __DIR__ . '/../services/FactilizaConsultaService.php';

if (metodo() !== 'GET') responderError('Método no permitido.', 405);
$tipo = strtoupper(trim((string) ($_GET['tipo'] ?? '')));
$numero = trim((string) ($_GET['numero'] ?? ''));
if (!in_array($tipo, ['DNI', 'RUC'], true)) throw new ApiError('El tipo de documento debe ser DNI o RUC.');
if (($tipo === 'DNI' && !preg_match('/^\d{8}$/', $numero)) || ($tipo === 'RUC' && !preg_match('/^\d{11}$/', $numero))) {
    throw new ApiError($tipo === 'DNI' ? 'El DNI debe tener 8 dígitos.' : 'El RUC debe tener 11 dígitos.');
}
try {
    $service = new FactilizaConsultaService();
    if (!$service->disponible()) throw new ApiError('La integración con Factiliza no está configurada en el servidor.', 503);
    responder($tipo === 'DNI' ? $service->consultarDni($numero) : $service->consultarRuc($numero));
} catch (ApiError $e) {
    throw $e;
} catch (RuntimeException $e) {
    // No se registra el DNI/RUC ni el token en logs.
    throw new ApiError($e->getMessage(), 502);
}
