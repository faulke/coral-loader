let interval = null

let loader = document.getElementById('loader')
let wide = document.getElementById('wide')

const inputs = [
  loader,
  wide
]

const updateSettings = (field, setting) => {
  chrome.runtime.sendMessage(null, { field, setting }, (res) => {
    console.log(res)
  })
}

chrome.storage.sync.get('settings', async ({ settings }) => {
  console.log(settings)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isSbNation = settings.isSbNation[tab.id]
  inputs.forEach((input) => {
    input.disabled = !isSbNation
  })

  loader.checked = settings.loader
  wide.checked = settings.wide
})

loader.addEventListener('change', (ev) => {
  updateSettings('loader', ev.target.checked)
})

wide.addEventListener('change', (ev) => {
  updateSettings('wide', ev.target.checked)
})

window.onload = () => {
  console.log('loaded')
}
