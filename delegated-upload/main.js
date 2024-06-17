import * as Client from '@web3-storage/w3up-client'
import * as Delegation from '@web3-storage/w3up-client/delegation'
import { uploadFile } from '@web3-storage/upload-client'
import { fetchWithUploadProgress } from '@web3-storage/upload-client/fetch-with-upload-progress'
import * as dagJSON from '@ipld/dag-json'
import { SERVER_PORT } from '../env.js'

const delegationProviderEndpoint = `http://localhost:${SERVER_PORT}`

const outEl = document.getElementById('out')
const formEl = document.getElementById('form')
const dataEl = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('data'))
if (!outEl || !formEl || !dataEl) {
  throw new Error('missing required DOM element')
}

/** @param {string} msg */
const log = msg => {
  console.log(msg)
  outEl.innerText += `${msg}\n`
}

const client = await Client.create()
log(`agent DID: ${client.did()}`)

/** @type {import('@web3-storage/upload-client/types').InvocationConfigurator} */
const configure = async caps => {
  const res = await fetch(delegationProviderEndpoint, {
    method: 'POST',
    body: dagJSON.encode({ audience: client.did(), caps })
  })
  const proof = await Delegation.extract(new Uint8Array(await res.arrayBuffer()))
  if (!proof.ok) throw new Error('failed to extract delegation', { cause: proof.error })

  log(`received delegation for ${proof.ok.capabilities.map(c => c.can)}`)
  const resource =
    /** @type {import('@web3-storage/w3up-client/types').DID} */
    (proof.ok.capabilities[0].with)
  return { issuer: client.agent.issuer, with: resource, proofs: [proof.ok] }
}

formEl.addEventListener('submit', async e => {
  e.preventDefault()
  try {
    const input = dataEl.value
    log(`uploading "${input}"...`)
    const cid = await uploadFile(configure, new Blob([input]), {
      fetchWithUploadProgress,
      onUploadProgress: ({ url, total }) => log(`sent ${total} bytes to ${url}`)
    })
    log(`https://w3s.link/ipfs/${cid}`)
  } catch (err) {
    log(`Error: ${err.message}`)
    throw err
  }
})
