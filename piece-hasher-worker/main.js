import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as Proof from '@web3-storage/w3up-client/proof'
import { Signer } from '@web3-storage/w3up-client/principal/ed25519'
import * as PieceHasher from '@web3-storage/piece-hasher-worker'
import { PRIVATE_KEY, PROOF } from '../env.js'

const outEl = document.getElementById('out')
const formEl = /** @type {HTMLFormElement|null} */ (document.querySelector('form'))
const fileEl = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name=files]'))
const loaderEl = document.getElementById('loading')
if (!outEl || !formEl || !fileEl || !loaderEl) {
  throw new Error('missing required DOM element')
}

let i = 0
const dots = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
setInterval(() => {
  loaderEl.innerText = dots[i]
  i++
  if (i >= dots.length) {
    i = 0
  }
}, 100)

/** @param {string} msg */
const log = msg => {
  console.log(msg)
  outEl.innerText += `${msg}\n`
}

formEl.addEventListener('submit', async e => {
  e.preventDefault()

  const { files } = fileEl
  if (!files?.length) {
    return log('no file(s) selected')
  }

  try {
    loaderEl.style.display = 'block'

    const principal = Signer.parse(PRIVATE_KEY)
    log(`agent DID: ${principal.did()}`)
    const store = new StoreMemory()
    const client = await Client.create({ principal, store })
    const proof = await Proof.parse(PROOF)
    log(`proof: ${proof.cid}`)
    const space = await client.addSpace(proof)
    log(`space DID: ${space.did()}`)
    await client.setCurrentSpace(space.did())

    let n = 0
    const cid = await client.uploadDirectory(files, {
      pieceHasher: PieceHasher.create('node_modules/@web3-storage/piece-hasher-worker/worker.min.js'),
      onShardStored ({ piece }) {
        log(`shard ${n++} piece CID: ${piece}`)
      }
    })
    log(`https://w3s.link/ipfs/${cid}`)
  } catch (err) {
    log(`Error: ${err.message}`)
    throw err
  } finally {
    loaderEl.style.display = 'none'
  }
})
