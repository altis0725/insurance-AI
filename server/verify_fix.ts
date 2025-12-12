
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

async function main() {
    console.log("Cookie Secret:", ENV.cookieSecret);
    try {
        const token = await sdk.createSessionToken("test-user-id", { name: "Test User" });
        console.log("Successfully created session token:", token);
    } catch (error) {
        console.error("Failed to create session token:", error);
        process.exit(1);
    }
}

main();
