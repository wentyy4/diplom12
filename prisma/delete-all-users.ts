/**
 * Script to delete all registered users and all related data.
 * Run: npx tsx prisma/delete-all-users.ts
 *
 * Order: Task → ProjectMember → Project → User
 * (SQLite FK: Project.managerId → User, Task.assigneeId → User, etc.)
 */

import { PrismaClient } from ".prisma/client";

const prisma = new PrismaClient();

async function main() {
  const taskCount = await prisma.task.deleteMany({});
  const memberCount = await prisma.projectMember.deleteMany({});
  const firmMemberCount = await prisma.firmMember.deleteMany({});
  const invitationCount = await prisma.invitation.deleteMany({});
  const projectCount = await prisma.project.deleteMany({});
  const userCount = await prisma.user.deleteMany({});
  const firmCount = await prisma.firm.deleteMany({});

  console.log("Deleted:");
  console.log("  Tasks:", taskCount.count);
  console.log("  Project members:", memberCount.count);
  console.log("  Firm members:", firmMemberCount.count);
  console.log("  Invitations:", invitationCount.count);
  console.log("  Projects:", projectCount.count);
  console.log("  Users:", userCount.count);
  console.log("  Firms:", firmCount.count);
  console.log("\nAll users and related data have been removed.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
