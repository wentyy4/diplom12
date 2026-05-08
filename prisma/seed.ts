import { PrismaClient } from ".prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const memberPassword = await bcrypt.hash("member123", 10);
  const firm = await prisma.firm.upsert({
    where: { id: "demo-firm" },
    update: {},
    create: {
      id: "demo-firm",
      name: "Demo IT Firm",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { firmId: firm.id },
    create: {
      name: "Admin User",
      email: "admin@example.com",
      password: adminPassword,
      role: "ADMIN",
      firmId: firm.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: { firmId: firm.id },
    create: {
      name: "Project Manager",
      email: "manager@example.com",
      password: managerPassword,
      role: "MANAGER",
      firmId: firm.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { firmId: firm.id },
    create: {
      name: "Team Member",
      email: "member@example.com",
      password: memberPassword,
      role: "MEMBER",
      firmId: firm.id,
    },
  });

  const existingProject = await prisma.project.findFirst({
    where: { name: "Sample IT Project", firmId: firm.id },
  });
  await prisma.firmMember.upsert({
    where: { firmId_userId: { firmId: firm.id, userId: admin.id } },
    update: { role: "ADMIN" },
    create: { firmId: firm.id, userId: admin.id, role: "ADMIN" },
  });
  await prisma.firmMember.upsert({
    where: { firmId_userId: { firmId: firm.id, userId: manager.id } },
    update: { role: "MANAGER" },
    create: { firmId: firm.id, userId: manager.id, role: "MANAGER" },
  });
  await prisma.firmMember.upsert({
    where: { firmId_userId: { firmId: firm.id, userId: member.id } },
    update: { role: "MEMBER" },
    create: { firmId: firm.id, userId: member.id, role: "MEMBER" },
  });

  const project = existingProject ?? await prisma.project.create({
    data: {
      name: "Sample IT Project",
      description: "A sample project for demonstration",
      managerId: manager.id,
      firmId: firm.id,
      members: {
        create: [{ userId: member.id }],
      },
    },
  });

  if (!existingProject) {
    await prisma.task.createMany({
    data: [
      {
        title: "Design database schema",
        description: "Create ERD and migrations",
        status: "TODO",
        priority: "HIGH",
        projectId: project.id,
        assigneeId: member.id,
        position: 0,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Create API documentation",
        description: "OpenAPI/Swagger specs",
        status: "TODO",
        priority: "MEDIUM",
        projectId: project.id,
        position: 1,
      },
      {
        title: "Implement authentication",
        status: "IN_PROGRESS",
        priority: "HIGH",
        projectId: project.id,
        assigneeId: member.id,
        position: 0,
      },
      {
        title: "Setup CI/CD pipeline",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        projectId: project.id,
        position: 1,
      },
      {
        title: "Initial project setup",
        status: "DONE",
        priority: "MEDIUM",
        projectId: project.id,
        position: 0,
      },
    ],
  });
  }

  console.log("Seed completed. Users: admin@example.com, manager@example.com, member@example.com");
  console.log("Passwords: admin123, manager123, member123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
