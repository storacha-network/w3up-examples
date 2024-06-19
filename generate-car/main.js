import * as UnixFS from '@web3-storage/upload-client/unixfs'
import * as CAR from '@web3-storage/upload-client/car'
import { UnixFSLeaf, configure } from '@ipld/unixfs'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'

const SettingsV0 = configure({
  fileChunkEncoder: UnixFSLeaf,
  smallFileEncoder: UnixFSLeaf,
  // @ts-expect-error
  linker: { createLink: (_, digest) => Link.createLegacy(digest) }
})

const outEl = document.getElementById('out')
const formEl = /** @type {HTMLFormElement|null} */ (document.querySelector('form'))
const wrapEl = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name=wrap]'))
const fileEl = /** @type {HTMLInputElement|null} */ (document.querySelector('input[name=files]'))
if (!outEl || !formEl || !fileEl || !wrapEl) {
  throw new Error('missing required DOM element')
}

/** @param {string} msg */
const log = msg => {
  console.log(msg)
  outEl.innerText += `${msg}\n`
}

const handleFileChange = () => { wrapEl.disabled = fileEl.files?.length !== 1 }
fileEl.addEventListener('change', handleFileChange)
handleFileChange()

formEl.addEventListener('submit', async e => {
  e.preventDefault()

  const { files } = fileEl
  if (!files?.length) {
    return log('no file(s) selected')
  }

  const data = new FormData(formEl)
  const wrap = data.get('wrap') === 'on'
  const version = data.get('version') === '0' ? 0 : 1

  log('encoding DAG...')
  // configure with legacy CIDv0 settings if requested or use defaults otherwise
  const settings = version === 0 ? SettingsV0 : undefined
  const { cid: rootCID, blocks } = files.length === 1
    ? wrap
      ? await UnixFS.encodeDirectory(files, { settings })
      : await UnixFS.encodeFile(files[0], { settings })
    : await UnixFS.encodeDirectory(files, { settings })
  log(`root: ${rootCID}`)

  log('encoding CAR...')
  const car = await CAR.encode(blocks, rootCID)
  const carBytes = new Uint8Array(await car.arrayBuffer())
  const shardCID = Link.create(CAR.code, await sha256.digest(carBytes))
  log(`shard: ${shardCID} (${car.size} bytes)`)
})
