import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { limpiarRun, validarRutChileno } from '../utils/rut'
import Espacio from '../components/Espacio'
import Modal from '../components/Modal'

const VALORES_INICIALES = {
  run: '',
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  confirm: '',
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Registro() {
  const { registrar } = useAuth()
  const navigate = useNavigate()

  const [valores, setValores] = useState(VALORES_INICIALES)
  const [errores, setErrores] = useState({})
  const [registrado, setRegistrado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => {
    const valor = campo === 'run' ? limpiarRun(e.target.value) : e.target.value
    setValores((prev) => ({ ...prev, [campo]: valor }))
  }

  const manejarSubmit = async (e) => {
    e.preventDefault()

    const run = valores.run.trim()
    const nombre = valores.nombre.trim()
    const email = valores.email.trim()
    const telefono = valores.telefono.trim()
    const { password, confirm } = valores

    const nuevosErrores = {}

    if (!validarRutChileno(run)) {
      nuevosErrores.run = 'El RUN ingresado no es válido (ej: 12345678-5).'
    }
    if (nombre.length < 3) {
      nuevosErrores.nombre = 'Ingrese un nombre y apellido válido.'
    }
    if (!REGEX_EMAIL.test(email)) {
      nuevosErrores.email = 'Ingrese un correo electrónico válido.'
    }
    if (telefono.length < 9) {
      nuevosErrores.telefono = 'Ingrese un teléfono de contacto válido.'
    }
    if (password.length < 8 || password.length > 72) {
      nuevosErrores.password = 'La contraseña debe tener entre 8 y 72 caracteres.'
    } else if (password !== confirm) {
      nuevosErrores.confirm = 'Las contraseñas no coinciden.'
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setEnviando(true)
    try {
      await registrar({ run, nombre, email, telefono, password })
      setErrores({})
      setRegistrado(true)
    } catch (error) {
      setErrores({ ...error.details, formulario: error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="container my-5">
      <div className="row justify-content-center">
      <div className="col-12 col-md-9 col-lg-7">
      <div className="card shadow-sm">
      <div className="card-body p-4 p-md-5">
        <h2 className="h3 fw-bold mb-1">
          Crear Cuenta de Cliente
        </h2>
        <p className="text-secondary small mb-4">
          Regístrate para comprar instrumentos y gestionar tus despachos.
        </p>

        <form onSubmit={manejarSubmit} noValidate>
          {errores.formulario && (
            <div className="alert alert-danger" role="alert">{errores.formulario}</div>
          )}
          <Espacio
            id="run"
            label="RUN (Sin puntos y con guion)"
            type="text"
            maxLength={10}
            placeholder="Ej: 12345678-5"
            value={valores.run}
            onChange={cambiar('run')}
            error={errores.run}
          />
          <Espacio
            id="nombre"
            label="Nombre Completo"
            type="text"
            placeholder="Nombre y Apellido"
            value={valores.nombre}
            onChange={cambiar('nombre')}
            error={errores.nombre}
          />
          <Espacio
            id="email"
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@correo.cl"
            value={valores.email}
            onChange={cambiar('email')}
            error={errores.email}
          />
          <Espacio
            id="telefono"
            label="Teléfono de Contacto"
            type="tel"
            maxLength={12}
            placeholder="+56 9 1234 5678"
            value={valores.telefono}
            onChange={cambiar('telefono')}
            error={errores.telefono}
          />
          <Espacio
            id="password"
            label="Contraseña (Mínimo 8 caracteres)"
            type="password"
            maxLength={72}
            autoComplete="new-password"
            value={valores.password}
            onChange={cambiar('password')}
            error={errores.password}
          />
          <Espacio
            id="confirm-password"
            label="Confirmar Contraseña"
            type="password"
            maxLength={72}
            autoComplete="new-password"
            margen="1.8rem"
            value={valores.confirm}
            onChange={cambiar('confirm')}
            error={errores.confirm}
          />

          <button
            type="submit"
            className="btn btn-warning w-100 fw-bold py-2 mb-3"
            disabled={enviando}
          >
            {enviando ? 'Registrando...' : 'Registrarme'}
          </button>
        </form>
      </div>
      </div>
      </div>
      </div>

      {registrado && (
        <Modal
          emoji="🎸"
          titulo="¡Cuenta Creada con Éxito!"
          botones={[{ texto: 'Ir a Iniciar Sesión', onClick: () => navigate('/login') }]}
        > Bienvenido a Sonido Vivo. Ya puedes iniciar sesión para gestionar tus pedidos.
        </Modal>
      )}
    </main>
  )
}