import "dotenv/config";

import { db } from "../src/server/db";

async function main() {
  const count = await db.organization.count();
  if (count > 0) {
    console.log("Organizations already seeded, skipping.");
    return;
  }
  await db.organization.createMany({
    data: [
      { name: "CSA Club 1" },
      { name: "CSA Club 2" },
      { name: "CSA Club 3" },
    ],
  });
  console.log("Seeded organizations.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
