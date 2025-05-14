const anchor = require('@coral-xyz/anchor');

async function setup() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
}

setup().catch(err => {
    console.error("Setup failed:", err);
});