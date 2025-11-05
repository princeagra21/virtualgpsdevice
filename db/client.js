"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClient = getPrismaClient;
exports.disconnectPrisma = disconnectPrisma;
const client_1 = require("@prisma/client");
let prisma;
function getPrismaClient() {
    if (!prisma) {
        prisma = new client_1.PrismaClient();
    }
    return prisma;
}
async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
    }
}
