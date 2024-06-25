# piece-hasher-worker

In this example, piece hashing is done on a separate worker thread in order to not block the main thread.

Piece hashes are the primary means of addressing data stored on Filecoin. Piece hashes are generated on the client for provability and verification, however they are computationally expensive to create. By moving the work into a dedicated web worker the main thread does not get blocked.
