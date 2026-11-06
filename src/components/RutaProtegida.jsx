import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ rol, mensaje, redirigirA, children }) {
  const { sesion, authReady } = useAuth()
  const permitido = authReady && Boolean(sesion) && (!rol || sesion.rol === rol)
  const avisado = useRef(false)

  useEffect(() => {
    if (authReady && !permitido && !avisado.current) {
      avisado.current = true
      alert(mensaje)
    }
  }, [authReady, permitido, mensaje])

  if (!authReady) return <p role="status">Verificando sesión...</p>
  if (!permitido) return <Navigate to={redirigirA} replace />
  return children
}