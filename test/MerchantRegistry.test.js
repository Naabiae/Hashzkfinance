import { expect } from "chai";
import hre from "hardhat";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";

describe("MerchantRegistry - Tiered KYC and Revocation", function () {
  let verifier, merchantRegistry;
  let owner, user1;
  let poseidon;

  before(async function () {
    poseidon = await buildPoseidon();
  });

  beforeEach(async function () {
    [owner, user1] = await hre.ethers.getSigners();

    const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    const MerchantRegistry = await hre.ethers.getContractFactory("MerchantRegistry");
    merchantRegistry = await MerchantRegistry.deploy(await verifier.getAddress());
  });

  it("should verify a valid tiered KYC proof and mint a Merchant NFT", async function () {
    const secret = 123456789n;
    const nullifier = 987654321n;
    const tier = 2n; // Tier 2 KYC

    // commitment = hash(secret, nullifier, tier)
    const commitmentHash = poseidon([secret, nullifier, tier]);
    const commitment = poseidon.F.toObject(commitmentHash);

    const nullifierHashHash = poseidon([nullifier]);
    const nullifierHash = poseidon.F.toObject(nullifierHashHash);

    await merchantRegistry.connect(owner).addValidCommitment(commitment);

    const { proof, publicSignals } = await groth16.fullProve(
      { secret: secret, nullifier: nullifier, tier: tier, commitment: commitment },
      "circuits/kyc_js/kyc.wasm",
      "kyc_final.zkey"
    );

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(",").map(x => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    const Input = [argv[8], argv[9], argv[10]]; // [nullifierHash, userTier, commitment]

    const tx = await merchantRegistry.connect(user1).verifyAndMint(a, b, c, Input);
    await tx.wait();

    expect(await merchantRegistry.balanceOf(user1.address)).to.equal(1);
    expect(await merchantRegistry.ownerOf(0)).to.equal(user1.address);
    expect(await merchantRegistry.isNullifierUsed(nullifierHash)).to.be.true;
    expect(await merchantRegistry.getMerchantTier(user1.address)).to.equal(2n);
  });

  it("should fail if user tampers with the tier publicly", async function () {
    const secret = 123456789n;
    const nullifier = 987654321n;
    const actualTier = 1n; // User actually has Tier 1
    const tamperedTier = 2n; // User tries to claim Tier 2

    const commitmentHash = poseidon([secret, nullifier, actualTier]);
    const commitment = poseidon.F.toObject(commitmentHash);

    await merchantRegistry.connect(owner).addValidCommitment(commitment);

    const { proof, publicSignals } = await groth16.fullProve(
      { secret: secret, nullifier: nullifier, tier: actualTier, commitment: commitment },
      "circuits/kyc_js/kyc.wasm",
      "kyc_final.zkey"
    );

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(",").map(x => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    
    // Tamper with the public inputs (index 1 is userTier)
    const Input = [argv[8], tamperedTier.toString(), argv[10]];

    await expect(
      merchantRegistry.connect(user1).verifyAndMint(a, b, c, Input)
    ).to.be.revertedWith("Invalid ZK proof");
  });

  it("should allow admin to revoke a merchant's KYC", async function () {
    const secret = 123456789n;
    const nullifier = 987654321n;
    const tier = 1n;

    const commitmentHash = poseidon([secret, nullifier, tier]);
    const commitment = poseidon.F.toObject(commitmentHash);

    await merchantRegistry.connect(owner).addValidCommitment(commitment);

    const { proof, publicSignals } = await groth16.fullProve(
      { secret: secret, nullifier: nullifier, tier: tier, commitment: commitment },
      "circuits/kyc_js/kyc.wasm",
      "kyc_final.zkey"
    );

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(",").map(x => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    const Input = [argv[8], argv[9], argv[10]];

    await merchantRegistry.connect(user1).verifyAndMint(a, b, c, Input);
    
    // Verify tier is 1
    expect(await merchantRegistry.getMerchantTier(user1.address)).to.equal(1n);

    // Admin revokes the NFT (tokenId 0)
    await merchantRegistry.connect(owner).revokeMerchant(0);

    // Verify balance is 0 and tier is reset
    expect(await merchantRegistry.balanceOf(user1.address)).to.equal(0);
    expect(await merchantRegistry.getMerchantTier(user1.address)).to.equal(0n);
  });
});