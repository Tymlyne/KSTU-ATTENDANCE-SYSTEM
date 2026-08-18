import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // or standard tailwindcss plugin depending on setup

export default defineConfig({
  plugins: [react(), tailwindcss()],
});