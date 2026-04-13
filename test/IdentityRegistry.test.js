import { expect } from "chai";
import hre from "hardhat";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";

describe("HashBazaar Ecosystem - IdentityRegistry, P2PEscrow, ProductRegistry", function () {
  let verifier, identityRegistry, usdcMock, p2pEscrow, productRegistry;
  let owner, merchant, agent, nonVerifiedUser;
  let poseidon;

  before(async function () {
    poseidon = await buildPoseidon();
  });

  beforeEach(async function () {
    [owner, merchant, agent, nonVerifiedUser] = await hre.ethers.getSigners();

    // 1. Deploy Verifier
    const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    // 2. Deploy IdentityRegistry
    const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await verifier.getAddress());

    // 3. Deploy a Mock ERC20 (USDC)
    const ERC20Mock = await hre.ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    usdcMock = await ERC20Mock.deploy("Mock USDC", "USDC", merchant.address, hre.ethers.parseUnits("1000", 6));

    // 4. Deploy P2PEscrow
    const P2PEscrow = await hre.ethers.getContractFactory("P2PEscrow");
    p2pEscrow = await P2PEscrow.deploy(await identityRegistry.getAddress(), await usdcMock.getAddress());

    // 5. Deploy ProductRegistry
    const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
    productRegistry = await ProductRegistry.deploy(await identityRegistry.getAddress());

    // Helper: Mint KYC for Merchant (Role 1)
    const mintIdentity = async (user, role, secret, nullifier) => {
      const commitmentHash = poseidon([secret, nullifier, role]);
      const commitment = poseidon.F.toObject(commitmentHash);

      await identityRegistry.connect(owner).addValidCommitment(commitment);

      const { proof, publicSignals } = await groth16.fullProve(
        { secret: secret, nullifier: nullifier, tier: role, commitment: commitment },
        "circuits/kyc_js/kyc.wasm",
        "kyc_final.zkey"
      );

      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      const argv = calldata.replace(/["[\]\s]/g, "").split(",").map(x => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
      const c = [argv[6], argv[7]];
      const Input = [argv[8], argv[9], argv[10]]; // [nullifierHash, userRole, commitment]

      await identityRegistry.connect(user).verifyAndMint(a, b, c, Input);
    };

    await mintIdentity(merchant, 1n, 123456789n, 987654321n); // Merchant is Role 1
    await mintIdentity(agent, 2n, 111111111n, 222222222n);    // Agent is Role 2
  });

  describe("IdentityRegistry", function () {
    it("should assign Role 1 to the Merchant and Role 2 to the Agent", async function () {
      expect(await identityRegistry.getUserRole(merchant.address)).to.equal(1n);
      expect(await identityRegistry.getUserRole(agent.address)).to.equal(2n);
      expect(await identityRegistry.getUserRole(nonVerifiedUser.address)).to.equal(0n);
    });
  });

  describe("P2PEscrow", function () {
    const lockAmount = hre.ethers.parseUnits("100", 6); // 100 USDC

    beforeEach(async function () {
      // Approve the Escrow contract to spend Merchant's USDC
      await usdcMock.connect(merchant).approve(await p2pEscrow.getAddress(), lockAmount);
    });

    it("should allow a Merchant to create an order and lock USDC", async function () {
      await expect(p2pEscrow.connect(merchant).createOrder(lockAmount))
        .to.emit(p2pEscrow, "OrderCreated")
        .withArgs(0, merchant.address, lockAmount);

      const order = await p2pEscrow.orders(0);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.amount).to.equal(lockAmount);
      expect(order.status).to.equal(0n); // Open

      // Escrow holds the USDC
      expect(await usdcMock.balanceOf(await p2pEscrow.getAddress())).to.equal(lockAmount);
    });

    it("should prevent non-Merchants from creating an order", async function () {
      await expect(
        p2pEscrow.connect(agent).createOrder(lockAmount)
      ).to.be.revertedWith("Only verified Merchants can create orders");

      await expect(
        p2pEscrow.connect(nonVerifiedUser).createOrder(lockAmount)
      ).to.be.revertedWith("Only verified Merchants can create orders");
    });

    it("should allow an Agent to accept an open order", async function () {
      await p2pEscrow.connect(merchant).createOrder(lockAmount);

      await expect(p2pEscrow.connect(agent).acceptOrder(0))
        .to.emit(p2pEscrow, "OrderAccepted")
        .withArgs(0, agent.address);

      const order = await p2pEscrow.orders(0);
      expect(order.agent).to.equal(agent.address);
      expect(order.status).to.equal(1n); // Locked
    });

    it("should prevent non-Agents from accepting an order", async function () {
      await p2pEscrow.connect(merchant).createOrder(lockAmount);

      await expect(
        p2pEscrow.connect(nonVerifiedUser).acceptOrder(0)
      ).to.be.revertedWith("Only verified Agents can accept orders");
    });

    it("should allow Merchant to release funds to the Agent", async function () {
      await p2pEscrow.connect(merchant).createOrder(lockAmount);
      await p2pEscrow.connect(agent).acceptOrder(0);

      await expect(p2pEscrow.connect(merchant).releaseFunds(0))
        .to.emit(p2pEscrow, "FundsReleased")
        .withArgs(0, merchant.address, agent.address, lockAmount);

      const order = await p2pEscrow.orders(0);
      expect(order.status).to.equal(2n); // Completed

      // Agent gets the USDC
      expect(await usdcMock.balanceOf(agent.address)).to.equal(lockAmount);
      expect(await usdcMock.balanceOf(await p2pEscrow.getAddress())).to.equal(0);
    });

    it("should allow Merchant to cancel an open order", async function () {
      await p2pEscrow.connect(merchant).createOrder(lockAmount);

      await expect(p2pEscrow.connect(merchant).cancelOrder(0))
        .to.emit(p2pEscrow, "OrderCancelled")
        .withArgs(0, merchant.address, lockAmount);

      const order = await p2pEscrow.orders(0);
      expect(order.status).to.equal(3n); // Cancelled

      // Merchant gets USDC back
      expect(await usdcMock.balanceOf(merchant.address)).to.equal(hre.ethers.parseUnits("1000", 6));
    });
  });

  describe("ProductRegistry", function () {
    const price = hre.ethers.parseUnits("50", 6);
    const metadata = "ipfs://QmDummyHash";

    it("should allow a verified Merchant to list a product", async function () {
      await expect(productRegistry.connect(merchant).listProduct(price, metadata))
        .to.emit(productRegistry, "ProductListed")
        .withArgs(0, merchant.address, price, metadata);

      const product = await productRegistry.products(0);
      expect(product.merchant).to.equal(merchant.address);
      expect(product.priceUSDC).to.equal(price);
      expect(product.metadataURI).to.equal(metadata);
      expect(product.isActive).to.be.true;
    });

    it("should prevent non-Merchants (or Agents) from listing products", async function () {
      await expect(
        productRegistry.connect(agent).listProduct(price, metadata)
      ).to.be.revertedWith("Only verified Merchants can list products");

      await expect(
        productRegistry.connect(nonVerifiedUser).listProduct(price, metadata)
      ).to.be.revertedWith("Only verified Merchants can list products");
    });
  });

});