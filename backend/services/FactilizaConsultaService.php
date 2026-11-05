<?php
declare(strict_types=1);

/** Cliente server-side para API Consulta y API Facturación de Factiliza. */
final class FactilizaConsultaService
{
    private string $token;
    private string $consultaBaseUrl;
    private string $facturacionBaseUrl;
    private int $timeout;

    public function __construct()
    {
        $this->cargarArchivoConfiguracion();
        $this->token = trim((string) getenv('FACTILIZA_TOKEN'));
        $ambiente = strtolower(trim((string) (getenv('FACTILIZA_ENV') ?: 'qa')));
        $this->consultaBaseUrl = rtrim((string) (getenv('FACTILIZA_CONSULTA_URL') ?: 'https://api.factiliza.com'), '/');
        $this->facturacionBaseUrl = rtrim((string) (getenv('FACTILIZA_FACTURACION_URL') ?: ($ambiente === 'produccion' ? 'https://apife.factiliza.com' : 'https://apife-qa.factiliza.com')), '/');
        $this->timeout = max(5, (int) (getenv('FACTILIZA_TIMEOUT') ?: 20));
    }

    private function cargarArchivoConfiguracion(): void
    {
        $ruta = (string) (getenv('FACTILIZA_ENV_FILE') ?: __DIR__ . '/../config/factiliza.example.env');
        if (!is_readable($ruta)) return;
        foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $linea) {
            $linea = trim($linea);
            if ($linea === '' || str_starts_with($linea, '#') || !str_contains($linea, '=')) continue;
            [$nombre, $valor] = explode('=', $linea, 2);
            $nombre = trim($nombre);
            $valor = trim($valor);
            if ($nombre !== '' && getenv($nombre) === false) putenv($nombre . '=' . trim($valor, "\\\"'"));
        }
    }

    public function disponible(): bool { return $this->token !== ''; }

    public function consultarDni(string $dni): array
    {
        $this->validar('/^\d{8}$/', $dni, 'El DNI debe tener 8 dígitos.');
        return $this->request('GET', $this->consultaBaseUrl . '/v1/dni/info/' . rawurlencode($dni));
    }

    public function consultarRuc(string $ruc): array
    {
        $this->validar('/^\d{11}$/', $ruc, 'El RUC debe tener 11 dígitos.');
        return $this->request('GET', $this->consultaBaseUrl . '/v1/ruc/info/' . rawurlencode($ruc));
    }

    public function emitirComprobante(array $payload): array
    {
        return $this->request('POST', $this->facturacionBaseUrl . '/api/v1/invoice/send', $payload);
    }

    public function descargarComprobante(string $recurso, array $payload): array
    {
        if (!in_array($recurso, ['pdf', 'xml', 'cdr'], true)) throw new RuntimeException('Recurso de comprobante no permitido.');
        return $this->request('POST', $this->facturacionBaseUrl . '/api/v1/invoice/' . $recurso, $payload);
    }

    private function validar(string $patron, string $valor, string $mensaje): void
    {
        if (!preg_match($patron, $valor)) throw new RuntimeException($mensaje);
        if (!$this->disponible()) throw new RuntimeException('La integración con Factiliza no está configurada en el servidor.');
    }

    private function request(string $metodo, string $url, ?array $payload = null): array
    {
        if (!$this->disponible()) throw new RuntimeException('La integración con Factiliza no está configurada en el servidor.');
        $ch = curl_init($url);
        $opciones = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $metodo, CURLOPT_TIMEOUT => $this->timeout, CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $this->token, 'Accept: application/json', 'Content-Type: application/json']];
        if ($payload !== null) $opciones[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        curl_setopt_array($ch, $opciones);
        $body = curl_exec($ch);
        $curlError = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $curlError !== '') throw new RuntimeException('Factiliza no respondió. Intenta nuevamente.');
        $json = json_decode((string) $body, true);
        if (!is_array($json)) throw new RuntimeException('Factiliza devolvió una respuesta no válida.');
        if ($status >= 400 || ($json['success'] ?? false) !== true) throw new RuntimeException((string) ($json['message'] ?? 'Factiliza rechazó la solicitud.'));
        return $json;
    }
}
