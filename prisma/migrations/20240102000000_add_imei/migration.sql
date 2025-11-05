-- CreateTable
CREATE TABLE "imeis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imei" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "imeis_imei_key" ON "imeis"("imei");

