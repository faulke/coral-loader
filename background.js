// TODO:
// [] on tab refresh/close, remove tab-specific settings from storage
// [] make the popup look nicer
// [] load all comments on page open
// [] auto-load new comments
// [] when z-ing through comments, scroll selected comment to center of screen

// default storage settings
const defaultSettings = {
  loader: false,
  wide: false,
  enabled: true,
  isSbNation: {}
}

// set default settings
chrome.runtime.onInstalled.addListener(async () => {
  await setSettings(defaultSettings)
})

// new tab activated listener
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const settings = await getSettings()
  const { tabId } = activeInfo

  // check isSbNation site
  const isSbNation = settings.isSbNation[tabId]
  if (!isSbNation) {
    return
  }

  const target = {
    tabId,
    frameIds: [0]
  }

  // add/remove loader class based on settings
  chrome.scripting.executeScript({
    target,
    func: applyLoaderCls,
    args: [settings.wide]
  })

  chrome.scripting.executeScript({
    target,
    func: applyThreadStyle,
    args: [settings.wide]
  })
})

// popup settings changed listener
chrome.runtime.onMessage.addListener(async ({ field, setting }, sender, send) => {
  send('ack')

  // first, update settings
  const settings = await getSettings()
  const updated = { ...settings, [field]: setting }
  await setSettings(updated)

  // get current active tab
  const [tab] = await getActiveTab()
  if (!tab) {
    return
  }

  const target = {
    tabId: tab.id,
    frameIds: [0]
  }

  // add/remove loader class based on settings
  chrome.scripting.executeScript({
    target,
    func: applyLoaderCls,
    args: [updated.wide]
  })

  chrome.scripting.executeScript({
    target,
    func: applyThreadStyle,
    args: [updated.wide]
  })
})

// on comments web request completed (comment loaded)
chrome.webRequest.onCompleted.addListener(async (request) => {
  const { tabId } = request
  const settings = await getSettings()

  chrome.scripting.executeScript({
    target: {
      tabId,
      frameIds: [0]
    },
    args: [settings.wide],
    func: applyThreadStyle
  })
}, {
  urls: ['https://*/api/graphql*']
})

// on page load
chrome.webNavigation.onCompleted.addListener(async (info) => {
  // default frame has loaded, frameId === 0
  // check if site is SbNation
  if (info.frameId === 0) {
    const target = {
      tabId: info.tabId,
      frameIds: [0]
    }

    const result = await chrome.scripting.executeScript({
      target,
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
        return isSbNation
      }
    })

    if (result[0].result) {
      const settings = await getSettings()
      try {
        await chrome.scripting.insertCSS({
          files: ['main.css'],
          target
        })
      } catch (error) {
        console.error(error)
      }
  
      chrome.scripting.executeScript({
        target,
        func: applyLoaderCls,
        args: [settings.wide]
      })

      // don't need to apply thread settings until web request completed
    }
  }
})


// helpers
const getActiveTab = () => chrome.tabs.query({ active: true, currentWindow: true })

const getSettings = async () => {
  const { settings } = await chrome.storage.sync.get('settings')
  return settings
}

const setSettings = async (settings) => {
  await chrome.storage.sync.set({ settings })
}

const applyLoaderCls = (wide) => {
  const body = document.querySelector('body')
  if (wide) {
    body.classList.add('coral-loader')
  } else {
    body.classList.remove('coral-loader')
  }
}

const applyThreadStyle = (wide) => {
  const coral = document.querySelector('#coral_thread div')
  if (!coral) {
    return
  }

  const shadowRoot = coral.shadowRoot
  if (!shadowRoot) {
    return
  }

  const styleId = 'coral-loader'
  const loaderStyle = shadowRoot.querySelector(`#${styleId}`)
  if (!wide && !loaderStyle) {
    return
  }

  if (!wide && loaderStyle) {
    loaderStyle.remove()
    return
  }

  if (wide && loaderStyle) {
    return
  }

  // apply indents to threads
  let style = document.createElement('style')
  style.id = styleId
  shadowRoot.appendChild(style)
  style.innerText = '.coral-indent-1 { margin-left: 48px !important; }'
}
