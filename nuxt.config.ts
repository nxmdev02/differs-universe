export default defineNuxtConfig({
  buildDir: process.env.NUXT_TEST_BUILD_DIR || '.nuxt',
  compatibilityDate: '2026-10-21',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    vercelToken: '',
    vercelTeamId: '',
    githubToken: '',
    dataMode: 'mock',
    dashboardPassword: '',
    authMode: 'auto',
    appUrl: '',
    googleClientId: '',
    googleClientSecret: '',
    authAllowedEmails: '',
    sessionPassword: '',
  },
  app: {
    head: {
      title: 'differs — Project universe',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'A little perspective on everything you build. Explore your projects, deployments, and activity in one universe.',
        },
        { name: 'theme-color', content: '#0a0e11' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
