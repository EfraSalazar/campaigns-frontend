import Swal from 'sweetalert2'

const BRAND = '#1f2d3d'
const DANGER = '#c0392b'
const GREY = '#94a3b8'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true
})

export function toastSuccess(title) {
  return toast.fire({ icon: 'success', title })
}

export function toastError(title) {
  return toast.fire({ icon: 'error', title, timer: 4500 })
}

export function toastInfo(title) {
  return toast.fire({ icon: 'info', title })
}

export async function confirmAction({
  title,
  text,
  html,
  confirmText = 'Confirmar',
  icon = 'warning',
  danger = false
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: danger ? DANGER : BRAND,
    cancelButtonColor: GREY,
    reverseButtons: true
  })
  return result.isConfirmed
}

export async function promptText({
  title,
  inputLabel,
  inputPlaceholder,
  inputValue = '',
  confirmText = 'Guardar'
} = {}) {
  const result = await Swal.fire({
    title,
    input: 'text',
    inputLabel,
    inputPlaceholder,
    inputValue,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: BRAND,
    cancelButtonColor: GREY,
    reverseButtons: true,
    inputValidator: (value) => (!value || !value.trim() ? 'Escribe un valor.' : undefined)
  })
  return result.isConfirmed ? result.value.trim() : null
}

export function successModal({ title, html, text }) {
  return Swal.fire({
    icon: 'success',
    title,
    html,
    text,
    confirmButtonColor: BRAND,
    confirmButtonText: 'Entendido'
  })
}
