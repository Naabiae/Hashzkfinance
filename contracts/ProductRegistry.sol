// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

// Interface to interact with our Identity Registry
interface IIdentityRegistry {
    function getUserRole(address user) external view returns (uint256);
}

/**
 * @title ProductRegistry
 * @dev Registry for merchants to list their products on-chain.
 * Only verified Merchants (Role 1 or 3) can list products.
 */
contract ProductRegistry is Ownable {
    IIdentityRegistry public immutable identityRegistry;

    struct Product {
        uint256 id;
        address merchant;
        uint256 priceUSDC; // Price in USDC with 6 decimals
        string metadataURI; // IPFS URI containing name, description, image, etc.
        uint256 stock;
        uint256 sold;
        bool isActive;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;
    address public paymentRelayer;
    mapping(bytes32 => bool) public usedPaymentRef;

    event ProductListed(uint256 indexed productId, address indexed merchant, uint256 priceUSDC, string metadataURI);
    event ProductUpdated(uint256 indexed productId, uint256 newPrice, string newMetadata, bool isActive);
    event PaymentRelayerUpdated(address indexed relayer);
    event PurchaseRecorded(uint256 indexed productId, bytes32 indexed paymentRef, address indexed buyer, uint256 quantity);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function setPaymentRelayer(address relayer) external onlyOwner {
        paymentRelayer = relayer;
        emit PaymentRelayerUpdated(relayer);
    }

    /**
     * @dev Lists a new product. Only verified Merchants can call this.
     * @param priceUSDC The price of the product in USDC (6 decimals).
     * @param metadataURI The IPFS URI for product metadata.
     */
    function listProduct(uint256 priceUSDC, string calldata metadataURI) external returns (uint256) {
        return _listProduct(priceUSDC, metadataURI, 0);
    }

    function listProductWithStock(uint256 priceUSDC, string calldata metadataURI, uint256 stock) external returns (uint256) {
        return _listProduct(priceUSDC, metadataURI, stock);
    }

    function _listProduct(uint256 priceUSDC, string calldata metadataURI, uint256 stock) internal returns (uint256) {
        uint256 role = identityRegistry.getUserRole(msg.sender);
        require(role == 1 || role == 3, "Only verified Merchants can list products");
        require(priceUSDC > 0, "Price must be greater than zero");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");

        uint256 productId = nextProductId++;
        
        products[productId] = Product({
            id: productId,
            merchant: msg.sender,
            priceUSDC: priceUSDC,
            metadataURI: metadataURI,
            stock: stock,
            sold: 0,
            isActive: true
        });

        emit ProductListed(productId, msg.sender, priceUSDC, metadataURI);
        return productId;
    }

    /**
     * @dev Updates an existing product. Only the owning merchant can call this.
     */
    function updateProduct(uint256 productId, uint256 newPrice, string calldata newMetadata, bool isActive) external {
        Product storage product = products[productId];
        require(product.merchant == msg.sender, "Only the owning merchant can update this product");
        require(newPrice > 0, "Price must be greater than zero");

        product.priceUSDC = newPrice;
        product.metadataURI = newMetadata;
        product.isActive = isActive;

        emit ProductUpdated(productId, newPrice, newMetadata, isActive);
    }

    function recordPurchase(uint256 productId, address buyer, uint256 quantity, bytes32 paymentRef) external {
        require(msg.sender == owner() || msg.sender == paymentRelayer, "Not authorized");
        require(!usedPaymentRef[paymentRef], "Payment already recorded");
        require(quantity > 0, "Quantity must be greater than zero");

        Product storage product = products[productId];
        require(product.isActive, "Product inactive");

        if (product.stock != 0) {
            require(product.sold + quantity <= product.stock, "Out of stock");
        }

        usedPaymentRef[paymentRef] = true;
        product.sold += quantity;

        emit PurchaseRecorded(productId, paymentRef, buyer, quantity);
    }
}
