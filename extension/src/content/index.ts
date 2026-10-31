import { getPlatformAdapter } from './adapters';
import { EditorMonitor } from './editor-monitor';

(async function initCodeSenseContentScript() {
  const adapter = getPlatformAdapter();
  if (!adapter) {
    // Not a supported platform URL
    return;
  }

  console.info(`[CodeSense AI] Initializing adapter for ${adapter.name}...`);

  const monitor = new EditorMonitor(adapter);
  try {
    await monitor.start();
    console.info(`[CodeSense AI] Successfully active on ${adapter.name}!`);
  } catch (err) {
    console.error(`[CodeSense AI] Failed starting editor monitor:`, err);
  }

  window.addEventListener('beforeunload', () => {
    monitor.stop();
  });
})();

