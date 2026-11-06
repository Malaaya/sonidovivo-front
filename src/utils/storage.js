export const CLAVES = {
  productos: 'sonido_vivo_productos',
  carrito: 'sonido_vivo_carrito',
  usuarios: 'sonido_vivo_usuarios',
  sesion: 'sonido_vivo_sesion',
  refreshToken: 'sonido_vivo_refresh_token',
  historial: (run) => `historial_${run}`,
}

export function leer(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave)
    if (valor === null) return porDefecto
    return JSON.parse(valor) ?? porDefecto
  } catch {
    return porDefecto
  }
}

export function guardar(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor))
}

export function eliminar(clave) {
  localStorage.removeItem(clave)
}
