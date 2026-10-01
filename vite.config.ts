import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { assertFirebaseBuildConfig, LOCAL_ONLY_BUILD_OPT_OUT } from './src/firebase-build-contract';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const result = assertFirebaseBuildConfig(loadEnv(mode, process.cwd(), 'VITE_'), process.env[LOCAL_ONLY_BUILD_OPT_OUT] === '1');
    if (result === 'local-only') console.warn(`[cars] ${LOCAL_ONLY_BUILD_OPT_OUT}=1: building a local-only bundle.`);
  }
  return {
    base: '/cars/',
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    test: {
      environment: 'happy-dom',
      globals: true,
    },
  };
});
