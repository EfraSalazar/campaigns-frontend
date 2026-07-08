<template>
  <main class="login-shell">
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
</template>

<script setup>
import { doLogin, loginError, loginForm, loggingIn } from '../store'
</script>
