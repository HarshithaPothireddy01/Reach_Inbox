import prisma from "./db/prisma.js";

async function main() {
  const user = await prisma.user.create({
    data: {
      googleId: "test-google-id-2",
      name: "Test User",
      email: "test@example.com",
    },
  });

  console.log("Created user:");
  console.log(user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });