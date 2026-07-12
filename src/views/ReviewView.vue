<template>
  <section class="panel">
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
      <details class="msg-preview" @toggle="$event.target.open && loadRenderedPreview()">
        <summary>Ver mensaje</summary>
        <pre class="msg-preview-body">{{ selectedCampaign.messageTemplate }}</pre>
        <div v-if="renderedPreview?.rendered" class="rendered-preview">
          <p class="muted-text">
            👁 Así lo verá {{ renderedPreview.contactName || 'un destinatario' }}:
          </p>
          <pre class="msg-preview-body rendered">{{ renderedPreview.rendered }}</pre>
        </div>
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

        <div class="exclude-registered">
          <label class="exclude-check">
            <input
              type="checkbox"
              :checked="!!filters.excludeRegisteredEventId"
              @change="toggleExcludeRegistered($event.target.checked)"
            />
            <span>No enviar a quienes ya se registraron a</span>
          </label>
          <select
            v-model="filters.excludeRegisteredEventId"
            :disabled="!filters.excludeRegisteredEventId"
          >
            <option v-for="event in events" :key="event.id" :value="event.id">
              {{ event.name }}{{ event.registrationCount != null ? ` (${event.registrationCount} registrados)` : '' }}
            </option>
          </select>
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
          <input
            v-model="recipientSearch"
            class="recipient-search"
            placeholder="🔎 Buscar destinatario por nombre…"
          />
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>📧 Email</th>
                  <th>📱 WhatsApp</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in filteredRecipients" :key="r.id">
                  <td>
                    {{ r.fullName }}
                    <small v-if="r.errorMessage" class="fail-reason">⚠ {{ r.errorMessage }}</small>
                  </td>
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
                  <td>
                    <button class="chip-del" title="Quitar de la campaña" @click="removeRecipient(r)">×</button>
                  </td>
                </tr>
                <tr v-if="!filteredRecipients.length">
                  <td colspan="4" class="empty">Sin coincidencias para "{{ recipientSearch }}".</td>
                </tr>
              </tbody>
            </table>
          </div>

          <details class="logs-box" @toggle="$event.target.open && loadCampaignLogs()">
            <summary>📜 Historial de envíos</summary>
            <p v-if="loadingLogs" class="muted-text">Cargando…</p>
            <div v-else-if="campaignLogs.length" class="table-wrap">
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Destinatario</th>
                    <th>Canal</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in campaignLogs" :key="log.id">
                    <td>{{ formatUtcDateTime(log.createdAt) }}</td>
                    <td>
                      {{ log.contactName || '—' }}
                      <small>{{ log.recipient }}</small>
                    </td>
                    <td>{{ log.channel }}</td>
                    <td>
                      <span class="status-pill" :class="`s-${(log.status || 'none').toLowerCase()}`">
                        {{ log.status }}
                      </span>
                    </td>
                    <td><small>{{ log.errorMessage || '' }}</small></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="muted-text">Aún no hay envíos registrados en esta campaña.</p>
          </details>
        </div>
        <p v-else class="empty">Aún no has agregado destinatarios. Vuelve al Paso 1.</p>

        <div v-if="sending" class="progress-box">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${sendProgress.pct}%` }"></div>
          </div>
          <span class="muted-text">
            Enviando… {{ sendProgress.done }} de {{ sendProgress.total }} procesados ({{ sendProgress.pct }}%)
          </span>
        </div>

        <div v-if="selectedCampaign.status === 'Scheduled'" class="notice schedule-active">
          📅 <strong>Programada:</strong> se enviará por <strong>{{ selectedCampaign.channel }}</strong>
          el <strong>{{ formatDateTime(selectedCampaign.scheduledAt) }}</strong> (hora CDMX).
          <button class="ghost" @click="cancelSchedule">Cancelar programación</button>
        </div>

        <div class="send-bar">
          <label class="send-channel">
            Canal de envío
            <select v-model="sendChannel">
              <option value="Email">📧 Email</option>
              <option value="WhatsApp">📱 WhatsApp</option>
            </select>
          </label>
          <span class="muted-text" style="font-size:12px">Al reenviar, el sistema omite a quien ya recibió en esta campaña (no duplica).</span>
          <div class="send-buttons">
            <label v-if="selectedCampaign.status !== 'Scheduled'" class="schedule-picker">
              <input v-model="scheduleForm.at" type="datetime-local" />
              <button class="secondary" :disabled="!scheduleForm.at || !recipients.length" @click="scheduleSend">
                📅 Programar
              </button>
            </label>
            <button
              class="danger send-main"
              :disabled="!pendingCount || sending"
              @click="sendCampaign"
            >
              {{ sending ? 'Enviando…' : `📤 ${statusCount('Failed') ? 'Enviar / Reintentar' : 'Enviar'} ${sendChannel} (${pendingCount})` }}
            </button>
          </div>
        </div>

        <p v-if="sendResult" class="send-result">
          ✅ Enviados: {{ sendResult.sent }} · ❌ Fallidos: {{ sendResult.failed }}
        </p>
      </section>
    </template>
  </section>
</template>

<script setup>
import {
  addRecipients,
  addSelected,
  applySegment,
  campaignAttachments,
  campaignLogs,
  cancelSchedule,
  candidates,
  channelLabel,
  channelValue,
  clearAllRecipients,
  clearSelection,
  countSelectedInGroup,
  events,
  filteredRecipients,
  filters,
  formatBytes,
  formatDateTime,
  formatUtcDateTime,
  hasChannel,
  isGroupFullySelected,
  joinLocation,
  loadCampaignLogs,
  loadingLogs,
  loadRenderedPreview,
  onUploadAttachment,
  pendingCount,
  preview,
  previewCampaignRecipients,
  recipientSearch,
  recipients,
  removeAttachment,
  removeRecipient,
  removeSegment,
  renderedPreview,
  savedSegments,
  saveCurrentSegment,
  scheduleForm,
  scheduleSend,
  segmentBy,
  segmentedCandidates,
  selectableCount,
  selectAllValid,
  selectedCampaign,
  selectedIds,
  sendCampaign,
  sendChannel,
  sending,
  sendProgress,
  sendResult,
  showOnlySelected,
  statusCount,
  toggleContact,
  toggleExcludeRegistered,
  toggleGroup,
  uploadingFile
} from '../store'
</script>
