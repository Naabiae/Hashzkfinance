import { expect } from "chai";
import hre from "hardhat";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";

describe("HashBazaar Ecosystem - IdentityRegistry, P2PEscrow, ProductRegistry", function () {
  let verifier, identityRegistry, usdcMock, p2pEscrow, productRegistry;
  let deployer, merchant, agent, nonVerifiedUser;
  let poseidon;

  before(async function () {
    poseidon = await buildPoseidon();
  });

  before(async function () {
    [deployer, merchant, agent, nonVerifiedUser] = await hre.ethers.getSigners();

    // 1. Deploy Verifier
    const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    // 2. Deploy IdentityRegistry
    const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(await verifier.getAddress());

    // 3. Deploy Mock USDC
    const ERC20Mock = await hre.ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    usdcMock = await ERC20Mock.deploy("Mock USDC", "USDC", deployer.address, hre.ethers.parseUnits("100000", 6));

    // Distribute some USDC
    await usdcMock.transfer(merchant.address, hre.ethers.parseUnits("1000", 6));
    await usdcMock.transfer(agent.address, hre.ethers.parseUnits("1000", 6));

    // 4. Deploy P2PEscrow
    const P2PEscrow = await hre.ethers.getContractFactory("P2PEscrow");
    p2pEscrow = await P2PEscrow.deploy(await identityRegistry.getAddress(), await usdcMock.getAddress());

    // 5. Deploy ProductRegistry
    const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
    productRegistry = await ProductRegistry.deploy(await identityRegistry.getAddress());
    await productRegistry.setPaymentRelayer(deployer.address);

    // MINT INITIAL IDENTITIES for Tests
    const mintIdentity = async (user, role, secret, nullifier) => {
      const commitmentHash = poseidon([secret, nullifier, role]);
      const commitment = poseidon.F.toObject(commitmentHash);

      await identityRegistry.connect(deployer).addValidCommitment(commitment);

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

    // Mint Role 1 to Merchant
    await mintIdentity(merchant, 1n, 123456789n, 987654321n); // Merchant is Role 1

    // Mint Role 2 to Agent
    await mintIdentity(agent, 2n, 111111111n, 222222222n);    // Agent is Role 2
  });

  describe("IdentityRegistry", function () {
    it("should assign Role 1 to the Merchant and Role 2 to the Agent", async function () {
      expect(await identityRegistry.getUserRole(merchant.address)).to.equal(1);
      expect(await identityRegistry.getUserRole(agent.address)).to.equal(2);
      expect(await identityRegistry.getUserRole(nonVerifiedUser.address)).to.equal(0);
    });

    it("should prevent a user from minting multiple Identity NFTs", async function () {
      const mintIdentityObj = async (user, role, secret, nullifier) => {
        const commitmentHash = poseidon([secret, nullifier, role]);
        const commitment = poseidon.F.toObject(commitmentHash);

        await identityRegistry.connect(deployer).addValidCommitment(commitment);

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
        const Input = [argv[8], argv[9], argv[10]];

        return identityRegistry.connect(user).verifyAndMint(a, b, c, Input);
      };

      await expect(
        mintIdentityObj(merchant, 1n, 33333n, 44444n)
      ).to.be.revertedWith("User already has an Identity");
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
        .withArgs(0, merchant.address, lockAmount); // ID is 0 because nextOrderId starts at 0

      const order = await p2pEscrow.orders(0);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.amount).to.equal(lockAmount);
      expect(order.status).to.equal(1n); // Open = 1

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
      // Create a fresh order
      await usdcMock.connect(merchant).approve(await p2pEscrow.getAddress(), hre.ethers.parseUnits("100", 6));
      await p2pEscrow.connect(merchant).createOrder(hre.ethers.parseUnits("100", 6));
      const newOrderId = await p2pEscrow.nextOrderId() - 1n;

      await expect(p2pEscrow.connect(agent).acceptOrder(newOrderId))
        .to.emit(p2pEscrow, "OrderAccepted")
        .withArgs(newOrderId, agent.address);

      const order = await p2pEscrow.orders(newOrderId);
      expect(order.agent).to.equal(agent.address);
      expect(order.status).to.equal(2n); // Locked = 2
    });

    it("should prevent non-Agents from accepting an order", async function () {
      await expect(
        p2pEscrow.connect(merchant).acceptOrder(0)
      ).to.be.revertedWith("Only verified Agents can accept orders"); // Order 0 is already locked

      // Let's create a new order to test Agent role enforcement properly
      await usdcMock.connect(merchant).approve(await p2pEscrow.getAddress(), hre.ethers.parseUnits("100", 6));
      await p2pEscrow.connect(merchant).createOrder(hre.ethers.parseUnits("100", 6));
      const newOrderId = await p2pEscrow.nextOrderId() - 1n;

      await expect(
        p2pEscrow.connect(merchant).acceptOrder(newOrderId)
      ).to.be.revertedWith("Only verified Agents can accept orders");

      await expect(
        p2pEscrow.connect(nonVerifiedUser).acceptOrder(newOrderId)
      ).to.be.revertedWith("Only verified Agents can accept orders");
    });

    it("should allow Merchant to release funds to the Agent", async function () {
      // First order was order 1, but we created a new one so let's check its ID
      // wait, the previous test created an order without completing it.
      // Let's explicitly create an order and save its ID
      await p2pEscrow.connect(merchant).createOrder(hre.ethers.parseUnits("100", 6));
      const orderId = await p2pEscrow.nextOrderId() - 1n;
      
      await p2pEscrow.connect(agent).acceptOrder(orderId);

      const agentBeforeBalance = await usdcMock.balanceOf(agent.address);
      await expect(p2pEscrow.connect(merchant).releaseFunds(orderId))
        .to.emit(p2pEscrow, "OrderCompleted")
        .withArgs(orderId, merchant.address, agent.address, hre.ethers.parseUnits("100", 6));

      const order = await p2pEscrow.orders(orderId);
      expect(order.status).to.equal(3n); // Completed = 3

      // Agent gets the USDC
      const expectedBalance = agentBeforeBalance + hre.ethers.parseUnits("100", 6);
      expect(await usdcMock.balanceOf(agent.address)).to.equal(expectedBalance);
    });

    it("should allow Merchant to cancel an open order", async function () {
      const beforeBalance = await usdcMock.balanceOf(merchant.address);
      await usdcMock.connect(merchant).approve(await p2pEscrow.getAddress(), hre.ethers.parseUnits("50", 6));
      await p2pEscrow.connect(merchant).createOrder(hre.ethers.parseUnits("50", 6));
      const orderId = await p2pEscrow.nextOrderId() - 1n;

      await p2pEscrow.connect(merchant).cancelOrder(orderId);

      const order = await p2pEscrow.orders(orderId);
      expect(order.status).to.equal(4n); // Cancelled = 4
      
      // The balance goes down by 50 when creating, and up by 50 when cancelling,
      // so it should be EXACTLY the same as `beforeBalance`.
      const expectedBalance = beforeBalance;
      expect(await usdcMock.balanceOf(merchant.address)).to.equal(expectedBalance);
    });

    it("should allow an admin to resolve a disputed order", async function () {
      // Setup a new locked order for dispute
      await usdcMock.connect(merchant).approve(await p2pEscrow.getAddress(), hre.ethers.parseUnits("50", 6));
      await p2pEscrow.connect(merchant).createOrder(hre.ethers.parseUnits("50", 6));
      const orderId = await p2pEscrow.nextOrderId() - 1n;
      
      await p2pEscrow.connect(agent).acceptOrder(orderId);
      
      const beforeBal = await usdcMock.balanceOf(agent.address);
      
      await expect(p2pEscrow.connect(deployer).resolveDispute(orderId, agent.address))
        .to.emit(p2pEscrow, "OrderDisputed")
        .withArgs(orderId, deployer.address, agent.address, hre.ethers.parseUnits("50", 6));

      const order = await p2pEscrow.orders(orderId);
      expect(order.status).to.equal(5n); // Disputed = 5
      expect(await usdcMock.balanceOf(agent.address)).to.equal(beforeBal + hre.ethers.parseUnits("50", 6));
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
      expect(product.isUnlimitedStock).to.be.true;
      expect(product.stock).to.equal(0n);
      expect(product.sold).to.equal(0n);
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

    it("should record a successful purchase with idempotency and stock enforcement", async function () {
      const stock = 2n;
      await productRegistry.connect(merchant).listProductWithStock(price, metadata, stock);
      await productRegistry.connect(deployer).setPaymentRelayer(deployer.address);

      const paymentRef1 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("pay-1"));
      await expect(productRegistry.connect(deployer).recordPurchase(1, agent.address, 1, paymentRef1))
        .to.emit(productRegistry, "PurchaseRecorded")
        .withArgs(1, paymentRef1, agent.address, 1);

      let product = await productRegistry.products(1);
      expect(product.stock).to.equal(stock);
      expect(product.sold).to.equal(1n);

      await expect(
        productRegistry.connect(deployer).recordPurchase(1, agent.address, 1, paymentRef1)
      ).to.be.revertedWith("Payment already recorded");

      const paymentRef2 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("pay-2"));
      await productRegistry.connect(deployer).recordPurchase(1, agent.address, 1, paymentRef2);

      product = await productRegistry.products(1);
      expect(product.sold).to.equal(2n);

      const paymentRef3 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("pay-3"));
      await expect(
        productRegistry.connect(deployer).recordPurchase(1, agent.address, 1, paymentRef3)
      ).to.be.revertedWith("Out of stock");
    });
  });

});
