import fs from "fs";
import hre from "hardhat";
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";

function parseDeployed(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const get = (key) => {
    const m = raw.match(new RegExp(`${key}="(0x[a-fA-F0-9]{40})"`));
    return m ? m[1] : "";
  };
  const getTx = (key) => {
    const m = raw.match(new RegExp(`${key}="(0x[a-fA-F0-9]{64})"`));
    return m ? m[1] : "";
  };
  return {
    verifier: get("VERIFIER_ADDRESS"),
    identityRegistry: get("IDENTITY_REGISTRY_ADDRESS"),
    usdc: get("USDC_ADDRESS"),
    escrow: get("P2P_ESCROW_ADDRESS"),
    productRegistry: get("PRODUCT_REGISTRY_ADDRESS"),
    tx: {
      verifierDeploy: getTx("VERIFIER_DEPLOY_TX"),
      identityDeploy: getTx("IDENTITY_REGISTRY_DEPLOY_TX"),
      usdcDeploy: getTx("USDC_DEPLOY_TX"),
      escrowDeploy: getTx("P2P_ESCROW_DEPLOY_TX"),
      productRegistryDeploy: getTx("PRODUCT_REGISTRY_DEPLOY_TX"),
      setRelayer: getTx("SET_PAYMENT_RELAYER_TX"),
    },
  };
}

function formatMdSection(title, items) {
  const lines = [`## ${title}`];
  for (const [k, v] of Object.entries(items)) {
    lines.push(`- ${k}: ${v}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const deployed = parseDeployed("deployed-addresses.txt");
  const [deployer] = await hre.ethers.getSigners();

  if (!deployed.identityRegistry || !deployed.escrow || !deployed.productRegistry || !deployed.usdc) {
    throw new Error("Missing deployed addresses. Run scripts/deploy.js first.");
  }

  const provider = hre.ethers.provider;

  const merchant = hre.ethers.Wallet.createRandom().connect(provider);
  const agent = hre.ethers.Wallet.createRandom().connect(provider);
  const buyer = hre.ethers.Wallet.createRandom().connect(provider);

  const fundTxs = [];
  fundTxs.push((await deployer.sendTransaction({ to: merchant.address, value: hre.ethers.parseEther("0.01") })).hash);
  fundTxs.push((await deployer.sendTransaction({ to: agent.address, value: hre.ethers.parseEther("0.01") })).hash);
  fundTxs.push((await deployer.sendTransaction({ to: buyer.address, value: hre.ethers.parseEther("0.005") })).hash);

  const identityAbi = [
    "function addValidCommitment(uint256 commitment) external",
    "function verifyAndMint(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[3] input) external",
    "function getUserRole(address user) external view returns (uint256)",
  ];
  const productAbi = [
    "function setPaymentRelayer(address relayer) external",
    "function listProductWithStock(uint256 priceUSDC, string metadataURI, uint256 stock) external returns (uint256)",
    "function recordPurchase(uint256 productId, address buyer, uint256 quantity, bytes32 paymentRef) external",
    "function products(uint256) external view returns (uint256 id, address merchant, uint256 priceUSDC, string metadataURI, bool isActive, bool isUnlimitedStock, uint256 stock, uint256 sold)",
  ];
  const escrowAbi = [
    "function createOrder(uint256 amount) external returns (uint256)",
    "function acceptOrder(uint256 orderId) external",
    "function releaseFunds(uint256 orderId) external",
    "function orders(uint256) external view returns (uint256 id, address merchant, address agent, uint256 amount, uint8 status)",
  ];
  const erc20Abi = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
  ];

  const identity = new hre.ethers.Contract(deployed.identityRegistry, identityAbi, deployer);
  const product = new hre.ethers.Contract(deployed.productRegistry, productAbi, deployer);
  const escrow = new hre.ethers.Contract(deployed.escrow, escrowAbi, deployer);
  const usdc = new hre.ethers.Contract(deployed.usdc, erc20Abi, deployer);

  const poseidon = await buildPoseidon();

  async function mintIdentity(userSigner, role, secret, nullifier) {
    const commitmentHash = poseidon([secret, nullifier, role]);
    const commitment = poseidon.F.toObject(commitmentHash);

    const addTx = await identity.addValidCommitment(commitment);
    await addTx.wait();

    const { proof, publicSignals } = await groth16.fullProve(
      { secret: secret, nullifier: nullifier, tier: role, commitment: commitment },
      "circuits/kyc_js/kyc.wasm",
      "kyc_final.zkey"
    );

    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const argv = calldata
      .replace(/["[\]\s]/g, "")
      .split(",")
      .map((x) => BigInt(x).toString());

    const a = [argv[0], argv[1]];
    const b = [
      [argv[2], argv[3]],
      [argv[4], argv[5]],
    ];
    const c = [argv[6], argv[7]];
    const Input = [argv[8], argv[9], argv[10]];

    const identityAsUser = identity.connect(userSigner);
    const tx = await identityAsUser.verifyAndMint(a, b, c, Input);
    const receipt = await tx.wait();
    return receipt?.hash || tx.hash;
  }

  const txs = {
    fundMerchant: fundTxs[0],
    fundAgent: fundTxs[1],
    fundBuyer: fundTxs[2],
    mintMerchant: "",
    mintAgent: "",
    listProduct: "",
    recordPurchase: "",
    merchantTransferUsdc: "",
    approveEscrow: "",
    createOrder: "",
    acceptOrder: "",
    releaseFunds: "",
  };

  txs.mintMerchant = await mintIdentity(merchant, 1n, 123456789n, 987654321n);
  txs.mintAgent = await mintIdentity(agent, 2n, 111111111n, 222222222n);

  const merchantRole = await identity.getUserRole(merchant.address);
  const agentRole = await identity.getUserRole(agent.address);
  if (merchantRole !== 1n || agentRole !== 2n) {
    throw new Error(`Role check failed: merchant=${merchantRole} agent=${agentRole}`);
  }

  const meta = JSON.stringify({
    name: "HashBazaar Demo Item",
    description: "Demo listing for judges: on-chain product + HashKey payment + relayer recordPurchase.",
    image: "ipfs://demo",
  });
  const price = hre.ethers.parseUnits("10", 6);
  const stock = 2;
  const listTx = await product.connect(merchant).listProductWithStock(price, meta, stock);
  const listReceipt = await listTx.wait();
  txs.listProduct = listReceipt?.hash || listTx.hash;

  const paymentRef = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`pay-${Date.now()}`));
  const recordTx = await product.recordPurchase(0, buyer.address, 1, paymentRef);
  const recordReceipt = await recordTx.wait();
  txs.recordPurchase = recordReceipt?.hash || recordTx.hash;

  const merchantUsdc = hre.ethers.parseUnits("500", 6);
  const transferTx = await usdc.transfer(merchant.address, merchantUsdc);
  const transferReceipt = await transferTx.wait();
  txs.merchantTransferUsdc = transferReceipt?.hash || transferTx.hash;

  const approveTx = await usdc.connect(merchant).approve(deployed.escrow, hre.ethers.parseUnits("100", 6));
  const approveReceipt = await approveTx.wait();
  txs.approveEscrow = approveReceipt?.hash || approveTx.hash;

  const createTx = await escrow.connect(merchant).createOrder(hre.ethers.parseUnits("100", 6));
  const createReceipt = await createTx.wait();
  txs.createOrder = createReceipt?.hash || createTx.hash;

  const orderId = 0;
  const acceptTx = await escrow.connect(agent).acceptOrder(orderId);
  const acceptReceipt = await acceptTx.wait();
  txs.acceptOrder = acceptReceipt?.hash || acceptTx.hash;

  const releaseTx = await escrow.connect(merchant).releaseFunds(orderId);
  const releaseReceipt = await releaseTx.wait();
  txs.releaseFunds = releaseReceipt?.hash || releaseTx.hash;

  const order = await escrow.orders(orderId);
  if (Number(order.status) !== 3) {
    throw new Error(`Escrow order not completed. status=${order.status}`);
  }

  const md = [
    "# HashBazaar Testnet Transactions",
    "",
    formatMdSection("Deployer", {
      Address: deployer.address,
      Network: hre.network.name,
      ChainId: String(hre.network.config.chainId ?? ""),
    }),
    formatMdSection("Deployed Contracts", {
      Groth16Verifier: deployed.verifier,
      IdentityRegistry: deployed.identityRegistry,
      MockUSDC: deployed.usdc,
      P2PEscrow: deployed.escrow,
      ProductRegistry: deployed.productRegistry,
    }),
    formatMdSection("Deployment TXs", {
      Groth16Verifier: deployed.tx.verifierDeploy || "n/a",
      IdentityRegistry: deployed.tx.identityDeploy || "n/a",
      MockUSDC: deployed.tx.usdcDeploy || "n/a",
      P2PEscrow: deployed.tx.escrowDeploy || "n/a",
      ProductRegistry: deployed.tx.productRegistryDeploy || "n/a",
      SetPaymentRelayer: deployed.tx.setRelayer || "n/a",
    }),
    formatMdSection("Test Flow Wallets", {
      Merchant: merchant.address,
      Agent: agent.address,
      Buyer: buyer.address,
    }),
    formatMdSection("Test Flow TXs", {
      FundMerchant: txs.fundMerchant,
      FundAgent: txs.fundAgent,
      FundBuyer: txs.fundBuyer,
      MintMerchantIdentity: txs.mintMerchant,
      MintAgentIdentity: txs.mintAgent,
      ListProduct: txs.listProduct,
      RecordPurchase: txs.recordPurchase,
      TransferUSDCToMerchant: txs.merchantTransferUsdc,
      ApproveEscrow: txs.approveEscrow,
      CreateEscrowOrder: txs.createOrder,
      AcceptEscrowOrder: txs.acceptOrder,
      ReleaseFunds: txs.releaseFunds,
    }),
  ].join("\n");

  fs.writeFileSync("transactions.md", md);
  console.log("✅ Wrote transactions.md");
  console.log("✅ Flow OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
