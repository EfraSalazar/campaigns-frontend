<template>
  <LoginView v-if="!authed" />

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

      <ContactsView v-if="activeView === 'contacts'" />
      <CampaignsView v-if="activeView === 'campaigns'" />
      <ReviewView v-if="activeView === 'review'" />
    </section>

    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<script setup>
import { onMounted } from 'vue'
import LoginView from './views/LoginView.vue'
import ContactsView from './views/ContactsView.vue'
import CampaignsView from './views/CampaignsView.vue'
import ReviewView from './views/ReviewView.vue'
import {
  activeView,
  authed,
  currentUser,
  error,
  goToReview,
  healthOk,
  loadAll,
  logout,
  schemaWarning,
  testMode
} from './store'

onMounted(async () => {
  if (authed.value) await loadAll()
})
</script>
