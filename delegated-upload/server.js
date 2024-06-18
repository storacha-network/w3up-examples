import http from 'node:http'
import { Buffer } from 'node:buffer'
import * as Caps from '@web3-storage/capabilities'
import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as Proof from '@web3-storage/w3up-client/proof'
import * as Delegation from '@web3-storage/w3up-client/delegation'
import { Signer } from '@web3-storage/w3up-client/principal/ed25519'
import * as dagJSON from '@ipld/dag-json'
import * as DID from '@ipld/dag-ucan/did'
import * as Link from 'multiformats/link'
import * as Digest from 'multiformats/hashes/digest'
import { SERVER_PORT, PRIVATE_KEY, PROOF } from '../env.js'

// https://github.com/multiformats/multicodec/blob/8fc4918c9e7c6cb8f1d0501523d5a0943c46a157/table.csv#L142
const CAR_CODE = 0x0202

/**
 * @typedef {{
 *   can: typeof Caps.Blob.add.can
 *   nb: import('@web3-storage/capabilities/types').BlobAdd['nb']
 * }} BlobAddCap
 * @typedef {{
 *   can: typeof Caps.Upload.add.can
 *   nb: import('@web3-storage/capabilities/types').UploadAdd['nb']
 * }} UploadAddCap
 * @typedef {{
 *   can: typeof Caps.Index.add.can
 *   nb: import('@web3-storage/capabilities/types').IndexAdd['nb']
 * }} IndexAddCap
 */

/**
 * @typedef {{
 *   audience: import('@web3-storage/w3up-client/types').Principal
 *   caps: Array<BlobAddCap|UploadAddCap|IndexAddCap>
 * }} DelegationRequest
 */

const signer = Signer.parse(PRIVATE_KEY)
const store = new StoreMemory()
const client = await Client.create({ principal: signer, store })
const proof = await Proof.parse(PROOF)
const space = await client.addSpace(proof)
await client.setCurrentSpace(space.did())

console.log(`Server DID: ${signer.did()}`)
console.log(`Space DID: ${space.did()}`)

/**
 * @param {Uint8Array} bytes
 * @returns {DelegationRequest}
 */
const parsePayload = (bytes) => {
  const raw = dagJSON.decode(bytes)
  // TODO: validate payload properly!!!
  return { audience: DID.parse(raw.audience), caps: raw.caps }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const delegationReq = parsePayload(Buffer.concat(chunks))

    // TODO: validate user exists
    console.log(`creating delegation for: ${delegationReq.audience.did()}`)

    let totalSize = 0
    for (const { can, nb } of delegationReq.caps) {
      console.log(can, nb)
      if (can === Caps.Blob.add.can) {
        const cid = Link.create(CAR_CODE, Digest.decode(nb.blob.digest))
        console.log(`storing CAR ${cid} (${nb.blob.size} bytes)`)
        totalSize += nb.blob.size
      }
    }
    if (totalSize) console.log(`storing ${totalSize} bytes`)
    // TODO: validate user is allowed to upload this many more bytes

    const delegation = await Delegation.delegate({
      issuer: signer,
      audience: delegationReq.audience,
      // @ts-expect-error payload validation should assert 1 or more capabilities
      capabilities: delegationReq.caps.map(c => ({ can: c.can, with: space.did(), nb: c.nb })),
      proofs: client.proofs(delegationReq.caps.map(c => ({ can: c.can, with: space.did() }))),
      expiration: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h in seconds
    })
  
    // Serialize the delegation and send it to the client
    const archive = await delegation.archive()
    if (!archive.ok) throw new Error('failed to create archive', { cause: archive.error })
    
    console.log('sending delegation')
    res.write(archive.ok)
    res.end()
  } catch (err) {
    console.error(err)
    res.statusCode = 500
    res.write(err.message)
    res.end()
  } 
})

await new Promise(resolve => server.listen(SERVER_PORT, () => resolve(server)))
console.log(`Server listening on :${SERVER_PORT}`)
