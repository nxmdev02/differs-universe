<script setup lang="ts">
const { auth } = useDashboardAuth()
const route = useRoute()
useHead({
  title: 'Sign in — differs',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
})
const errors: Record<string, string> = {
  denied: 'This Google account does not have access to this workspace. Try your approved account.',
  expired: 'Your sign-in request expired. Please try again.',
  cancelled: 'Sign-in was cancelled. You can try again when you’re ready.',
  failed: 'We couldn’t complete sign-in. Please try again.',
  configuration: 'Google sign-in is waiting for workspace setup.',
}
const errorMessage = computed(() =>
  typeof route.query.error === 'string' ? errors[route.query.error] : undefined,
)
const ready = computed(() => auth.value?.enabled && auth.value.configured)
const universe = ref<{ follow: (event: PointerEvent) => void; resetPointer: () => void }>()
const atmospherePaused = ref(false)
</script>
<template>
  <section
    class="auth-page"
    @pointermove="universe?.follow($event)"
    @pointerleave="universe?.resetPointer()"
    @pointerup="universe?.resetPointer()"
    @pointercancel="universe?.resetPointer()"
  >
    <div class="auth-stars" aria-hidden="true" />
    <EventHorizon class="auth-horizon" :paused="atmospherePaused" />
    <div class="auth-brand">differs<span>✦</span></div>
    <LoginUniverse ref="universe" class="auth-scene" @motion-change="atmospherePaused = $event" />
    <div class="auth-card">
      <span class="auth-eyebrow">EVERY JOURNEY BEGINS AT HOME</span>
      <h1>Your universe awaits<span>.</span></h1>
      <p>Across a universe of possibilities.<br />Find your way back to what you’re building.</p>
      <a v-if="ready" class="google-signin" href="/auth/google">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.4 13.92A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.92V7.49H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.51l3.34-2.59Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59A5.98 5.98 0 0 1 12 5.96Z"
          />
        </svg>
        Continue with Google
      </a>
      <button v-else class="google-signin" disabled>Google sign-in unavailable</button>
      <p v-if="errorMessage" class="auth-message" role="alert">{{ errorMessage }}</p>
      <p v-else-if="!ready" class="auth-message" role="status">
        The workspace owner needs to finish Google sign-in setup.
      </p>
      <span class="auth-private">Access is limited to approved Google accounts.</span>
    </div>
    <footer class="auth-footer">A space for everything you’re making.</footer>
  </section>
</template>
<style scoped>
.auth-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: max(40px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))
    max(40px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  overflow: hidden;
  position: relative;
  background: var(
    --theme-auth-background,
    radial-gradient(ellipse at 48% 38%, #172d4460, transparent 60%),
    radial-gradient(ellipse at 95% 15%, #9b77401a, transparent 55%),
    #090d13
  );
}
.auth-brand {
  position: absolute;
  left: max(32px, env(safe-area-inset-left));
  top: max(28px, env(safe-area-inset-top));
  font-size: 23px;
  font-weight: 750;
  letter-spacing: -1px;
  color: var(--theme-text, #e6eeea);
}
.auth-horizon {
  width: min(900px, 78vw);
  right: -170px;
  top: -15px;
  opacity: 0.8;
  transform: rotate(-14deg);
}
.auth-brand span {
  color: var(--theme-muted, #a4d8b6);
  font-size: 12px;
  vertical-align: super;
  margin-left: 3px;
}
.auth-scene {
  margin-bottom: 20px;
  z-index: 1;
}
.auth-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    radial-gradient(1px 1px at 15px 25px, #8fb5a8 90%, transparent),
    radial-gradient(1px 1px at 91px 60px, #6896a3 90%, transparent),
    radial-gradient(1px 1px at 48px 125px, #547963 90%, transparent);
  background-size:
    197px 173px,
    281px 199px,
    379px 283px;
  mask-image: radial-gradient(ellipse at 50% 35%, #000, transparent 78%);
}
.auth-card {
  width: min(100%, 380px);
  text-align: center;
  position: relative;
}
.auth-eyebrow {
  font-size: 9px;
  letter-spacing: 2.4px;
  color: var(--theme-accent);
}
.auth-card h1 {
  font-size: 34px;
  font-weight: 450;
  letter-spacing: -1.3px;
  margin: 16px 0;
}
.auth-card h1 span {
  color: var(--theme-muted, #a6d2b3);
}
.auth-card p {
  font-size: 13px;
  line-height: 1.8;
  color: var(--theme-muted, #8ea09e);
  margin-bottom: 26px;
}
.google-signin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  border: 1px solid #747775;
  border-radius: 6px;
  background: #f2f2f2;
  color: #1f1f1f;
  width: 100%;
  min-height: 48px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}
.google-signin[href]:hover {
  background: #e6ece8;
  transform: translateY(-1px);
  box-shadow: 0 5px 24px #a8d8bb18;
}
.google-signin[href]:active {
  transform: translateY(0);
}
.google-signin:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.google-signin:focus-visible {
  outline: 2px solid #9ed8b8;
  outline-offset: 5px;
}
.auth-card .auth-message {
  margin: 20px 0 0;
  color: var(--theme-warning, #dcb78b);
  font-size: 12px;
}
.auth-private {
  display: block;
  margin-top: 22px;
  font-size: 10px;
  color: var(--theme-muted, #7c928b);
}
.auth-footer {
  position: relative;
  margin-top: 70px;
  font-size: 10px;
  color: var(--theme-muted, #596d67);
}
@media (prefers-reduced-motion: no-preference) {
  .auth-card {
    animation: auth-arrive 0.65s ease-out both;
  }
  .google-signin {
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }
}
@keyframes auth-arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (max-width: 480px) {
  .auth-horizon {
    width: 490px;
    right: -240px;
    top: -10px;
    opacity: 0.6;
  }
  .auth-card h1 {
    font-size: 29px;
  }
  .auth-card p,
  .auth-card .auth-message {
    font-size: 14px;
    line-height: 1.7;
  }
  .auth-private,
  .auth-footer {
    font-size: 12px;
    line-height: 1.6;
  }
  .auth-eyebrow {
    font-size: 10px;
    letter-spacing: 1.5px;
  }
  .auth-brand {
    left: max(24px, env(safe-area-inset-left));
    top: max(24px, env(safe-area-inset-top));
  }
  .auth-scene {
    margin-top: 45px;
  }
  .auth-footer {
    margin-top: 45px;
  }
}
</style>
