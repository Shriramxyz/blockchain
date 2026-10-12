# CertChain – Blockchain Certificate Verification

Issuers register the **SHA-256 fingerprint** of a certificate on an Ethereum-compatible chain.
Anyone can later drop the file into the web app: if its hash is on-chain and not revoked, it is authentic.
Any change to the file (even one byte) changes the hash, so tampered or forged files fail verification.
Certificate files never leave the browser; only the hash + basic metadata are stored on-chain.

## Structure
- `contracts/CertificateRegistry.sol` – owner, authorized issuers, issue / batch issue / revoke / verify
- `test/registry.test.js` – 8 automated tests
- `scripts/deploy.js` – deploys and writes `frontend/deployment.json`
- `frontend/index.html` – Verify, Issue, Revoke, Admin tabs (ethers.js + MetaMask)

## Run locally
```bash
npm install
npx hardhat test                  # run tests
npx hardhat node                  # terminal 1: local chain (prints test accounts + private keys)
npm run deploy:local              # terminal 2: deploy
cd frontend && python3 -m http.server 8000    # open http://localhost:8000
```
In MetaMask: add network `http://127.0.0.1:8545`, chain ID `31337`, and import a test private key
from the `hardhat node` output. Account #0 is the owner/issuer (it deployed the contract).

If your network blocks the Solidity compiler download, prefix commands with `USE_SOLCJS=1`.

## Public testnet (Sepolia)
```bash
export SEPOLIA_RPC_URL=...  PRIVATE_KEY=0x...
npm run deploy:sepolia
```
Then set the contract address and a Sepolia RPC URL in the app's *Network settings*.

## Roles
- **Owner** (deployer): authorize/remove issuers, transfer ownership, revoke any certificate
- **Issuer**: register certificates, revoke their own
- **Anyone**: verify (read-only, no wallet or gas needed)
