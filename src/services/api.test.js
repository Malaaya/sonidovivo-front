import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_URL,
  apiRequest,
  cerrarSesion,
  iniciarSesion,
  registrarUsuario,
  restaurarSesion,
} from './api'
import { CLAVES } from '../utils/storage'

const usuario = {
  id: 7,
  run: '12345678-5',
  nombre: 'Cliente de Prueba',
  email: 'cliente@sonidovivo.cl',
  telefono: null,
  rol: 'CLIENTE',
}

const respuestaAuth = (accessToken, refreshToken) => ({
  accessToken,
  refreshToken,
  tokenType: 'Bearer',
  usuario,
})

const respuesta = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (data === null ? '' : JSON.stringify(data)),
})

describe('servicio de autenticación API', () => {
  beforeEach(() => {
    localStorage.clear()
    cerrarSesion()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cerrarSesion()
    vi.unstubAllGlobals()
  })

  it('inicia sesión con correo y guarda solo el refresh token', async () => {
    fetch.mockResolvedValueOnce(respuesta(respuestaAuth('access-1', 'refresh-1')))

    const sesion = await iniciarSesion('cliente@sonidovivo.cl', 'clave-segura')

    expect(sesion.rol).toBe('cliente')
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'cliente@sonidovivo.cl', password: 'clave-segura' }),
      }),
    )
    expect(localStorage.getItem(CLAVES.refreshToken)).toBe('"refresh-1"')
    expect(localStorage.getItem(CLAVES.sesion)).toBeNull()
  })

  it('registra la cuenta usando el contrato del backend sin persistir tokens', async () => {
    const datos = {
      run: '12345678-5',
      nombre: 'Cliente de Prueba',
      email: 'cliente@sonidovivo.cl',
      telefono: '56912345678',
      password: 'clave-segura',
    }
    fetch.mockResolvedValueOnce(respuesta(respuestaAuth('access-1', 'refresh-1'), 201))

    const nuevoUsuario = await registrarUsuario(datos)

    expect(nuevoUsuario).toMatchObject({ email: datos.email, rol: 'cliente' })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/registro`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(datos) }),
    )
    expect(localStorage.getItem(CLAVES.refreshToken)).toBeNull()
  })

  it('restaura la sesión con el refresh token tras recargar', async () => {
    localStorage.setItem(CLAVES.refreshToken, JSON.stringify('refresh-old'))
    fetch.mockResolvedValueOnce(respuesta(respuestaAuth('access-new', 'refresh-new')))

    const sesion = await restaurarSesion()

    expect(sesion).toMatchObject({ id: usuario.id, rol: 'cliente' })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/refresh`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-old' }),
      }),
    )
    expect(localStorage.getItem(CLAVES.refreshToken)).toBe('"refresh-new"')
  })

  it('renueva un access token rechazado y reintenta la solicitud protegida', async () => {
    fetch
      .mockResolvedValueOnce(respuesta(respuestaAuth('access-old', 'refresh-old')))
      .mockResolvedValueOnce(respuesta({ mensaje: 'Token vencido' }, 401))
      .mockResolvedValueOnce(respuesta(respuestaAuth('access-new', 'refresh-new')))
      .mockResolvedValueOnce(respuesta({ ok: true }))
    await iniciarSesion('cliente@sonidovivo.cl', 'clave-segura')

    await expect(apiRequest('/auth/me')).resolves.toEqual({ ok: true })

    expect(fetch).toHaveBeenCalledTimes(4)
    expect(fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer access-old')
    expect(fetch.mock.calls[2][0]).toBe(`${API_URL}/auth/refresh`)
    expect(fetch.mock.calls[3][1].headers.get('Authorization')).toBe('Bearer access-new')
  })
})
