import http from 'node:http'
import fs from 'node:fs'
import { Readable } from 'node:stream'
import * as Client from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory'
import * as Proof from '@web3-storage/w3up-client/proof'
import { Signer } from '@web3-storage/w3up-client/principal/ed25519'
import { Form } from 'multiparty'
import { SERVER_PORT, PRIVATE_KEY, PROOF } from '../env.js'

const signer = Signer.parse(PRIVATE_KEY)
const store = new StoreMemory()
const client = await Client.create({ principal: signer, store })
const proof = await Proof.parse(PROOF)
const space = await client.addSpace(proof)
await client.setCurrentSpace(space.did())

console.log(`Server DID: ${signer.did()}`)
console.log(`Space DID: ${space.did()}`)
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    return res.end()
  }

  try {
    const files = await new Promise((resolve, reject) => {
      new Form().parse(req, (err, _, data) => {
        if (err) return reject(err)
        resolve(data.files)
      })
    })

    console.log(`uploading "${files.map(f => f.originalFilename).join('", "')}"...`)
    const root = await client.uploadDirectory(files.map(f => ({
      name: f.originalFilename,
      stream: () => Readable.toWeb(fs.createReadStream(f.path))
    })))

    // clean up temp files
    console.log('cleaning up...')
    await Promise.all(files.map(f => fs.promises.rm(f.path)))

    // send root CID back to client
    res.write(JSON.stringify({ root: root.toString() }))
    console.log(`success! ${root}`)
  } catch (err) {
    console.error(err)
    res.statusCode = 500
    res.write(err.message)
  } finally {
    res.end()
  }
})

await new Promise(resolve => server.listen(SERVER_PORT, () => resolve(server)))
console.log(`Server listening on :${SERVER_PORT}`)
