const settings = {
  loader: false,
  wide: false,
  enabled: true,
  isSbNation: {}
}

// TODO:
// [] fix on tab refresh/close
// [] make the popup look nicer

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ settings })
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const { settings } = await chrome.storage.sync.get('settings')
  const { tabId } = activeInfo
  const isSbNation = settings.isSbNation[tabId]
  if (!isSbNation) {
    return
  }

  const frames = await chrome.webNavigation.getAllFrames({ tabId })
  const comments = frames.find(x => x.url.includes('comments.'))
  if (!comments) {
    return
  }

  const target = {
    tabId,
    frameIds: [0, comments.frameId]
  }

  chrome.scripting.executeScript({
    target,
    func: applyCss,
    args: [settings.wide]
  })
})

chrome.runtime.onMessage.addListener(({ field, setting }, sender, send) => {
  send('ack')
  chrome.storage.sync.get('settings', async ({ settings }) => {
    const updated = { ...settings, [field]: setting }
    chrome.storage.sync.set({ settings: updated });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      return
    }

    const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id })
    const comments = frames.find(x => x.url.includes('comments.'))
    if (!comments) {
      return
    }
    const target = {
      tabId: tab.id,
      frameIds: [0, comments.frameId]
    }

    chrome.scripting.executeScript({
      target,
      func: applyCss,
      args: [updated.wide]
    })
  })
})

chrome.webNavigation.onCompleted.addListener(async (info) => {
  if (info.frameId === 0) {
    chrome.scripting.executeScript({
      target: {
        tabId: info.tabId,
        frameIds: [0]
      },
      args: [info.tabId],
      func: async (tabId) => {
        const isSbNation = !!document.getElementById('coral_thread')
        const { settings } = await chrome.storage.sync.get('settings')
        const newSettings = {
          ...settings,
          isSbNation: {
            ...settings.isSbNation,
            [tabId]: isSbNation
          }
        }
        await chrome.storage.sync.set({ settings: newSettings })
      }
    })
  }
  if (info.url.includes('comments.')) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      return
    }
    
    const target = {
      tabId: tab.id,
      frameIds: [0, info.frameId]
    }
  
    try {
      await chrome.scripting.insertCSS({
        files: ['main.css'],
        target
      })
    } catch (error) {
      console.error(error)
    }

    chrome.storage.sync.get('settings', ({ settings }) => {
      chrome.scripting.executeScript({
        target,
        func: applyCss,
        args: [settings.wide]
      })
    })
  }
})


// apply classes in both frames
const applyCss = (wide) => {
  const body = document.querySelector('body')
  if (wide) {
    body.classList.add('coral-loader')
  } else {
    body.classList.remove('coral-loader')
  }
}
