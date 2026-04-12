// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVerifier.sol";

/**
 * @title IdentityRegistry
 * @dev A ZKID KYC registry for the HashBazaar marketplace.
 * Users submit a Groth16 proof showing they know the secret to a valid KYC commitment.
 * Once verified, they are minted a non-transferable (soulbound) Identity NFT with a specific role.
 * Role 1: Merchant (Can create sell orders)
 * Role 2: P2P Agent (Can accept sell orders)
 * The admin can revoke the NFT if the user violates rules.
 */
contract IdentityRegistry is ERC721, Ownable {
    IVerifier public immutable verifier;

    mapping(uint256 => bool) public isNullifierUsed;
    mapping(uint256 => bool) public isValidCommitment;
    
    // Mapping from tokenId to the user's KYC role (1 = Merchant, 2 = Agent)
    mapping(uint256 => uint256) public userRole;

    uint256 private _nextTokenId;

    event IdentityVerified(address indexed user, uint256 indexed tokenId, uint256 nullifierHash, uint256 role);
    event CommitmentAdded(uint256 indexed commitment);
    event IdentityRevoked(address indexed user, uint256 indexed tokenId);

    constructor(address _verifier) ERC721("HashKey ZK Identity", "HKZKID") Ownable(msg.sender) {
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
     * @dev Submit a ZK proof to verify KYC and mint an Identity NFT with a specific role.
     * @param input Public inputs [nullifierHash, userRole, commitment]
     */
    function verifyAndMint(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external {
        // In circom:
        // input[0] is nullifierHash
        // input[1] is userRole (was tier)
        // input[2] is commitment (the public input)
        uint256 nullifierHash = input[0];
        uint256 role = input[1];
        uint256 commitment = input[2];

        require(isValidCommitment[commitment], "Invalid or unknown KYC commitment");
        require(!isNullifierUsed[nullifierHash], "KYC credential already used");
        
        bool isValidProof = verifier.verifyProof(a, b, c, input);
        require(isValidProof, "Invalid ZK proof");

        isNullifierUsed[nullifierHash] = true;

        uint256 tokenId = _nextTokenId++;
        userRole[tokenId] = role;
        _mint(msg.sender, tokenId);

        emit IdentityVerified(msg.sender, tokenId, nullifierHash, role);
    }

    /**
     * @dev Revoke a user's NFT if they violate marketplace rules.
     */
    function revokeIdentity(uint256 tokenId) external onlyOwner {
        address user = ownerOf(tokenId);
        _burn(tokenId);
        userRole[tokenId] = 0; // Reset role
        emit IdentityRevoked(user, tokenId);
    }

    /**
     * @dev Returns the role of a given user. Returns 0 if not verified.
     */
    function getUserRole(address user) external view returns (uint256) {
        if (balanceOf(user) == 0) return 0;
        
        for (uint256 i = 0; i < _nextTokenId; i++) {
            try this.ownerOf(i) returns (address owner) {
                if (owner == user) {
                    return userRole[i];
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