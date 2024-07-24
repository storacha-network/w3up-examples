import { SERVER_PORT } from '../env.js'

const endpoint = `http://localhost:${SERVER_PORT}`

const outEl = document.querySelector('pre')
const formEl = document.querySelector('form')
const fileEl = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name=files]'))
if (!outEl || !formEl || !fileEl) {
  throw new Error('missing required DOM element')
}

/** @param {string} msg */
const log = msg => {
  console.log(msg)
  outEl.innerText += `${msg}\n`
}

formEl.addEventListener('submit', async e => {
  e.preventDefault()
  try {
    const input = [...fileEl.files].map(f => f.name)
    log(`uploading "${input.join('", "')}"...`)

    const res = await fetch(endpoint, {
      method: 'POST',
      body: new FormData(formEl)
    })
    if (!res.ok) {
      throw new Error(`upload failed, status code: ${res.status}`)
    }

    const data = await res.json()
    log(`https://w3s.link/ipfs/${data.root}`)
  } catch (err) {
    log(`Error: ${err.message}`)
    throw err
  }
})
