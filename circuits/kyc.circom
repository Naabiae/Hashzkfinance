pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

// A simple ZKID circuit for KYC verification.
// It proves the user knows the (secret, nullifier) that generates the public 'commitment',
// without revealing the secret itself. It also outputs a 'nullifierHash' to prevent double-use.
template KYCVerifier() {
    // Public input
    signal input commitment; // The public commitment signed/issued by HashKey KYC infra

    // Private inputs
    signal input secret;     // The user's secret
    signal input nullifier;  // The user's nullifier (for uniqueness)

    // Output
    signal output nullifierHash; // Published on-chain to prevent using the same credential twice

    // 1. Verify that the commitment matches hash(secret, nullifier)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;
    
    commitment === commitmentHasher.out;

    // 2. Generate nullifierHash = hash(nullifier)
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    
    nullifierHash <== nullifierHasher.out;
}

component main {public [commitment]} = KYCVerifier();