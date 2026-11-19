import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { brand } from './config/brand';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  imports: false,
  manifestVersion: 3,
  manifest: {
    name: brand.name,
    description: brand.description,
    permissions: ['storage', 'alarms', 'notifications', 'tabs', 'scripting', 'activeTab'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: brand.name,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
