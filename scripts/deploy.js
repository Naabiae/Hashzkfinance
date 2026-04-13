import hre from "hardhat";

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
  console.log("✅ Verifier deployed to:", verifierAddress);

  // 2. Deploy IdentityRegistry
  console.log("\nDeploying IdentityRegistry...");
  const IdentityRegistry = await hre.ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy(verifierAddress);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress);

  // 3. Deploy Mock USDC (For Testnet only)
  console.log("\nDeploying Mock USDC...");
  const ERC20Mock = await hre.ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
  // Mint 100,000 mock USDC to the deployer
  const usdcMock = await ERC20Mock.deploy("Mock USDC", "USDC", deployer.address, hre.ethers.parseUnits("100000", 6));
  await usdcMock.waitForDeployment();
  const usdcAddress = await usdcMock.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // 4. Deploy P2PEscrow
  console.log("\nDeploying P2PEscrow...");
  const P2PEscrow = await hre.ethers.getContractFactory("P2PEscrow");
  const p2pEscrow = await P2PEscrow.deploy(identityRegistryAddress, usdcAddress);
  await p2pEscrow.waitForDeployment();
  const p2pEscrowAddress = await p2pEscrow.getAddress();
  console.log("✅ P2PEscrow deployed to:", p2pEscrowAddress);

  // 5. Deploy ProductRegistry
  console.log("\nDeploying ProductRegistry...");
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy(identityRegistryAddress);
  await productRegistry.waitForDeployment();
  const productRegistryAddress = await productRegistry.getAddress();
  console.log("✅ ProductRegistry deployed to:", productRegistryAddress);

  console.log("\n🎉 All contracts deployed successfully!");
  console.log("--------------------------------------------------");
  console.log(`VERIFIER_ADDRESS="${verifierAddress}"`);
  console.log(`IDENTITY_REGISTRY_ADDRESS="${identityRegistryAddress}"`);
  console.log(`USDC_ADDRESS="${usdcAddress}"`);
  console.log(`P2P_ESCROW_ADDRESS="${p2pEscrowAddress}"`);
  console.log(`PRODUCT_REGISTRY_ADDRESS="${productRegistryAddress}"`);
  console.log("--------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });