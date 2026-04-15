import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Starting deployment on network:", hre.network.name);
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy the Groth16 Verifier
  console.log("\nDeploying Groth16 Verifier...");
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  const verifierTx = verifier.deploymentTransaction()?.hash;
  console.log("✅ Verifier deployed to:", verifierAddress);
  if (verifierTx) console.log("   tx:", verifierTx);

  // 2. Deploy IdentityRegistry
  console.log("\nDeploying IdentityRegistry...");
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(verifierAddress);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  const identityRegistryTx = identityRegistry.deploymentTransaction()?.hash;
  console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress);
  if (identityRegistryTx) console.log("   tx:", identityRegistryTx);

  // 3. Deploy Mock USDC (For Testnet only)
  console.log("\nDeploying Mock USDC...");
  const ERC20Mock = await hre.ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
  // Mint 100,000 mock USDC to the deployer
  const usdcMock = await ERC20Mock.deploy("Mock USDC", "USDC", deployer.address, hre.ethers.parseUnits("100000", 6));
  await usdcMock.waitForDeployment();
  const usdcAddress = await usdcMock.getAddress();
  const usdcTx = usdcMock.deploymentTransaction()?.hash;
  console.log("✅ Mock USDC deployed to:", usdcAddress);
  if (usdcTx) console.log("   tx:", usdcTx);

  // 4. Deploy P2PEscrow
  console.log("\nDeploying P2PEscrow...");
  const P2PEscrow = await hre.ethers.getContractFactory("P2PEscrow");
  const p2pEscrow = await P2PEscrow.deploy(identityRegistryAddress, usdcAddress);
  await p2pEscrow.waitForDeployment();
  const p2pEscrowAddress = await p2pEscrow.getAddress();
  const p2pEscrowTx = p2pEscrow.deploymentTransaction()?.hash;
  console.log("✅ P2PEscrow deployed to:", p2pEscrowAddress);
  if (p2pEscrowTx) console.log("   tx:", p2pEscrowTx);

  // 5. Deploy ProductRegistry
  console.log("\nDeploying ProductRegistry...");
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(identityRegistryAddress);
  await productRegistry.waitForDeployment();
  const productRegistryAddress = await productRegistry.getAddress();
  const productRegistryTx = productRegistry.deploymentTransaction()?.hash;
  console.log("✅ ProductRegistry deployed to:", productRegistryAddress);
  if (productRegistryTx) console.log("   tx:", productRegistryTx);

  console.log("\nConfiguring ProductRegistry payment relayer...");
  const relayerTx = await productRegistry.setPaymentRelayer(deployer.address);
  const relayerReceipt = await relayerTx.wait();
  console.log("✅ paymentRelayer set to:", deployer.address);
  console.log("   tx:", relayerReceipt?.hash || relayerTx.hash);

  console.log("\n🎉 All contracts deployed successfully!");
  console.log("--------------------------------------------------");
  console.log(`VERIFIER_ADDRESS="${verifierAddress}"`);
  console.log(`IDENTITY_REGISTRY_ADDRESS="${identityRegistryAddress}"`);
  console.log(`USDC_ADDRESS="${usdcAddress}"`);
  console.log(`P2P_ESCROW_ADDRESS="${p2pEscrowAddress}"`);
  console.log(`PRODUCT_REGISTRY_ADDRESS="${productRegistryAddress}"`);
  console.log("--------------------------------------------------");

  const out = [
    `# Deployed on HashKey Testnet (Chain ID ${hre.network.config.chainId ?? "unknown"})`,
    `# Network: ${hre.network.name}`,
    `# Deployer Wallet: ${deployer.address}`,
    "",
    `VERIFIER_ADDRESS="${verifierAddress}"`,
    `IDENTITY_REGISTRY_ADDRESS="${identityRegistryAddress}"`,
    `USDC_ADDRESS="${usdcAddress}"`,
    `P2P_ESCROW_ADDRESS="${p2pEscrowAddress}"`,
    `PRODUCT_REGISTRY_ADDRESS="${productRegistryAddress}"`,
    "",
    "# Deployment TX Hashes",
    `VERIFIER_DEPLOY_TX="${verifierTx ?? ""}"`,
    `IDENTITY_REGISTRY_DEPLOY_TX="${identityRegistryTx ?? ""}"`,
    `USDC_DEPLOY_TX="${usdcTx ?? ""}"`,
    `P2P_ESCROW_DEPLOY_TX="${p2pEscrowTx ?? ""}"`,
    `PRODUCT_REGISTRY_DEPLOY_TX="${productRegistryTx ?? ""}"`,
    `SET_PAYMENT_RELAYER_TX="${relayerReceipt?.hash || relayerTx.hash}"`,
    "",
  ].join("\n");

  fs.writeFileSync("deployed-addresses.txt", out);
  console.log("📝 Wrote deployed-addresses.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
