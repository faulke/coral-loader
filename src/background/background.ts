const initStorage = () => {
  chrome.storage.sync.get(
    ['wideEnabled', 'darkEnabled', 'autoRefreshEnabled'],
    (res) => {
      if (res.wideEnabled === undefined)
        chrome.storage.sync.set({ wideEnabled: false });
      if (res.darkEnabled === undefined)
        chrome.storage.sync.set({ darkEnabled: false });
      if (res.autoRefreshEnabled === undefined)
        chrome.storage.sync.set({ autoRefreshEnabled: false });
    },
  );
};

chrome.runtime.onInstalled.addListener(() => {
  initStorage();
});
