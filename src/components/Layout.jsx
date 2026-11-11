import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCarrito } from '../context/CarritoContext'
import Header from './Header'
import Footer from './Footer'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { productoAgregado, cerrarModalAgregado } = useCarrito()
  const { authError, authReady } = useAuth()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Header variante={pathname === '/carrito' ? 'simple' : 'completo'} />
      {authReady && authError && (
        <div className="container mt-3">
          <div className="alert alert-warning" role="alert">{authError}</div>
        </div>
      )}
      <Outlet />
      <Footer />

      {productoAgregado && (
        <Modal
          emoji="🛒"
          titulo="¡Agregado al Carrito!"
          botones={[
            { texto: 'Seguir Comprando', variante: 'secundario', onClick: cerrarModalAgregado },
            {
              texto: 'Ver Carrito',
              onClick: () => {
                cerrarModalAgregado()
                navigate('/carrito')
              },
            },
          ]}
        >
          Has añadido <strong>{productoAgregado.nombre}</strong> ({productoAgregado.marca}) a tu
          pedido con éxito.
        </Modal>
      )}
    </>
  )
}
