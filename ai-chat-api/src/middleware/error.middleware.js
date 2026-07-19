/**
 * Middleware de manejo centralizado de errores.
 * Debe registrarse al final de la cadena de middlewares de Express.
 */

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.path} →`, err.message);

  // Errores de cuota / todos los proveedores no disponibles
  if (err.message?.includes('proveedores')) {
    return res.status(503).json({
      error: err.message,
      code: 'PROVIDERS_UNAVAILABLE',
    });
  }

  // Errores de proveedor individuales (no cuota)
  if (err.name === 'ProviderError') {
    return res.status(502).json({
      error: 'Error en el proveedor de IA.',
      detail: err.message,
      provider: err.providerId,
    });
  }

  // Error genérico
  const status = err.statusCode ?? err.status ?? 500;
  return res.status(status).json({
    error: err.message ?? 'Error interno del servidor.',
  });
}
