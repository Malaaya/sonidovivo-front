import { CLAVES, eliminar, leer, guardar } from '../utils/storage'

export const API_URL = 'http://localhost:8081/api/v1'

let accessToken = null
let refreshInProgress = null
let authVersion = 0

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function leerRespuesta(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('El servidor devolvió una respuesta inválida.', response.status)
  }
}

async function enviar(path, { method = 'GET', body, token } = {}) {
  const headers = new Headers()
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose.',
        { cause: error },
      )
    }
    throw error
  }

  const data = await leerRespuesta(response)
  if (!response.ok) {
    throw new ApiError(
      data?.mensaje || `La solicitud falló (${response.status}).`,
      response.status,
      data?.detalles,
    )
  }
  return data
}

function guardarTokens(respuesta) {
  if (!respuesta?.accessToken || !respuesta?.refreshToken || !respuesta?.usuario) {
    throw new Error('El servidor devolvió una respuesta de autenticación incompleta.')
  }
  guardar(CLAVES.refreshToken, respuesta.refreshToken)
  accessToken = respuesta.accessToken
  authVersion += 1
  return respuesta.usuario
}

function normalizarUsuario(usuario) {
  return {
    ...usuario,
    rol: usuario.rol.toLowerCase(),
  }
}

async function renovarTokens() {
  if (!refreshInProgress) {
    const refreshToken = leer(CLAVES.refreshToken, null)
    if (!refreshToken) {
      accessToken = null
      return null
    }

    const version = authVersion
    refreshInProgress = enviar('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    })
      .then((respuesta) => {
        if (authVersion !== version) return null
        return normalizarUsuario(guardarTokens(respuesta))
      })
      .catch((error) => {
        if (authVersion === version && error instanceof ApiError && error.status === 401) {
          cerrarSesion()
        }
        throw error
      })
      .finally(() => {
        refreshInProgress = null
      })
  }
  return refreshInProgress
}

export async function apiRequest(path, options = {}) {
  const { authenticated = true, ...requestOptions } = options
  try {
    return await enviar(path, {
      ...requestOptions,
      token: authenticated ? accessToken : null,
    })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !authenticated || !accessToken) {
      throw error
    }

    const usuario = await renovarTokens()
    if (!usuario || !accessToken) throw error

    return enviar(path, { ...requestOptions, token: accessToken })
  }
}

export async function iniciarSesion(email, password) {
  const respuesta = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    authenticated: false,
  })
  return normalizarUsuario(guardarTokens(respuesta))
}

export async function registrarUsuario(datos) {
  const respuesta = await apiRequest('/auth/registro', {
    method: 'POST',
    body: datos,
    authenticated: false,
  })
  if (!respuesta?.usuario) {
    throw new Error('El servidor no devolvió los datos de la cuenta registrada.')
  }
  return normalizarUsuario(respuesta.usuario)
}

export async function restaurarSesion() {
  if (!leer(CLAVES.refreshToken, null)) return null
  try {
    return await renovarTokens()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function cerrarSesion() {
  authVersion += 1
  accessToken = null
  eliminar(CLAVES.refreshToken)
}
