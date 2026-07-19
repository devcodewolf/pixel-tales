/**
 * Middleware de validación del Content-Type para rutas POST/PUT/PATCH.
 * Rechaza peticiones que no envíen JSON.
 */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireJson(req, res, next) {
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (methodsWithBody.includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({
      error: 'El Content-Type debe ser application/json.',
    });
  }
  next();
}
