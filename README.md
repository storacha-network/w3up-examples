# w3up-examples

This repo contains runnable examples for using w3up in a variety of use cases.

## Usage

Install the `w3cli`:

```sh
npm install -g @web3-storage/w3cli
```

Create a space:

```sh
w3 space create Uploads # pick a good name!
```

⚠️ If you already created a space, use the newly created one with `w3 space use did:key...`.

Rename `env.tpl.js` to `env.js`:

```sh
cp env.tpl.js env.js
```

Generate an identity for the server:

```sh
# The following command returns what will be your server private key and DID (public key)
w3 key create
```

❗️ Store the private key (starting "Mg...") in `PRIVATE_KEY` in `env.js`

Delegate permissions for this space to the server:

```sh
# The following command creates a UCAN delegation from the w3cli agent to the
# agent you generated above.
#
# Use `w3 space use` prior to this to set the Space you intend on delegating
# access to.
#
# If you want to limit permissions being passed to the server, you can specify
# permissions to give, e.g., `--can space/blob/add --can space/index/add --can
# filecoin/offer --can upload/add` limits to just being able to upload.
w3 delegation create <did_from_w3_key_create_command_above> --base64
```

❗️ Store the output in environment variable `PROOF` in `env.js`.

Choose the example you want to use and install dependencies:

```sh
cd simple-upload
npm install
```

Finally, start the example:

```sh
npm start
```
