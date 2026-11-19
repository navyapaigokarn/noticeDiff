import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { createChromeMonitorDependencies, openChangeFromNotification } from '@/services/chrome-runtime';
import { handleExtensionMessage } from '@/services/message-handler';
import { registerScheduler } from '@/services/scheduler.service';

export default defineBackground(() => {
  const dependencies = createChromeMonitorDependencies();
  registerScheduler(dependencies);

  browser.runtime.onMessage.addListener((message) => {
    return handleExtensionMessage(message, dependencies);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    void openChangeFromNotification(notificationId);
  });
});
