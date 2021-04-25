import path, { resolve } from 'path'
import resolveFrom from 'resolve-from'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh()],
  resolve: {
    alias: {
      '@reduxjs/toolkit/query': resolve(__dirname, '../../'),
      '@reduxjs/toolkit': resolve(__dirname, '../../../'),
      react: resolveFrom(
        path.resolve(__dirname, '../../../node_modules'),
        'react'
      ),
      'react-dom$': resolveFrom(
        path.resolve(__dirname, '../../../node_modules'),
        'react-dom'
      ),
    },
  },
})
