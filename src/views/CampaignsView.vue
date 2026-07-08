<template>
  <section class="panel">
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
          <span>
            {{ campaign.purpose }} · {{ campaign.channel }} · {{ campaign.status }}
            <template v-if="campaign.status === 'Scheduled' && campaign.scheduledAt">
              · 📅 {{ formatDateTime(campaign.scheduledAt) }}
            </template>
          </span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ghost" @click="editCampaign(campaign)">Editar</button>
          <button class="ghost" title="Crear una copia" @click="duplicateCampaign(campaign)">Duplicar</button>
          <button class="secondary" @click="selectCampaign(campaign)">Seleccionar</button>
          <button class="danger" style="min-height:unset;padding:0 10px;font-size:13px" @click="removeCampaign(campaign)">Eliminar</button>
        </div>
      </div>
      <p v-if="!campaigns.length" class="empty">Aún no hay campañas cargadas.</p>
    </div>
  </section>
</template>

<script setup>
import {
  attachments,
  campaignForm,
  campaigns,
  cancelEdit,
  duplicateCampaign,
  editCampaign,
  editingCampaign,
  formatBytes,
  formatDateTime,
  handleFiles,
  insertTemplate,
  loadCampaigns,
  removeCampaign,
  saveCampaign,
  schemaWarning,
  selectCampaign
} from '../store'
</script>
