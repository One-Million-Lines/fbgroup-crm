import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Facebook Group CRM',
  version: '0.1.0',
  description: 'Lightweight CRM for Facebook group admins. Reads what is visible in facebook.com/groups/*.',
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel', 'tabs'],
  host_permissions: [
    'https://www.facebook.com/*',
    'https://m.facebook.com/*',
    'https://web.facebook.com/*',
    'http://localhost:5321/*',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://www.facebook.com/groups/*',
        'https://web.facebook.com/groups/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  side_panel: {
    default_path: 'src/panel/index.html',
  },
  action: { default_title: 'Open Facebook Group CRM' },
});
