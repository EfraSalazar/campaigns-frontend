// Estado y lógica compartidos del panel. Módulo singleton: las vistas importan lo que
// necesitan y todas ven el mismo estado (patrón composable, sin Pinia).
import { computed, reactive, ref } from 'vue'
import {
  confirmAction,
  promptText,
  successModal,
  toastError,
  toastSuccess
} from './services/alerts'
import {
  addRecipientsByIds,
  addRecipientsFromFilter,
  cancelCampaignSchedule,
  clearRecipients,
  createCampaign,
  deleteCampaign,
  deleteAttachment,
  deleteSegment,
  duplicateCampaignRequest,
  getAttachments,
  getCampaign,
  getCampaignLogs,
  getCampaigns,
  getRenderedPreview,
  getSegments,
  getContacts,
  getEvents,
  getHealth,
  getRecipients,
  getToken,
  login,
  previewRecipients,
  removeRecipientById,
  saveSegment,
  scheduleCampaign,
  sendCampaignRequest,
  setToken,
  setUnauthorizedHandler,
  updateCampaign,
  uploadAttachment
} from './services/api'

// ── Autenticación ────────────────────────────────────────────────────────────
export const authed = ref(Boolean(getToken()))
export const currentUser = ref(localStorage.getItem('campaignsUser') || '')
export const loginForm = reactive({ username: '', password: '' })
export const loggingIn = ref(false)
export const loginError = ref('')

// ── UI global ────────────────────────────────────────────────────────────────
export const activeView = ref('contacts')
export const healthOk = ref(false)
export const error = ref('')
export const schemaWarning = ref('')
export const testMode = reactive({ active: false, email: '', phone: '' })

// ── Datos ────────────────────────────────────────────────────────────────────
export const events = ref([])
export const contacts = ref([])
export const contactsTotal = ref(0)
export const campaigns = ref([])
export const selectedCampaign = ref(null)
export const recipients = ref([])
export const attachments = ref([])
export const preview = reactive({ total: 0, sample: [] })
export const candidates = ref([])
export const selectedIds = ref([])
export const segmentBy = ref('none')
export const sending = ref(false)
export const sendResult = ref(null)
export const sendChannel = ref('Email')
export const campaignAttachments = ref([])
export const uploadingFile = ref(false)
export const savedSegments = ref([])
export const editingCampaign = ref(null)
export const showOnlySelected = ref(false)
export const scheduleForm = reactive({ at: '' })
export const recipientSearch = ref('')
export const campaignLogs = ref([])
export const loadingLogs = ref(false)
export const renderedPreview = ref(null)

export const filters = reactive({
  search: '',
  city: '',
  state: '',
  church: '',
  eventId: '',
  excludeRegisteredEventId: '',
  requireConsent: false,
  consentPurpose: 'IntimosEvents',
  consentChannel: 'WhatsApp',
  limit: 100,
  offset: 0
})

export const campaignForm = reactive({
  name: '',
  purpose: 'IntimosEvents',
  channel: 'WhatsApp',
  subject: '',
  messageTemplate: '',
  createdBy: 'admin'
})

setUnauthorizedHandler(() => {
  // El token venció o es inválido: forzar nuevo login.
  setToken('')
  authed.value = false
})

// ── Computados ───────────────────────────────────────────────────────────────
// Cuenta los que aún NO recibieron con éxito por el canal seleccionado (multicanal).
export const channelStatusKey = computed(() =>
  sendChannel.value === 'WhatsApp' ? 'whatsAppStatus' : 'emailStatus'
)

export const pendingCount = computed(
  () => recipients.value.filter((r) => r[channelStatusKey.value] !== 'Sent').length
)

export function statusCount(status) {
  return recipients.value.filter((r) => r[channelStatusKey.value] === status).length
}

// Buscador de la tabla de destinatarios (Paso 3).
export const filteredRecipients = computed(() => {
  const q = recipientSearch.value.trim().toLowerCase()
  if (!q) return recipients.value
  return recipients.value.filter((r) => (r.fullName || '').toLowerCase().includes(q))
})

// Progreso del envío en curso (se actualiza con el polling cada 4s).
export const sendProgress = computed(() => {
  const total = recipients.value.length
  if (!total) return { done: 0, total: 0, pct: 0 }
  const done = recipients.value.filter((r) => {
    const s = r[channelStatusKey.value]
    return s === 'Sent' || s === 'Failed'
  }).length
  return { done, total, pct: Math.round((done / total) * 100) }
})

export const channelLabel = computed(() =>
  selectedCampaign.value?.channel === 'Email' ? 'correo' : 'teléfono'
)

export function channelValue(contact) {
  return selectedCampaign.value?.channel === 'Email' ? contact.email : contact.phoneNumber
}

export function hasChannel(contact) {
  return Boolean(channelValue(contact))
}

export const selectableCount = computed(() => candidates.value.filter(hasChannel).length)

export const visibleCandidates = computed(() => {
  if (!showOnlySelected.value) return candidates.value
  const sel = new Set(selectedIds.value)
  return candidates.value.filter((c) => sel.has(c.id))
})

export const segmentedCandidates = computed(() => {
  const list = visibleCandidates.value
  if (segmentBy.value === 'none') {
    // Seleccionados al inicio
    const sel = new Set(selectedIds.value)
    const selected = list.filter((c) => sel.has(c.id))
    const rest = list.filter((c) => !sel.has(c.id))
    return [{ key: 'all', label: 'Todos', items: [...selected, ...rest] }]
  }
  const groups = new Map()
  for (const contact of list) {
    const label = groupLabel(contact)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(contact)
  }
  return [...groups.entries()]
    .map(([label, items]) => ({ key: label, label: `${label} (${items.length})`, items }))
    .sort((a, b) => b.items.length - a.items.length)
})

function groupLabel(contact) {
  switch (segmentBy.value) {
    case 'city':
      return contact.city || 'Sin ciudad'
    case 'state':
      return contact.state || 'Sin estado'
    case 'church':
      return contact.church || 'Sin iglesia'
    case 'event': {
      const n = contact.registrationCount || 0
      if (n <= 1) return '1 evento'
      if (n === 2) return '2 eventos'
      return '3+ eventos'
    }
    default:
      return 'Todos'
  }
}

// ── Sesión ───────────────────────────────────────────────────────────────────
export async function loadAll() {
  await safeLoad(async () => {
    const health = await getHealth()
    healthOk.value = health.database === 'ok'
    testMode.active = Boolean(health.testMode)
    testMode.email = health.testEmail || ''
    testMode.phone = health.testPhone || ''
  })
  await Promise.all([loadEvents(), loadContacts(), loadCampaigns(), loadSegments()])
}

export async function doLogin() {
  loginError.value = ''
  loggingIn.value = true
  try {
    const result = await login(loginForm.username.trim(), loginForm.password)
    setToken(result.token)
    currentUser.value = result.fullName || loginForm.username
    localStorage.setItem('campaignsUser', currentUser.value)
    authed.value = true
    loginForm.password = ''
    await loadAll()
  } catch (err) {
    const status = err?.response?.status
    if (status === 403) loginError.value = 'Acceso restringido a administradores.'
    else if (status === 401) loginError.value = 'Credenciales incorrectas.'
    else loginError.value = formatError(err)
  } finally {
    loggingIn.value = false
  }
}

export function logout() {
  setToken('')
  localStorage.removeItem('campaignsUser')
  currentUser.value = ''
  authed.value = false
}

// ── Cargas de datos ──────────────────────────────────────────────────────────
export async function loadEvents() {
  await safeLoad(async () => {
    events.value = await getEvents()
  })
}

export async function loadContacts() {
  await safeLoad(async () => {
    const response = await getContacts(filters)
    contacts.value = response.items || []
    contactsTotal.value = response.total || 0
  })
}

export async function loadCampaigns() {
  try {
    schemaWarning.value = ''
    campaigns.value = await getCampaigns()
  } catch (err) {
    const message = formatError(err)
    if (message.includes('Campaigns') || message.includes('tablas de campañas')) {
      schemaWarning.value =
        'Las tablas de campañas todavía no están creadas en la base. Contactos y eventos sí pueden consultarse; para guardar borradores hay que aplicar sql/create_campaign_tables.sql.'
      campaigns.value = []
      return
    }

    error.value = message
  }
}

export async function loadSegments() {
  await safeLoad(async () => {
    savedSegments.value = await getSegments()
  })
}

// ── Segmentos guardados ──────────────────────────────────────────────────────
export async function saveCurrentSegment() {
  const name = await promptText({
    title: 'Guardar segmento',
    inputLabel: 'Nombre del segmento',
    inputPlaceholder: 'Ej. Fieles 3+ Monterrey'
  })
  if (!name) return
  await safeLoad(async () => {
    const snapshot = {
      search: filters.search,
      eventId: filters.eventId,
      excludeRegisteredEventId: filters.excludeRegisteredEventId,
      city: filters.city,
      state: filters.state,
      church: filters.church,
      requireConsent: filters.requireConsent
    }
    await saveSegment(name, snapshot, segmentBy.value)
    await loadSegments()
    toastSuccess(`Segmento "${name}" guardado`)
  })
}

export async function applySegment(seg) {
  const f = seg.filters || {}
  filters.search = f.search || ''
  filters.eventId = f.eventId ?? ''
  filters.excludeRegisteredEventId = f.excludeRegisteredEventId ?? ''
  filters.city = f.city || ''
  filters.state = f.state || ''
  filters.church = f.church || ''
  filters.requireConsent = Boolean(f.requireConsent)
  segmentBy.value = seg.segmentBy || 'none'
  await previewCampaignRecipients()
}

export async function removeSegment(id) {
  const seg = savedSegments.value.find((s) => s.id === id)
  const ok = await confirmAction({
    title: '¿Eliminar segmento?',
    text: seg ? `Se eliminará "${seg.name}".` : 'Se eliminará el segmento.',
    confirmText: 'Eliminar',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    await deleteSegment(id)
    await loadSegments()
    toastSuccess('Segmento eliminado')
  })
}

// ── Adjuntos ─────────────────────────────────────────────────────────────────
export async function loadCampaignAttachments() {
  if (!selectedCampaign.value) {
    campaignAttachments.value = []
    return
  }
  campaignAttachments.value = await getAttachments(selectedCampaign.value.id)
}

export async function onUploadAttachment(event) {
  const file = event.target.files && event.target.files[0]
  if (!file || !selectedCampaign.value) return
  uploadingFile.value = true
  await safeLoad(async () => {
    await uploadAttachment(selectedCampaign.value.id, file)
    await loadCampaignAttachments()
    toastSuccess(`Adjunto "${file.name}" subido`)
  })
  uploadingFile.value = false
  event.target.value = ''
}

export async function removeAttachment(attachmentId) {
  if (!selectedCampaign.value) return
  const att = campaignAttachments.value.find((a) => a.id === attachmentId)
  const ok = await confirmAction({
    title: '¿Quitar adjunto?',
    text: att ? `Se quitará "${att.fileName}".` : 'Se quitará el adjunto.',
    confirmText: 'Quitar',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    await deleteAttachment(selectedCampaign.value.id, attachmentId)
    await loadCampaignAttachments()
    toastSuccess('Adjunto eliminado')
  })
}

// ── Campañas (CRUD) ──────────────────────────────────────────────────────────
export async function saveCampaign() {
  if (schemaWarning.value) {
    error.value = 'Primero hay que crear las tablas de campañas en la base de datos.'
    return
  }

  await safeLoad(async () => {
    if (editingCampaign.value) {
      const updated = await updateCampaign(editingCampaign.value.id, campaignForm)
      if (selectedCampaign.value?.id === updated.id) selectedCampaign.value = updated
      editingCampaign.value = null
      resetCampaignForm()
      await loadCampaigns()
      toastSuccess('Campaña actualizada')
    } else {
      const campaign = await createCampaign(campaignForm)
      selectedCampaign.value = campaign
      sendChannel.value = campaign.channel || 'Email'
      await loadCampaignAttachments()
      await loadCampaigns()
      activeView.value = 'review'
    }
  })
}

export function editCampaign(campaign) {
  editingCampaign.value = campaign
  campaignForm.name = campaign.name
  campaignForm.purpose = campaign.purpose
  campaignForm.channel = campaign.channel
  campaignForm.subject = campaign.subject || ''
  campaignForm.messageTemplate = campaign.messageTemplate
}

export function cancelEdit() {
  editingCampaign.value = null
  resetCampaignForm()
}

export async function goToReview() {
  if (editingCampaign.value) {
    const ok = await confirmAction({
      title: 'Cambios sin guardar',
      text: 'Tienes cambios en la campaña sin guardar. ¿Guardar antes de continuar?',
      confirmText: 'Guardar y continuar',
      icon: 'warning'
    })
    if (ok) {
      await saveCampaign()
      if (editingCampaign.value) return // save falló
    } else {
      cancelEdit()
    }
  }
  activeView.value = 'review'
}

function resetCampaignForm() {
  campaignForm.name = ''
  campaignForm.purpose = 'IntimosEvents'
  campaignForm.channel = 'WhatsApp'
  campaignForm.subject = ''
  campaignForm.messageTemplate = ''
}

export async function removeCampaign(campaign) {
  const ok = await confirmAction({
    title: '¿Eliminar campaña?',
    html: `Se eliminará <strong>${campaign.name}</strong> junto con todos sus destinatarios y adjuntos. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    await deleteCampaign(campaign.id)
    if (selectedCampaign.value?.id === campaign.id) {
      selectedCampaign.value = null
      recipients.value = []
      campaignAttachments.value = []
    }
    if (editingCampaign.value?.id === campaign.id) cancelEdit()
    await loadCampaigns()
    toastSuccess(`Campaña "${campaign.name}" eliminada`)
  })
}

export async function selectCampaign(campaign) {
  selectedCampaign.value = campaign
  sendChannel.value = campaign.channel || 'Email'
  recipients.value = await getRecipients(campaign.id)
  await loadCampaignAttachments()
  sendResult.value = null
  candidates.value = []
  selectedIds.value = []
  showOnlySelected.value = false
  recipientSearch.value = ''
  campaignLogs.value = []
  renderedPreview.value = null
  activeView.value = 'review'
}

export function insertTemplate() {
  campaignForm.messageTemplate =
    'Hola {nombre}, queremos invitarte a conocer más sobre {evento}. Si estás en {ciudad}, nos encantaría verte ahí.'
}

export function handleFiles(event) {
  attachments.value = Array.from(event.target.files || [])
}

// ── Destinatarios (Paso 1) ───────────────────────────────────────────────────
export async function previewCampaignRecipients() {
  if (!selectedCampaign.value) return
  await safeLoad(async () => {
    const response = await previewRecipients(selectedCampaign.value.id, { ...filters, limit: 2000 })
    preview.total = response.total || 0
    preview.sample = response.sample || []
    candidates.value = response.sample || []
    // mantener solo selecciones que sigan presentes
    const visible = new Set(candidates.value.map((c) => c.id))
    selectedIds.value = selectedIds.value.filter((id) => visible.has(id))
  })
}

export function toggleExcludeRegistered(checked) {
  if (checked) {
    const active = events.value.find((e) => e.isActive) || events.value[0]
    filters.excludeRegisteredEventId = active ? active.id : ''
  } else {
    filters.excludeRegisteredEventId = ''
  }
}

export function toggleContact(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }
}

export function selectAllValid() {
  selectedIds.value = candidates.value.filter(hasChannel).map((c) => c.id)
}

export function clearSelection() {
  selectedIds.value = []
  showOnlySelected.value = false
}

export function isGroupFullySelected(group) {
  const selectable = group.items.filter(hasChannel)
  return selectable.length > 0 && selectable.every((c) => selectedIds.value.includes(c.id))
}

export function countSelectedInGroup(group) {
  return group.items.filter((c) => selectedIds.value.includes(c.id)).length
}

export function toggleGroup(group, checked) {
  const ids = group.items.filter(hasChannel).map((c) => c.id)
  if (checked) {
    const set = new Set([...selectedIds.value, ...ids])
    selectedIds.value = [...set]
  } else {
    const remove = new Set(ids)
    selectedIds.value = selectedIds.value.filter((id) => !remove.has(id))
  }
}

export async function addSelected() {
  if (!selectedCampaign.value || !selectedIds.value.length) return
  await safeLoad(async () => {
    const eventId = filters.eventId === '' ? null : filters.eventId
    await addRecipientsByIds(selectedCampaign.value.id, selectedIds.value, eventId)
    recipients.value = await getRecipients(selectedCampaign.value.id)
    clearSelection()
    // Refrescar candidatos: los recién agregados ya no deben aparecer en la lista.
    await previewCampaignRecipients()
  })
}

export async function addRecipients() {
  if (!selectedCampaign.value) return
  await safeLoad(async () => {
    await addRecipientsFromFilter(selectedCampaign.value.id, filters)
    recipients.value = await getRecipients(selectedCampaign.value.id)
    await previewCampaignRecipients()
  })
}

export async function removeRecipient(recipient) {
  if (!selectedCampaign.value) return
  const ok = await confirmAction({
    title: '¿Quitar destinatario?',
    text: `Se quitará "${recipient.fullName}" de esta campaña. Su historial de envíos se conserva.`,
    confirmText: 'Quitar',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    await removeRecipientById(selectedCampaign.value.id, recipient.id)
    recipients.value = await getRecipients(selectedCampaign.value.id)
    toastSuccess(`"${recipient.fullName}" quitado de la campaña`)
  })
}

export async function loadCampaignLogs() {
  if (!selectedCampaign.value) return
  loadingLogs.value = true
  await safeLoad(async () => {
    campaignLogs.value = await getCampaignLogs(selectedCampaign.value.id)
  })
  loadingLogs.value = false
}

export async function loadRenderedPreview() {
  if (!selectedCampaign.value) return
  await safeLoad(async () => {
    renderedPreview.value = await getRenderedPreview(selectedCampaign.value.id)
  })
}

export async function duplicateCampaign(campaign) {
  const ok = await confirmAction({
    title: '¿Duplicar campaña?',
    html: `Se creará una copia de <strong>${campaign.name}</strong> con el mismo mensaje, adjuntos y destinatarios (todos en pendiente, sin historial de envíos).`,
    confirmText: 'Duplicar',
    icon: 'question'
  })
  if (!ok) return
  await safeLoad(async () => {
    const copy = await duplicateCampaignRequest(campaign.id)
    await loadCampaigns()
    toastSuccess(`Copia creada: "${copy.name}"`)
  })
}

export async function clearAllRecipients() {
  if (!selectedCampaign.value) return
  const ok = await confirmAction({
    title: '¿Limpiar destinatarios?',
    html: `Se quitarán <strong>todos los ${recipients.value.length} destinatarios</strong> de <strong>${selectedCampaign.value.name}</strong>. El historial de envíos también se borrará.`,
    confirmText: 'Limpiar todo',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    await clearRecipients(selectedCampaign.value.id)
    recipients.value = []
    sendResult.value = null
    toastSuccess('Destinatarios eliminados')
  })
}

// ── Envío (Paso 3) ───────────────────────────────────────────────────────────
// El envío corre en segundo plano en el backend (con demoras aleatorias entre mensajes de WhatsApp
// para no verse como mensajería masiva), así que aquí solo consultamos el progreso cada pocos segundos
// en lugar de esperar una sola respuesta HTTP larga.
async function pollCampaignUntilDone(campaignId) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 4000))
    const updated = await getCampaign(campaignId)
    recipients.value = await getRecipients(campaignId)
    if (updated.status !== 'Sending') {
      return updated
    }
  }
}

export async function sendCampaign() {
  if (!selectedCampaign.value || !pendingCount.value || sending.value) return
  const testNote = testMode.active
    ? `<p style="color:#8a5200"><strong>Modo Prueba activo:</strong> todo se redirige a ${testMode.email} / ${testMode.phone}.</p>`
    : '<p style="color:#b3261e"><strong>Envío real</strong> a los destinatarios.</p>'
  const ok = await confirmAction({
    title: `¿Enviar por ${sendChannel.value}?`,
    html: `Campaña <strong>${selectedCampaign.value.name}</strong> a <strong>${pendingCount.value}</strong> destinatario(s).${testNote}`,
    confirmText: 'Enviar',
    danger: !testMode.active
  })
  if (!ok) return

  sending.value = true
  sendResult.value = null
  await safeLoad(async () => {
    const campaignId = selectedCampaign.value.id
    const channel = sendChannel.value
    const accepted = await sendCampaignRequest(campaignId, channel)
    const finalCampaign = await pollCampaignUntilDone(campaignId)
    if (selectedCampaign.value) selectedCampaign.value.status = finalCampaign.status

    const key = channel === 'WhatsApp' ? 'whatsAppStatus' : 'emailStatus'
    const sentCount = recipients.value.filter((r) => r[key] === 'Sent').length
    const failedCount = recipients.value.filter((r) => r[key] === 'Failed').length
    sendResult.value = { sent: sentCount, failed: failedCount, channel }

    if (failedCount > 0) {
      toastError(`Enviados ${sentCount}, fallidos ${failedCount}`)
    } else {
      successModal({
        title: 'Envío completado',
        html: `Se enviaron <strong>${sentCount}</strong> mensaje(s) por ${channel}.${
          accepted.testMode ? `<br><small>(Modo Prueba: redirigidos a ${accepted.redirectedTo})</small>` : ''
        }`
      })
    }
  })
  sending.value = false
}

// ── Envío programado ─────────────────────────────────────────────────────────
export async function scheduleSend() {
  if (!selectedCampaign.value || !scheduleForm.at) return
  const when = new Date(scheduleForm.at)
  const ok = await confirmAction({
    title: '¿Programar envío?',
    html: `La campaña <strong>${selectedCampaign.value.name}</strong> se enviará por <strong>${sendChannel.value}</strong> el <strong>${formatDateTime(when)}</strong> (hora CDMX) de forma automática.`,
    confirmText: 'Programar',
    icon: 'question'
  })
  if (!ok) return
  await safeLoad(async () => {
    const updated = await scheduleCampaign(selectedCampaign.value.id, scheduleForm.at, sendChannel.value)
    selectedCampaign.value = updated
    scheduleForm.at = ''
    await loadCampaigns()
    toastSuccess(`Programada para ${formatDateTime(when)}`)
  })
}

export async function cancelSchedule() {
  if (!selectedCampaign.value) return
  const ok = await confirmAction({
    title: '¿Cancelar programación?',
    text: 'La campaña volverá a borrador y no se enviará automáticamente.',
    confirmText: 'Cancelar programación',
    danger: true
  })
  if (!ok) return
  await safeLoad(async () => {
    const updated = await cancelCampaignSchedule(selectedCampaign.value.id)
    selectedCampaign.value = updated
    await loadCampaigns()
    toastSuccess('Programación cancelada')
  })
}

export function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return String(value)
  }
}

// ── Utilidades ───────────────────────────────────────────────────────────────
export async function safeLoad(action) {
  try {
    error.value = ''
    await action()
  } catch (err) {
    const message = formatError(err)
    error.value = message
    toastError(message)
  }
}

export function formatError(err) {
  if (err?.code === 'ERR_NETWORK') {
    return 'No se pudo conectar al backend de campañas. Verifica que EventCampaignSystem esté corriendo en http://127.0.0.1:5001.'
  }

  const responseData = err?.response?.data
  if (typeof responseData === 'string') {
    if (responseData.includes("Invalid object name 'Campaigns'")) {
      return 'Las tablas de campañas todavía no están creadas en la base.'
    }

    return responseData.split('\n')[0]
  }

  return responseData?.error || err?.message || 'Ocurrió un error'
}

export function joinLocation(city, state) {
  return [city, state].filter(Boolean).join(', ') || 'Sin ubicación'
}

export function formatBytes(value) {
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
