import prisma from "./db/prisma.js";

async function main() {
  const sender = await prisma.sender.create({
    data: {
      userId: "a45c4e05-8aaf-4e96-997a-64958ca9cb66",
      email: "turner.torphy@ethereal.email",
      etherealUser: "turner.torphy@ethereal.email",
      etherealPassword: process.env.SMTP_PASSWORD!,
    },
  });

  console.log("Created sender:");
  console.log(sender);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });