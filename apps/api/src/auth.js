// Autenticación: usuarios definidos por variables de entorno, contraseñas con
// bcrypt en memoria y JWT de 8 horas (ADR de autenticación, sección 7.5).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ErrorApi } from "./errores.js";

export class Autenticacion {
  constructor({ usuarios, jwt: cfg }) {
    this.cfg = cfg;
    this.usuarios = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email.toLowerCase(),
      rol: u.rol,
      activo: true,
      ultimoAcceso: null,
      hash: bcrypt.hashSync(u.password, 10),
    }));
    this.hashFicticio = bcrypt.hashSync("sin-usuario-" + Math.random(), 10);
  }

  publico(u) {
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo, ultimoAcceso: u.ultimoAcceso };
  }

  async login(email, password) {
    const u = this.usuarios.find((x) => x.email === String(email ?? "").toLowerCase());
    // Se compara siempre para no revelar por tiempo si el correo existe.
    const ok = await bcrypt.compare(String(password ?? ""), u?.hash ?? this.hashFicticio);
    if (!u || !ok || !u.activo) {
      throw new ErrorApi(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
    }
    u.ultimoAcceso = new Date().toISOString();
    const expiraEn = new Date(Date.now() + this.cfg.expiraHoras * 3600 * 1000).toISOString();
    const token = jwt.sign({ sub: String(u.id), rol: u.rol }, this.cfg.secreto, {
      expiresIn: `${this.cfg.expiraHoras}h`,
    });
    return { token, expiraEn, usuario: this.publico(u) };
  }

  /** Middleware: exige un Bearer válido y deja req.usuario. */
  requerir() {
    return (req, _res, next) => {
      const cab = req.headers.authorization ?? "";
      const token = cab.startsWith("Bearer ") ? cab.slice(7) : null;
      if (!token) return next(new ErrorApi(401, "UNAUTHORIZED", "Sesión no válida o expirada"));
      try {
        const datos = jwt.verify(token, this.cfg.secreto);
        const u = this.usuarios.find((x) => String(x.id) === datos.sub);
        if (!u || !u.activo) throw new Error("usuario inactivo");
        req.usuario = this.publico(u);
        return next();
      } catch {
        return next(new ErrorApi(401, "UNAUTHORIZED", "Sesión no válida o expirada"));
      }
    };
  }

  static rol(...roles) {
    return (req, _res, next) =>
      roles.includes(req.usuario?.rol)
        ? next()
        : next(new ErrorApi(403, "FORBIDDEN", "No tiene permiso para esta operación"));
  }
}
