const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", () => {
  let reg, owner, issuer, other;
  const h = (s) => ethers.sha256(ethers.toUtf8Bytes(s));

  beforeEach(async () => {
    [owner, issuer, other] = await ethers.getSigners();
    reg = await (await ethers.getContractFactory("CertificateRegistry")).deploy();
  });

  it("deployer is owner and issuer", async () => {
    expect(await reg.owner()).to.equal(owner.address);
    expect(await reg.isIssuer(owner.address)).to.equal(true);
  });

  it("only owner can add/remove issuers", async () => {
    await expect(reg.connect(other).addIssuer(other.address)).to.be.revertedWithCustomError(reg, "NotOwner");
    await reg.addIssuer(issuer.address);
    expect(await reg.isIssuer(issuer.address)).to.equal(true);
    await reg.removeIssuer(issuer.address);
    expect(await reg.isIssuer(issuer.address)).to.equal(false);
  });

  it("authorized issuer can issue; verify returns data", async () => {
    await reg.addIssuer(issuer.address);
    await reg.connect(issuer).issue(h("cert1"), "Asha Rao", "MCA Degree", "RTMNU");
    const [exists, valid, c] = await reg.verify(h("cert1"));
    expect(exists).to.equal(true);
    expect(valid).to.equal(true);
    expect(c.recipient).to.equal("Asha Rao");
    expect(c.issuer).to.equal(issuer.address);
    expect(await reg.totalIssued()).to.equal(1n);
  });

  it("rejects unauthorized issuers, duplicates and empty fields", async () => {
    await expect(reg.connect(other).issue(h("x"), "A", "B", "C")).to.be.revertedWithCustomError(reg, "NotIssuer");
    await reg.issue(h("x"), "A", "B", "C");
    await expect(reg.issue(h("x"), "A", "B", "C")).to.be.revertedWithCustomError(reg, "AlreadyIssued");
    await expect(reg.issue(h("y"), "", "B", "C")).to.be.revertedWithCustomError(reg, "EmptyField");
  });

  it("unknown hash verifies as non-existent", async () => {
    const [exists, valid] = await reg.verify(h("nope"));
    expect(exists).to.equal(false);
    expect(valid).to.equal(false);
  });

  it("revocation: issuer or owner only, once", async () => {
    await reg.addIssuer(issuer.address);
    await reg.connect(issuer).issue(h("c"), "A", "B", "C");
    await expect(reg.connect(other).revoke(h("c"), "r")).to.be.revertedWithCustomError(reg, "NotAuthorizedToRevoke");
    await reg.connect(issuer).revoke(h("c"), "Issued in error");
    const [exists, valid, c] = await reg.verify(h("c"));
    expect(exists).to.equal(true);
    expect(valid).to.equal(false);
    expect(c.revokeReason).to.equal("Issued in error");
    await expect(reg.revoke(h("c"), "again")).to.be.revertedWithCustomError(reg, "AlreadyRevoked");
    await expect(reg.revoke(h("zzz"), "r")).to.be.revertedWithCustomError(reg, "NotFound");
  });

  it("batch issuing works", async () => {
    await reg.issueBatch([h("a"), h("b")], ["P1", "P2"], "Workshop", "College");
    expect(await reg.totalIssued()).to.equal(2n);
    const [, valid] = await reg.verify(h("b"));
    expect(valid).to.equal(true);
  });

  it("ownership transfer", async () => {
    await reg.transferOwnership(other.address);
    expect(await reg.owner()).to.equal(other.address);
    await expect(reg.addIssuer(issuer.address)).to.be.revertedWithCustomError(reg, "NotOwner");
  });
});
