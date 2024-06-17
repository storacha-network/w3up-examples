import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as Proof from '@web3-storage/w3up-client/proof'
import { Signer } from '@web3-storage/w3up-client/principal/ed25519'
import { PRIVATE_KEY, PROOF } from '../env.js'

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

formEl.addEventListener('submit', async e => {
  e.preventDefault()

  try {
    const principal = Signer.parse(PRIVATE_KEY)
    log(`agent DID: ${principal.did()}`)
    const store = new StoreMemory()
    const client = await Client.create({ principal, store })
    const proof = await Proof.parse(PROOF)
    log(`proof: ${proof.cid}`)
    const space = await client.addSpace(proof)
    log(`space DID: ${space.did()}`)
    await client.setCurrentSpace(space.did())
    const input = dataEl.value
    log(`uploading "${input}"...`)
    const cid = await client.uploadFile(new Blob([input]))
    log(`https://w3s.link/ipfs/${cid}`)
  } catch (err) {
    log(`Error: ${err.message}`)
    throw err
  }
})
