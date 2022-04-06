let wide = document.getElementById('wide')
let description = document.getElementById('description')
let settingsElem = document.getElementById('settings')

const inputs = [
  wide
]

const updateSettings = (field, setting) => {
  chrome.runtime.sendMessage(null, { field, setting })
}

chrome.storage.sync.get('settings', async ({ settings }) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isSbNation = settings.isSbNation[tab.id]
  inputs.forEach((input) => {
    input.disabled = !isSbNation
  })

  if (!isSbNation) {
    description.classList.add('disabled')
    settingsElem && settingsElem.classList.add('disabled')
  }

  wide.checked = settings.wide
})

wide.addEventListener('change', (ev) => {
  updateSettings('wide', ev.target.checked)
})
