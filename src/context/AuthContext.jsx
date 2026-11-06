import { createContext, useContext, useEffect, useState } from 'react'
import {
  apiRequest,
  cerrarSesion as limpiarTokens,
  iniciarSesion,
  registrarUsuario,
  restaurarSesion,
} from '../services/api'
import { CLAVES, eliminar } from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuarios, setUsuarios] = useState([])
  const [sesion, setSesion] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let activo = true

    eliminar(CLAVES.sesion)
    eliminar(CLAVES.usuarios)

    restaurarSesion()
      .then((usuario) => {
        if (activo) setSesion(usuario)
      })
      .catch((error) => {
        if (activo) setAuthError(error.message)
      })
      .finally(() => {
        if (activo) setAuthReady(true)
      })

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (sesion?.rol !== 'admin') return

    let activo = true
    apiRequest('/usuarios')
      .then((usuariosApi) => {
        if (activo) setUsuarios(usuariosApi.filter((usuario) => usuario.rol === 'CLIENTE'))
      })
      .catch((error) => {
        if (activo) setAuthError(error.message)
      })

    return () => {
      activo = false
    }
  }, [sesion?.rol])

  const registrar = (usuario) => registrarUsuario({
    ...usuario,
    email: usuario.email.trim().toLowerCase(),
    run: usuario.run.trim().toUpperCase(),
  })

  const login = async (email, password) => {
    const usuario = await iniciarSesion(email.trim().toLowerCase(), password)
    setAuthError('')
    setSesion(usuario)
    return usuario
  }

  const logout = () => {
    limpiarTokens()
    setSesion(null)
    setUsuarios([])
    setAuthError('')
  }

  return (
    <AuthContext.Provider
      value={{
        usuarios: sesion?.rol === 'admin' ? usuarios : [],
        sesion,
        usuario: sesion,
        esAdmin: sesion?.rol === 'admin',
        authReady,
        authError,
        registrar,
        login,
        logout,
        cerrarSesion: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}