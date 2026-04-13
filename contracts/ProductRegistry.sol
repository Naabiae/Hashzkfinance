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
        bool isActive;
    }

    mapping(uint256 => Product) public products;
    uint256 public nextProductId;

    event ProductListed(uint256 indexed productId, address indexed merchant, uint256 priceUSDC, string metadataURI);
    event ProductUpdated(uint256 indexed productId, uint256 newPrice, string newMetadata, bool isActive);

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    /**
     * @dev Lists a new product. Only verified Merchants can call this.
     * @param priceUSDC The price of the product in USDC (6 decimals).
     * @param metadataURI The IPFS URI for product metadata.
     */
    function listProduct(uint256 priceUSDC, string calldata metadataURI) external returns (uint256) {
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
}