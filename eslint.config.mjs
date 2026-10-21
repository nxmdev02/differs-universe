import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

const nuxtGlobals = Object.fromEntries(
  [
    'defineNuxtConfig',
    'defineEventHandler',
    'useRuntimeConfig',
    'getHeader',
    'setResponseHeader',
    'getRouterParam',
    'createError',
    '$fetch',
    'useFetch',
    'ref',
    'shallowRef',
    'computed',
    'watch',
    'onMounted',
    'onBeforeUnmount',
    'nextTick',
    'defineProps',
    'defineEmits',
    'defineExpose',
    'definePageMeta',
    'useHead',
  ].map((name) => [name, 'readonly']),
)
export default [
  {
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.nuxt-e2e/**',
      '.output/**',
      '.nitro/**',
      'test-results/**',
      'playwright-report/**',
      'artifacts/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    languageOptions: {
      globals: {
        ...nuxtGlobals,
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        CSS: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: ts.parser, extraFileExtensions: ['.vue'] },
    },
  },
]
