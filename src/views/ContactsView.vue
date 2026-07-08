<template>
  <section class="panel">
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
</template>

<script setup>
import { contacts, contactsTotal, events, filters, joinLocation, loadContacts } from '../store'
</script>
