const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const Registry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const net = await hre.ethers.provider.getNetwork();
  console.log(`CertificateRegistry deployed to: ${address} (chainId ${net.chainId})`);

  const out = { address, chainId: Number(net.chainId), network: hre.network.name };
  fs.writeFileSync(path.join(__dirname, "../frontend/deployment.json"), JSON.stringify(out, null, 2));
  console.log("Saved frontend/deployment.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
