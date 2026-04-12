pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

// A simple ZKID circuit for KYC verification.
// It proves the user knows the (secret, nullifier, tier) that generates the public 'commitment',
// without revealing the secret itself. It also outputs a 'nullifierHash' to prevent double-use
// and exposes the 'tier' as a public output so the smart contract knows the user's KYC tier.
template KYCVerifier() {
    // Public input
    signal input commitment; // The public commitment signed/issued by HashKey KYC infra

    // Private inputs
    signal input secret;     // The user's secret
    signal input nullifier;  // The user's nullifier (for uniqueness)
    signal input tier;       // The user's KYC tier (e.g., 1 for Basic, 2 for Advanced)

    // Outputs
    signal output nullifierHash; // Published on-chain to prevent using the same credential twice
    signal output userTier;      // The verified tier, exposed to the smart contract

    // 1. Verify that the commitment matches hash(secret, nullifier, tier)
    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;
    commitmentHasher.inputs[2] <== tier;
    
    commitment === commitmentHasher.out;

    // 2. Generate nullifierHash = hash(nullifier)
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    
    nullifierHash <== nullifierHasher.out;

    // 3. Expose the tier publicly
    userTier <== tier;
}

component main {public [commitment]} = KYCVerifier();