<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
const { data, error, refresh } = useFetch('/api/health')
const { auth, signOut } = useDashboardAuth()
const { theme, setTheme } = useTheme()
const signingOut = ref(false)
const signOutError = ref(false)
async function logout() {
  signingOut.value = true
  signOutError.value = false
  try {
    await signOut()
  } catch {
    signOutError.value = true
    signingOut.value = false
  }
}
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
</script>
<template>
  <dialog
    ref="dialog"
    class="settings-dialog"
    @close="emit('close')"
    @click="
      (event) => {
        if (event.target === dialog) dialog?.close()
      }
    "
  >
    <div class="dialog-content">
      <div class="row-between">
        <span class="eyebrow">YOUR WORKSPACE</span
        ><button class="icon-button" aria-label="Close settings" @click="dialog?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <h2>Connected to your world.</h2>
      <p class="muted">Your projects come from Vercel. Your code activity comes from GitHub.</p>
      <fieldset class="theme-picker">
        <legend>Appearance</legend>
        <p>Choose the light for your universe.</p>
        <div class="theme-options">
          <label v-for="mode in ['dark', 'light'] as const" :key="mode" class="theme-option">
            <input
              type="radio"
              name="appearance"
              :value="mode"
              :checked="theme === mode"
              @change="setTheme(mode)"
            />
            <span
              ><AppIcon :name="mode === 'dark' ? 'moon' : 'sun'" />{{
                mode === 'dark' ? 'Dark' : 'Light'
              }}</span
            >
          </label>
        </div>
      </fieldset>
      <div v-if="auth?.user" class="connection-row">
        <AppIcon name="globe" />
        <div>
          <strong>{{ auth.user.name }}</strong
          ><span>{{ auth.user.email }}</span>
        </div>
        <button class="secondary-button" :disabled="signingOut" @click="logout">
          {{ signingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>
      <p v-if="signOutError" class="inline-warning" role="alert">
        Could not sign out. Please try again.
      </p>
      <div class="connection-row">
        <AppIcon name="layers" />
        <div>
          <strong>Vercel</strong
          ><span>{{
            data?.vercel === 'configured'
              ? 'Server credentials configured'
              : 'Sample projects · no token needed'
          }}</span>
        </div>
        <span class="source-badge">{{ data?.mode === 'real' ? 'LIVE' : 'DEMO' }}</span>
      </div>
      <div class="connection-row">
        <AppIcon name="github" />
        <div>
          <strong>GitHub</strong
          ><span>{{
            data?.github === 'configured'
              ? 'Server credentials configured'
              : 'Public repositories supported'
          }}</span>
        </div>
      </div>
      <div class="connection-row">
        <AppIcon name="activity" />
        <div>
          <strong>Audience analytics</strong
          ><span>{{
            data?.analytics === 'vercel'
              ? 'Vercel Web Analytics · production · UTC'
              : 'Deterministic sample data'
          }}</span>
        </div>
        <span class="source-badge">{{ data?.analytics === 'vercel' ? 'API' : 'DEMO' }}</span>
      </div>
      <p v-if="error" class="inline-warning">
        Could not check connections. <button @click="refresh()">Retry</button>
      </p>
      <div class="setup-note">
        <AppIcon name="info" :size="17" />
        <p>
          To explore your own projects, set <code>DATA_MODE=real</code> and
          <code>VERCEL_TOKEN</code> in your server environment. Add <code>GITHUB_TOKEN</code> for
          private repositories. See the project README for setup.
        </p>
      </div>
      <p class="small muted">
        Read-only connections. Credentials stay on the server.<br />Live data is cached for 60
        seconds.
      </p>
      <button class="primary-button" @click="dialog?.close()">
        Back to your universe<AppIcon name="external" :size="16" />
      </button>
    </div>
  </dialog>
</template>
