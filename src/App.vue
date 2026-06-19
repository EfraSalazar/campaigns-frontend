<template>
  <main v-if="!authed" class="login-shell">
    <form class="login-card" @submit.prevent="doLogin">
      <p class="eyebrow">Campañas INTIMOS</p>
      <h1>Iniciar sesión</h1>
      <p class="login-hint">Panel solo para administradores.</p>
      <label>
        Usuario
        <input v-model="loginForm.username" autocomplete="username" placeholder="admin" />
      </label>
      <label>
        Contraseña
        <input v-model="loginForm.password" type="password" autocomplete="current-password" placeholder="••••••" />
      </label>
      <button class="primary" type="submit" :disabled="loggingIn">
        {{ loggingIn ? 'Entrando…' : 'Entrar' }}
      </button>
      <p v-if="loginError" class="error">{{ loginError }}</p>
    </form>
  </main>

  <main v-else class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Campañas</p>
        <h1>INTIMOS & Instituto</h1>
      </div>
      <div class="status-strip">
        <span class="pill muted">Envío real activo</span>
        <span class="pill" :class="healthOk ? 'ok' : 'warn'">
          API {{ healthOk ? 'conectada' : 'sin confirmar' }}
        </span>
        <span v-if="currentUser" class="pill ok">{{ currentUser }}</span>
        <button class="ghost logout" @click="logout">Salir</button>
      </div>
    </header>

    <section class="notice">
      Este panel prepara campañas, elige y guarda segmentos de destinatarios, adjunta archivos y envía por correo o WhatsApp.
    </section>
    <section v-if="testMode.active" class="notice test-mode">
      🧪 <strong>MODO PRUEBA</strong> — los envíos NO llegan a los destinatarios reales. Todo se redirige a
      <strong>{{ testMode.email }}</strong> / <strong>{{ testMode.phone }}</strong> (máx. unos pocos por envío).
    </section>
    <section v-if="schemaWarning" class="notice schema">
      {{ schemaWarning }}
    </section>

    <section class="layout">
      <aside class="sidebar">
        <button :class="{ active: activeView === 'contacts' }" @click="activeView = 'contacts'">
          Contactos
        </button>
        <button :class="{ active: activeView === 'campaigns' }" @click="activeView = 'campaigns'">
          Campañas
        </button>
        <button :class="{ active: activeView === 'review' }" @click="goToReview">
          Revisión
        </button>
      </aside>

      <section v-if="activeView === 'contacts'" class="panel">
        <div class="section-head">
          <div>
            <h2>Contactos históricos</h2>
            <p>Filtra personas por evento, ciudad, iglesia o consentimiento.</p>
          </div>
          <button class="secondary" @click="loadContacts">Buscar</button>
        </div>

        <div class="filters">
          <label>
            Buscar
            <input v-model="filters.search" placeholder="Nombre, teléfono, iglesia" />
          </label>
          <label>
            Evento
            <select v-model="filters.eventId">
              <option value="">Todos</option>
              <option v-for="event in events" :key="event.id" :value="event.id">
                {{ event.name }}
              </option>
            </select>
          </label>
          <label>
            Ciudad
            <input v-model="filters.city" placeholder="Cuernavaca, Monterrey..." />
          </label>
          <label>
            Estado
            <input v-model="filters.state" placeholder="Morelos, Nuevo Leon..." />
          </label>
          <label>
            Iglesia
            <input v-model="filters.church" placeholder="Nombre de iglesia" />
          </label>
          <label>
            Límite
            <input v-model.number="filters.limit" min="1" max="500" type="number" />
          </label>
        </div>

        <div class="table-head">
          <strong>{{ contactsTotal }} contactos</strong>
          <span>{{ contacts.length }} visibles</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Ubicación</th>
                <th>Iglesia</th>
                <th>Registros</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="contact in contacts" :key="contact.id">
                <td>{{ contact.fullName || 'Sin nombre' }}</td>
                <td>
                  <span>{{ contact.phoneNumber || 'Sin teléfono' }}</span>
                  <small>{{ contact.email || 'Sin correo' }}</small>
                </td>
                <td>{{ joinLocation(contact.city, contact.state) }}</td>
                <td>{{ contact.church || 'Sin iglesia' }}</td>
                <td>{{ contact.registrationCount }}</td>
              </tr>
              <tr v-if="!contacts.length">
                <td colspan="5" class="empty">Sin contactos cargados todavía.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeView === 'campaigns'" class="panel">
        <div class="section-head">
          <div>
            <h2>{{ editingCampaign ? `Editando: ${editingCampaign.name}` : 'Nueva campaña' }}</h2>
            <p>{{ editingCampaign ? 'Modifica los campos y guarda los cambios.' : 'Define finalidad, canal, mensaje y adjuntos en borrador.' }}</p>
          </div>
          <div style="display:flex;gap:8px">
            <button v-if="editingCampaign" class="secondary" @click="cancelEdit">Cancelar</button>
            <button class="primary" @click="saveCampaign">
              {{ editingCampaign ? 'Guardar cambios' : 'Guardar borrador' }}
            </button>
          </div>
        </div>

        <div class="campaign-grid">
          <label>
            Nombre
            <input v-model="campaignForm.name" placeholder="Invitación Morelos 2026" />
          </label>
          <label>
            Finalidad
            <select v-model="campaignForm.purpose">
              <option value="IntimosEvents">Eventos INTIMOS</option>
              <option value="TheologicalInstitute">Instituto Teológico</option>
              <option value="GeneralMinistry">Ministerio general</option>
            </select>
          </label>
          <label>
            Canal
            <select v-model="campaignForm.channel">
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
            </select>
          </label>
          <label>
            Asunto
            <input v-model="campaignForm.subject" placeholder="Solo para email" />
          </label>
        </div>

        <label class="message-box">
          Mensaje
          <textarea
            v-model="campaignForm.messageTemplate"
            rows="8"
            placeholder="Hola {nombre}, queremos invitarte..."
          />
        </label>

        <div class="helper-row">
          <span>Variables sugeridas: {nombre}, {ciudad}, {iglesia}, {evento}</span>
          <button class="ghost" @click="insertTemplate">Usar ejemplo</button>
        </div>

        <div class="upload-zone">
          <div>
            <h3>Adjuntos en borrador</h3>
            <p>Imagen, PDF o archivo. Aún no se suben al servidor.</p>
          </div>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" @change="handleFiles" />
        </div>
        <ul v-if="attachments.length" class="attachment-list">
          <li v-for="file in attachments" :key="`${file.name}-${file.size}`">
            <span>{{ file.name }}</span>
            <small>{{ formatBytes(file.size) }}</small>
          </li>
        </ul>

          <div class="campaign-list">
          <div class="section-head compact">
            <h2>Borradores</h2>
            <button class="secondary" @click="loadCampaigns">Actualizar</button>
          </div>
          <p v-if="schemaWarning" class="empty">{{ schemaWarning }}</p>
          <div class="campaign-row" v-for="campaign in campaigns" :key="campaign.id">
            <div>
              <strong>{{ campaign.name }}</strong>
              <span>{{ campaign.purpose }} · {{ campaign.channel }} · {{ campaign.status }}</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="ghost" @click="editCampaign(campaign)">Editar</button>
              <button class="secondary" @click="selectCampaign(campaign)">Seleccionar</button>
              <button class="danger" style="min-height:unset;padding:0 10px;font-size:13px" @click="removeCampaign(campaign)">Eliminar</button>
            </div>
          </div>
          <p v-if="!campaigns.length" class="empty">Aún no hay campañas cargadas.</p>
        </div>
      </section>

      <section v-if="activeView === 'review'" class="panel">
        <div class="section-head">
          <div>
            <h2>Revisión y envío</h2>
            <p>Sigue los 3 pasos: elige destinatarios, prepara la campaña y envía.</p>
          </div>
        </div>

        <div v-if="selectedCampaign" class="selected-campaign">
          <div>
            <strong>{{ selectedCampaign.name }}</strong>
            <span>{{ selectedCampaign.purpose }} · {{ selectedCampaign.channel }}</span>
          </div>
          <details class="msg-preview">
            <summary>Ver mensaje</summary>
            <pre class="msg-preview-body">{{ selectedCampaign.messageTemplate }}</pre>
          </details>
        </div>
        <p v-else class="empty">Selecciona una campaña en la pestaña Campañas para empezar.</p>

        <template v-if="selectedCampaign">
          <!-- PASO 1: Elegir destinatarios -->
          <section class="step-card">
            <div class="step-head">
              <span class="step-num">1</span>
              <div>
                <h3>Elegir destinatarios</h3>
                <p class="muted-text">Filtra, previsualiza y marca a quién agregar a la campaña.</p>
              </div>
            </div>

            <div class="segments-bar">
              <div class="segments-head">
                <h4>Segmentos guardados</h4>
                <button class="ghost" @click="saveCurrentSegment">💾 Guardar filtros actuales</button>
              </div>
              <div v-if="savedSegments.length" class="segment-chips">
                <span v-for="seg in savedSegments" :key="seg.id" class="segment-chip">
                  <button class="chip-apply" @click="applySegment(seg)">{{ seg.name }}</button>
                  <button class="chip-del" title="Eliminar" @click="removeSegment(seg.id)">×</button>
                </span>
              </div>
              <p v-else class="muted-text">Aún no guardas segmentos. Arma filtros y guárdalos para reutilizarlos.</p>
            </div>

            <div class="filters">
              <label>
                Buscar contacto
                <input
                  v-model="filters.search"
                  placeholder="Nombre, teléfono, correo o iglesia"
                  @keyup.enter="previewCampaignRecipients"
                />
              </label>
              <label>
                Evento origen
                <select v-model="filters.eventId">
                  <option value="">Todos</option>
                  <option v-for="event in events" :key="event.id" :value="event.id">
                    {{ event.name }}
                  </option>
                </select>
              </label>
              <label>
                Ciudad
                <input v-model="filters.city" placeholder="Ciudad objetivo" />
              </label>
              <label>
                Estado
                <input v-model="filters.state" placeholder="Estado objetivo" />
              </label>
              <label>
                Consentimiento
                <select v-model="filters.requireConsent">
                  <option :value="false">No requerido</option>
                  <option :value="true">Requerido</option>
                </select>
              </label>
            </div>

            <div class="step-actions">
              <button class="secondary" @click="previewCampaignRecipients">🔍 Previsualizar</button>
              <span class="muted-text">{{ preview.total }} posibles · {{ selectedIds.length }} seleccionados</span>
            </div>

            <div v-if="candidates.length" class="select-toolbar">
              <div class="select-controls">
                <button class="ghost" @click="selectAllValid">Seleccionar todos</button>
                <button class="ghost" @click="clearSelection">Ninguno</button>
                <button
                  class="ghost"
                  :class="{ 'filter-active': showOnlySelected }"
                  @click="showOnlySelected = !showOnlySelected"
                >
                  {{ showOnlySelected ? '👁 Todos' : `✅ Solo seleccionados (${selectedIds.length})` }}
                </button>
                <span class="muted-text">{{ selectableCount }} con canal {{ channelLabel }} válido</span>
              </div>
              <label class="group-by">
                Agrupar por
                <select v-model="segmentBy">
                  <option value="none">Sin agrupar</option>
                  <option value="event">Historial (nº de eventos)</option>
                  <option value="city">Ciudad</option>
                  <option value="state">Estado</option>
                  <option value="church">Iglesia</option>
                </select>
              </label>
            </div>

            <p v-if="!candidates.length" class="empty">
              Aplica filtros y pulsa <strong>Previsualizar</strong> para ver y elegir destinatarios.
            </p>

            <div v-for="group in segmentedCandidates" :key="group.key" class="segment-block">
              <div v-if="segmentBy !== 'none'" class="segment-head">
                <label class="segment-check">
                  <input
                    type="checkbox"
                    :checked="isGroupFullySelected(group)"
                    @change="toggleGroup(group, $event.target.checked)"
                  />
                  <strong>{{ group.label }}</strong>
                </label>
                <span class="muted-text">{{ countSelectedInGroup(group) }}/{{ group.items.length }}</span>
              </div>
              <ul class="recipient-list">
                <li
                  v-for="contact in group.items"
                  :key="contact.id"
                  class="recipient-item"
                  :class="{ disabled: !hasChannel(contact), checked: selectedIds.includes(contact.id) }"
                >
                  <label>
                    <input
                      type="checkbox"
                      :disabled="!hasChannel(contact)"
                      :checked="selectedIds.includes(contact.id)"
                      @change="toggleContact(contact.id, $event.target.checked)"
                    />
                    <span class="r-name">{{ contact.fullName || 'Sin nombre' }}</span>
                    <span class="r-channel" :class="{ warn: !hasChannel(contact) }">
                      {{ channelValue(contact) || `Sin ${channelLabel}` }}
                    </span>
                    <span class="r-meta">{{ joinLocation(contact.city, contact.state) }}</span>
                    <span class="r-meta">{{ contact.church || 'Sin iglesia' }}</span>
                    <span class="r-badge">{{ contact.registrationCount }} reg.</span>
                  </label>
                </li>
              </ul>
            </div>

            <div v-if="candidates.length" class="add-actions">
              <button class="primary" :disabled="!selectedIds.length" @click="addSelected">
                ➕ Agregar seleccionados ({{ selectedIds.length }})
              </button>
              <button class="secondary" @click="addRecipients">
                Agregar todos los filtrados
              </button>
            </div>
          </section>

          <!-- PASO 2: Preparar la campaña -->
          <section class="step-card">
            <div class="step-head">
              <span class="step-num">2</span>
              <div>
                <h3>Preparar la campaña</h3>
                <p class="muted-text">Adjunta archivos opcionales. Se envían en el correo (adjunto) y por WhatsApp (primer archivo).</p>
              </div>
            </div>

            <div class="attachments-box">
              <div class="section-head compact">
                <h4>Adjuntos</h4>
                <label class="upload-btn">
                  {{ uploadingFile ? 'Subiendo…' : '+ Agregar archivo' }}
                  <input type="file" hidden :disabled="uploadingFile" @change="onUploadAttachment" />
                </label>
              </div>
              <ul v-if="campaignAttachments.length" class="attachment-list">
                <li v-for="att in campaignAttachments" :key="att.id">
                  <span>📎 {{ att.fileName }}</span>
                  <small>{{ formatBytes(att.size) }}</small>
                  <button class="ghost" @click="removeAttachment(att.id)">Quitar</button>
                </li>
              </ul>
              <p v-else class="muted-text">Sin adjuntos.</p>
            </div>
          </section>

          <!-- PASO 3: Enviar -->
          <section class="step-card">
            <div class="step-head">
              <span class="step-num">3</span>
              <div>
                <h3>Enviar</h3>
                <p class="muted-text">{{ recipients.length }} destinatario(s) en la campaña.</p>
              </div>
            </div>

            <div v-if="recipients.length" class="recipients-status">
              <div class="section-head compact">
                <h4>Destinatarios en la campaña ({{ recipients.length }})</h4>
                <div style="display:flex;align-items:center;gap:12px">
                  <span class="muted-text">
                    Por {{ sendChannel }}: {{ statusCount('Sent') }} enviados · {{ pendingCount }} pendientes
                  </span>
                  <button class="danger" style="min-height:unset;padding:4px 12px;font-size:13px" @click="clearAllRecipients">
                    🗑 Limpiar
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>📧 Email</th>
                      <th>📱 WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in recipients" :key="r.id">
                      <td>{{ r.fullName }}</td>
                      <td>
                        <span class="status-pill" :class="`s-${(r.emailStatus || 'none').toLowerCase()}`">
                          {{ r.emailStatus || '—' }}
                        </span>
                      </td>
                      <td>
                        <span class="status-pill" :class="`s-${(r.whatsAppStatus || 'none').toLowerCase()}`">
                          {{ r.whatsAppStatus || '—' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p v-else class="empty">Aún no has agregado destinatarios. Vuelve al Paso 1.</p>

            <div class="send-bar">
              <label class="send-channel">
                Canal de envío
                <select v-model="sendChannel">
                  <option value="Email">📧 Email</option>
                  <option value="WhatsApp">📱 WhatsApp</option>
                </select>
              </label>
              <span class="muted-text" style="font-size:12px">El sistema omite automáticamente a quien ya recibió en campañas anteriores.</span>
              <button
                class="danger send-main"
                :disabled="!pendingCount || sending"
                @click="sendCampaign"
              >
                {{ sending ? 'Enviando…' : `📤 Enviar ${sendChannel} (${pendingCount})` }}
              </button>
            </div>

            <p v-if="sendResult" class="send-result">
              ✅ Enviados: {{ sendResult.sent }} · ❌ Fallidos: {{ sendResult.failed }}
            </p>
          </section>
        </template>
      </section>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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
  clearRecipients,
  createCampaign,
  deleteCampaign,
  deleteAttachment,
  deleteSegment,
  getAttachments,
  getCampaign,
  getCampaigns,
  getSegments,
  getContacts,
  getEvents,
  getHealth,
  getRecipients,
  getToken,
  login,
  previewRecipients,
  saveSegment,
  sendCampaignRequest,
  setToken,
  setUnauthorizedHandler,
  updateCampaign,
  uploadAttachment
} from './services/api'

const authed = ref(Boolean(getToken()))
const currentUser = ref(localStorage.getItem('campaignsUser') || '')
const loginForm = reactive({ username: '', password: '' })
const loggingIn = ref(false)
const loginError = ref('')

const activeView = ref('contacts')
const healthOk = ref(false)
const error = ref('')
const schemaWarning = ref('')
const events = ref([])
const contacts = ref([])
const contactsTotal = ref(0)
const campaigns = ref([])
const selectedCampaign = ref(null)
const recipients = ref([])
const attachments = ref([])
const preview = reactive({ total: 0, sample: [] })
const candidates = ref([])
const selectedIds = ref([])
const segmentBy = ref('none')
const sending = ref(false)
const sendResult = ref(null)
const sendChannel = ref('Email')
const campaignAttachments = ref([])
const uploadingFile = ref(false)
const savedSegments = ref([])
const editingCampaign = ref(null)
const showOnlySelected = ref(false)

async function loadSegments() {
  await safeLoad(async () => {
    savedSegments.value = await getSegments()
  })
}

async function saveCurrentSegment() {
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

async function applySegment(seg) {
  const f = seg.filters || {}
  filters.search = f.search || ''
  filters.eventId = f.eventId ?? ''
  filters.city = f.city || ''
  filters.state = f.state || ''
  filters.church = f.church || ''
  filters.requireConsent = Boolean(f.requireConsent)
  segmentBy.value = seg.segmentBy || 'none'
  await previewCampaignRecipients()
}

async function removeSegment(id) {
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
const testMode = reactive({ active: false, email: '', phone: '' })

async function loadCampaignAttachments() {
  if (!selectedCampaign.value) {
    campaignAttachments.value = []
    return
  }
  campaignAttachments.value = await getAttachments(selectedCampaign.value.id)
}

async function onUploadAttachment(event) {
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

async function removeAttachment(attachmentId) {
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

// Cuenta los que aún NO recibieron con éxito por el canal seleccionado (multicanal).
const channelStatusKey = computed(() =>
  sendChannel.value === 'WhatsApp' ? 'whatsAppStatus' : 'emailStatus'
)

const pendingCount = computed(
  () => recipients.value.filter((r) => r[channelStatusKey.value] !== 'Sent').length
)

function statusCount(status) {
  return recipients.value.filter((r) => r[channelStatusKey.value] === status).length
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const channelLabel = computed(() =>
  selectedCampaign.value?.channel === 'Email' ? 'correo' : 'teléfono'
)

function channelValue(contact) {
  return selectedCampaign.value?.channel === 'Email' ? contact.email : contact.phoneNumber
}

function hasChannel(contact) {
  return Boolean(channelValue(contact))
}

const selectableCount = computed(() => candidates.value.filter(hasChannel).length)

const visibleCandidates = computed(() => {
  if (!showOnlySelected.value) return candidates.value
  const sel = new Set(selectedIds.value)
  return candidates.value.filter((c) => sel.has(c.id))
})

const segmentedCandidates = computed(() => {
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

const filters = reactive({
  search: '',
  city: '',
  state: '',
  church: '',
  eventId: '',
  requireConsent: false,
  consentPurpose: 'IntimosEvents',
  consentChannel: 'WhatsApp',
  limit: 100,
  offset: 0
})

const campaignForm = reactive({
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

onMounted(async () => {
  if (authed.value) await loadAll()
})

async function loadAll() {
  await safeLoad(async () => {
    const health = await getHealth()
    healthOk.value = health.database === 'ok'
    testMode.active = Boolean(health.testMode)
    testMode.email = health.testEmail || ''
    testMode.phone = health.testPhone || ''
  })
  await Promise.all([loadEvents(), loadContacts(), loadCampaigns(), loadSegments()])
}

async function doLogin() {
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

function logout() {
  setToken('')
  localStorage.removeItem('campaignsUser')
  currentUser.value = ''
  authed.value = false
}

async function loadEvents() {
  await safeLoad(async () => {
    events.value = await getEvents()
  })
}

async function loadContacts() {
  await safeLoad(async () => {
    const response = await getContacts(filters)
    contacts.value = response.items || []
    contactsTotal.value = response.total || 0
  })
}

async function loadCampaigns() {
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

async function saveCampaign() {
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

function editCampaign(campaign) {
  editingCampaign.value = campaign
  campaignForm.name = campaign.name
  campaignForm.purpose = campaign.purpose
  campaignForm.channel = campaign.channel
  campaignForm.subject = campaign.subject || ''
  campaignForm.messageTemplate = campaign.messageTemplate
}

function cancelEdit() {
  editingCampaign.value = null
  resetCampaignForm()
}

async function goToReview() {
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

async function removeCampaign(campaign) {
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

async function previewCampaignRecipients() {
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

function toggleContact(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }
}

function selectAllValid() {
  selectedIds.value = candidates.value.filter(hasChannel).map((c) => c.id)
}

function clearSelection() {
  selectedIds.value = []
  showOnlySelected.value = false
}

function isGroupFullySelected(group) {
  const selectable = group.items.filter(hasChannel)
  return selectable.length > 0 && selectable.every((c) => selectedIds.value.includes(c.id))
}

function countSelectedInGroup(group) {
  return group.items.filter((c) => selectedIds.value.includes(c.id)).length
}

function toggleGroup(group, checked) {
  const ids = group.items.filter(hasChannel).map((c) => c.id)
  if (checked) {
    const set = new Set([...selectedIds.value, ...ids])
    selectedIds.value = [...set]
  } else {
    const remove = new Set(ids)
    selectedIds.value = selectedIds.value.filter((id) => !remove.has(id))
  }
}

async function addSelected() {
  if (!selectedCampaign.value || !selectedIds.value.length) return
  await safeLoad(async () => {
    const eventId = filters.eventId === '' ? null : filters.eventId
    await addRecipientsByIds(selectedCampaign.value.id, selectedIds.value, eventId)
    recipients.value = await getRecipients(selectedCampaign.value.id)
    clearSelection()
  })
}

async function addRecipients() {
  if (!selectedCampaign.value) return
  await safeLoad(async () => {
    await addRecipientsFromFilter(selectedCampaign.value.id, filters)
    recipients.value = await getRecipients(selectedCampaign.value.id)
    await previewCampaignRecipients()
  })
}

async function clearAllRecipients() {
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

async function sendCampaign() {
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

async function selectCampaign(campaign) {
  selectedCampaign.value = campaign
  sendChannel.value = campaign.channel || 'Email'
  recipients.value = await getRecipients(campaign.id)
  await loadCampaignAttachments()
  sendResult.value = null
  candidates.value = []
  selectedIds.value = []
  showOnlySelected.value = false
  activeView.value = 'review'
}

function insertTemplate() {
  campaignForm.messageTemplate =
    'Hola {nombre}, queremos invitarte a conocer más sobre {evento}. Si estás en {ciudad}, nos encantaría verte ahí.'
}

function handleFiles(event) {
  attachments.value = Array.from(event.target.files || [])
}

async function safeLoad(action) {
  try {
    error.value = ''
    await action()
  } catch (err) {
    const message = formatError(err)
    error.value = message
    toastError(message)
  }
}

function formatError(err) {
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

function joinLocation(city, state) {
  return [city, state].filter(Boolean).join(', ') || 'Sin ubicación'
}

function formatBytes(value) {
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}
</script>
