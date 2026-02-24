import { CONFIG } from '../config';

import injectedStyles from './styles.css?inline'; // We'll rely on Vite string import for the CSS
import shadowStyles from './shadowStyles.css?inline';

let isSupported = false;

function checkSupport() {
  const root = document.querySelector(CONFIG.selectors.rootSelector);
  isSupported = !!root;
  return isSupported;
}

function injectCSS() {
  if (!document.getElementById('coral-enhancer-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'coral-enhancer-styles';
    styleEl.textContent = injectedStyles;

    // Inject into body
    document.head.appendChild(styleEl);
  }

  // Also inject into Shadow DOM if available
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (shadowHost?.shadowRoot) {
    if (!shadowHost.shadowRoot.getElementById('coral-enhancer-styles-shadow')) {
      const shadowStyleEl = document.createElement('style');
      shadowStyleEl.id = 'coral-enhancer-styles-shadow';
      shadowStyleEl.textContent = shadowStyles;
      shadowHost.shadowRoot.appendChild(shadowStyleEl);
    }
  }
}

function applyFeatures(features: {
  wideEnabled?: boolean;
  darkEnabled?: boolean;
  autoRefreshEnabled?: boolean;
  autoRefreshInterval?: number;
}) {
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  const shadowRoot = shadowHost?.shadowRoot;
  const container = shadowRoot?.querySelector(
    CONFIG.selectors.shadowRootContainer,
  );

  // If container isn't in shadow root yet, we might be too early. The observer will catch it later.
  if (!container) return;

  // Apply wide mode
  if (features.wideEnabled) {
    container.classList.add(CONFIG.classes.wide);
    document.body.classList.add(CONFIG.classes.wide); // sometimes body width is also needed
  } else if (features.wideEnabled === false) {
    container.classList.remove(CONFIG.classes.wide);
    document.body.classList.remove(CONFIG.classes.wide);
  }

  // Apply dark mode
  if (features.darkEnabled !== undefined && shadowHost) {
    if (features.darkEnabled) {
      container.classList.add(CONFIG.classes.dark);
      document.body.classList.add(CONFIG.classes.dark);
    } else {
      container.classList.remove(CONFIG.classes.dark);
      document.body.classList.remove(CONFIG.classes.dark);
    }
  }

  if (features.autoRefreshInterval !== undefined) {
    currentAutoRefreshInterval = features.autoRefreshInterval;
  }

  // Auto Refresh
  if (features.autoRefreshEnabled !== undefined) {
    if (features.autoRefreshEnabled) {
      container.classList.add(CONFIG.classes.autoRefresh);
      startAutoRefreshObserver();
    } else {
      container.classList.remove(CONFIG.classes.autoRefresh);
      stopAutoRefreshObserver();
    }
  }
}

let autoRefreshObserver: MutationObserver | null = null;
let currentAutoRefreshInterval = 5;
let autoRefreshTimeoutId: number | null = null;

function clickRefreshButtons() {
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (!shadowHost || !shadowHost.shadowRoot) return;

  const newBtn = shadowHost.shadowRoot.querySelector<HTMLButtonElement>(
    CONFIG.selectors.showMoreCommentsButton,
  );
  if (newBtn) {
    newBtn.click();
  }

  const replyBtns = shadowHost.shadowRoot.querySelectorAll<HTMLButtonElement>(
    CONFIG.selectors.showRepliesButton,
  );
  if (replyBtns) {
    replyBtns.forEach((btn) => {
      btn.click();
    });
  }
}

function scheduleAutoRefresh() {
  if (autoRefreshTimeoutId !== null) return;

  if (currentAutoRefreshInterval === 0) {
    clickRefreshButtons();
  } else {
    autoRefreshTimeoutId = window.setTimeout(() => {
      autoRefreshTimeoutId = null;
      clickRefreshButtons();
    }, currentAutoRefreshInterval * 1000);
  }
}

function checkAndSchedule() {
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (!shadowHost || !shadowHost.shadowRoot) return;

  const hasNewBtn = !!shadowHost.shadowRoot.querySelector(
    CONFIG.selectors.showMoreCommentsButton,
  );
  const hasReplyBtns = !!shadowHost.shadowRoot.querySelector(
    CONFIG.selectors.showRepliesButton,
  );

  if (hasNewBtn || hasReplyBtns) {
    scheduleAutoRefresh();
  }
}

function startAutoRefreshObserver() {
  if (autoRefreshObserver) return;
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (!shadowHost || !shadowHost.shadowRoot) return;

  checkAndSchedule();

  autoRefreshObserver = new MutationObserver(() => {
    checkAndSchedule();
  });

  autoRefreshObserver.observe(shadowHost.shadowRoot, {
    childList: true,
    subtree: true,
  });
}

function stopAutoRefreshObserver() {
  if (autoRefreshObserver) {
    autoRefreshObserver.disconnect();
    autoRefreshObserver = null;
  }
  if (autoRefreshTimeoutId !== null) {
    window.clearTimeout(autoRefreshTimeoutId);
    autoRefreshTimeoutId = null;
  }
}

let hasInitialized = false;

function initExtension() {
  const shadowHost = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (!shadowHost || !shadowHost.shadowRoot) return;

  // ensure the inner container exists before we apply classes
  const container = shadowHost.shadowRoot.querySelector(
    CONFIG.selectors.shadowRootContainer,
  );
  if (!container) return;

  if (!hasInitialized) {
    hasInitialized = true;
    console.info(
      '[Coral Loader] Initialization conditions met, injecting styles.',
    );
  }

  // Try to inject CSS if it's missing (either initially or after a soft page reload)
  injectCSS();

  // Re-apply features in case the DOM was rebuilt
  chrome.storage.sync.get(
    ['wideEnabled', 'darkEnabled', 'autoRefreshEnabled', 'autoRefreshInterval'],
    (res) => {
      applyFeatures(res);
    },
  );
}

// Observe the DOM until the Coral System fully mounts
const globalObserver = new MutationObserver(() => {
  // Only query if we haven't initialized, or if the shadow container's style tag went missing
  const root = document.querySelector(
    CONFIG.selectors.rootSelector,
  ) as HTMLElement;
  if (root?.shadowRoot) {
    if (
      !root.shadowRoot.getElementById('coral-enhancer-styles-shadow') ||
      !root.shadowRoot.querySelector(
        `.${CONFIG.classes.wide}, .${CONFIG.classes.dark}, .${CONFIG.classes.autoRefresh}`,
      )
    ) {
      initExtension();
    }
  } else {
    hasInitialized = false; // Reset if the host was removed
  }
});

if (document.body) {
  globalObserver.observe(document.body, { childList: true, subtree: true });
  initExtension();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    globalObserver.observe(document.body, { childList: true, subtree: true });
    initExtension();
  });
}

// Message Listener
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'GET_STATE') {
    chrome.storage.sync.get(
      [
        'wideEnabled',
        'darkEnabled',
        'autoRefreshEnabled',
        'autoRefreshInterval',
      ],
      (res) => {
        sendResponse({
          supported: checkSupport(), // Re-check support
          wideEnabled: !!res.wideEnabled,
          darkEnabled: !!res.darkEnabled,
          autoRefreshEnabled: !!res.autoRefreshEnabled,
          autoRefreshInterval: res.autoRefreshInterval ?? 5,
        });
      },
    );
    return true; // async response
  }

  if (request.type === 'SET_FEATURE') {
    const { feature, value } = request;
    applyFeatures({ [feature]: value });
    sendResponse({ success: true });
    return false;
  }
});
