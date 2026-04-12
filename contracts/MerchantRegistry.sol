// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVerifier.sol";

/**
 * @title MerchantRegistry
 * @dev A ZKID KYC registry for the HashBazaar marketplace.
 * Users submit a Groth16 proof showing they know the secret to a valid KYC commitment.
 * Once verified, they are minted a non-transferable (soulbound) Merchant NFT with a specific tier.
 * The admin can revoke the NFT if the merchant violates rules.
 */
contract MerchantRegistry is ERC721, Ownable {
    IVerifier public immutable verifier;

    mapping(uint256 => bool) public isNullifierUsed;
    mapping(uint256 => bool) public isValidCommitment;
    
    // Mapping from tokenId to the merchant's KYC tier
    mapping(uint256 => uint256) public merchantTier;

    uint256 private _nextTokenId;

    event MerchantVerified(address indexed merchant, uint256 indexed tokenId, uint256 nullifierHash, uint256 tier);
    event CommitmentAdded(uint256 indexed commitment);
    event MerchantRevoked(address indexed merchant, uint256 indexed tokenId);

    constructor(address _verifier) ERC721("HashKey Merchant ZKID", "HMZKID") Ownable(msg.sender) {
        verifier = IVerifier(_verifier);
    }

    /**
     * @dev Add valid KYC commitments issued by HashKey's KYC infrastructure.
     */
    function addValidCommitment(uint256 commitment) external onlyOwner {
        isValidCommitment[commitment] = true;
        emit CommitmentAdded(commitment);
    }

    /**
     * @dev Submit a ZK proof to verify KYC and mint a Merchant NFT with a specific tier.
     * @param input Public inputs [nullifierHash, userTier, commitment]
     */
    function verifyAndMint(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external {
        // In circom:
        // input[0] is nullifierHash
        // input[1] is userTier
        // input[2] is commitment (the public input)
        uint256 nullifierHash = input[0];
        uint256 tier = input[1];
        uint256 commitment = input[2];

        require(isValidCommitment[commitment], "Invalid or unknown KYC commitment");
        require(!isNullifierUsed[nullifierHash], "KYC credential already used");
        
        bool isValidProof = verifier.verifyProof(a, b, c, input);
        require(isValidProof, "Invalid ZK proof");

        isNullifierUsed[nullifierHash] = true;

        uint256 tokenId = _nextTokenId++;
        merchantTier[tokenId] = tier;
        _mint(msg.sender, tokenId);

        emit MerchantVerified(msg.sender, tokenId, nullifierHash, tier);
    }

    /**
     * @dev Revoke a merchant's NFT if they violate marketplace rules.
     */
    function revokeMerchant(uint256 tokenId) external onlyOwner {
        address merchant = ownerOf(tokenId);
        _burn(tokenId);
        merchantTier[tokenId] = 0; // Reset tier
        emit MerchantRevoked(merchant, tokenId);
    }

    /**
     * @dev Returns the tier of a given merchant. Returns 0 if not verified.
     */
    function getMerchantTier(address merchant) external view returns (uint256) {
        // Since NFTs are soulbound, we can just iterate or assume 1 token per merchant.
        // For simplicity in this hackathon scope, we'll check if they have a balance
        // and find their token. (In production, use ERC721Enumerable or a mapping).
        if (balanceOf(merchant) == 0) return 0;
        
        // This is a naive way to find the token for a user if they only ever get one
        // Note: For hackathon scope, we assume `_nextTokenId` is small enough.
        for (uint256 i = 0; i < _nextTokenId; i++) {
            try this.ownerOf(i) returns (address owner) {
                if (owner == merchant) {
                    return merchantTier[i];
                }
            } catch {
                continue;
            }
        }
        return 0;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound token: transfer not allowed");
        return super._update(to, tokenId, auth);
    }
}