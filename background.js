const settings = {
  loader: false,
  wide: false,
  enabled: true,
  intervals: {},
  isSbNation: {}
}

let activeTabId
let lastTabId


// TODO:
// [x] make sure site is an SBNation site, check elem '.coral-script' exists, disable extension settings
// [x] make sure comments frame is loaded
// [x] fire scripts for inital settings
// [] on tab change, load settings
// [] make the popup look nice

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ settings })
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log(activeInfo)
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

  chrome.scripting.executeScript({
    target: {
      tabId,
      frameIds: [comments.frameId]
    },
    func: loadComments,
    args: [settings.loader, tabId]
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
    const target = {
      tabId: tab.id,
      frameIds: [0, comments.frameId]
    }

    chrome.scripting.executeScript({
      target,
      func: applyCss,
      args: [updated.wide]
    })

    chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        frameIds: [comments.frameId]
      },
      func: loadComments,
      args: [updated.loader, tab.id]
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
        const isSbNation = !!document.querySelector('.coral-script')
        const { settings } = await chrome.storage.sync.get('settings')
        const newSettings = {
          ...settings,
          isSbNation: {
            ...settings.isSbNation,
            [tabId]: isSbNation
          }
        }
        await chrome.storage.sync.set({ settings: newSettings })
        console.log('settings saved')
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
      console.log(error)
    }

    chrome.storage.sync.get('settings', ({ settings }) => {
      chrome.scripting.executeScript({
        target,
        func: applyCss,
        args: [settings.wide]
      })

      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
          frameIds: [info.frameId]
        },
        func: loadComments,
        args: [settings.loader, tab.id]
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

// apply other settings in comments frame
const loadComments = async (checked, tabId) => {
  const { settings } = await chrome.storage.sync.get('settings')
  if (!checked) {
    window.clearInterval(settings.intervals[tabId])
    const intervals = { ...settings.intervals }
    delete intervals[tabId]
    await chrome.storage.sync.set({ settings: { ...settings, intervals } })
    return
  }

  if (settings.intervals[tabId]) {
    return
  }

  const interval = window.setInterval(() => {
    const loadMore = document.querySelector('#comments-allComments-viewNewButton')
    const replies = document.querySelectorAll('[id*="showMoreReplies"]')
    if (loadMore) {
      console.log('loading comments')
      loadMore.click()
    }

    if (replies.length) {
      console.log('loading replies')
      replies.forEach(rep => rep.click())
    }
  }, 1000)

  const newSettings = {
    ...settings,
    intervals: {
      ...settings.intervals,
      [tabId]: interval
    }
  }

  await chrome.storage.sync.set({ settings: newSettings })
}
