// One-off (14.11.2026): attaches the receipt photos the team added to the Google
// Sheet to the expenses imported from it (importKey xlsx1:<sheet>:E<row>).
// Photos are compressed exactly like the Telegram bot does (compressReceipt in
// src/lib/storage.ts) and stored as private files (isPublic=false).
//
// Safe to re-run: an expense that already has any file is skipped, and so is a
// photo whose sha256 is already stored. Dry run unless --apply is given.
//
// Run inside the bot container (it has sharp, Prisma and the uploads volume):
//   docker compose --env-file .env.production -p whiskers cp <dir-with-photos-and-this-folder> bot:/tmp/receipts
//   docker compose --env-file .env.production -p whiskers exec -T -w /app bot node /tmp/receipts/attach.mjs /tmp/receipts/raw [--apply]
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const { PrismaClient } = require("@prisma/client");

const [photoDir, flag] = process.argv.slice(2);
const apply = flag === "--apply";
if (!photoDir) throw new Error("usage: attach.mjs <photo dir> [--apply]");
const mapping = JSON.parse(await readFile(new URL("./mapping.json", import.meta.url), "utf8"));
const root = path.resolve(process.env.STORAGE_DIR ?? "/data/uploads");
const db = new PrismaClient();

async function compress(data) {
  const out = await sharp(data, { failOn: "error" })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  return out.length < data.length ? { data: out, ext: "webp", mime: "image/webp" } : { data, ext: "jpg", mime: "image/jpeg" };
}

const written = [];
let ok = 0, skipped = 0, problems = 0;
try {
  for (const m of mapping) {
    const tag = `${m.importKey} ${m.date} ${m.amountRsd} «${m.description}»`;
    const e = await db.expense.findUnique({
      where: { importKey: m.importKey },
      select: { id: true, date: true, amountRsd: true, description: true, internalComment: true, proof: true, _count: { select: { files: true } } },
    });
    if (!e) { console.log(`MISSING  ${tag}: no such expense`); problems++; continue; }
    const sameRow = e.amountRsd === m.amountRsd && e.date.toISOString().slice(0, 10) === m.date;
    // Rows imported with a receipt link must point at the same Drive file; rows
    // that had no link yet («найти чек») have none in the comment.
    const oldLink = (e.internalComment ?? "").match(/file\/d\/([A-Za-z0-9_-]+)/)?.[1];
    const sameLink = !oldLink || oldLink === m.driveId;
    if (!sameRow || !sameLink) {
      console.log(`MISMATCH ${tag}: db has ${e.date.toISOString().slice(0, 10)} ${e.amountRsd} «${e.description}» link ${oldLink ?? "none"}`);
      problems++; continue;
    }
    if (e._count.files > 0) { console.log(`SKIP     ${tag}: already has ${e._count.files} file(s)`); skipped++; continue; }
    const raw = await readFile(path.join(photoDir, m.file));
    const small = await compress(raw);
    const sha256 = createHash("sha256").update(small.data).digest("hex");
    if (await db.storedFile.findFirst({ where: { sha256 }, select: { id: true } })) { console.log(`SKIP     ${tag}: same photo already stored`); skipped++; continue; }
    console.log(`${apply ? "ATTACH  " : "WOULD   "} ${tag} <- ${m.name} (${Math.round(raw.length / 1024)} KB -> ${Math.round(small.data.length / 1024)} KB)`);
    if (!apply) { ok++; continue; }
    const storageKey = `files/2026/11/${randomUUID()}.${small.ext}`;
    const full = path.join(root, storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, small.data, { flag: "wx" });
    written.push(full);
    await db.$transaction(async (tx) => {
      const f = await tx.storedFile.create({
        data: { storageKey, mime: small.mime, sizeBytes: small.data.length, sha256, originalName: m.name.replace(/\.[^.]+$/, "") + "." + small.ext },
      });
      await tx.expenseFile.create({ data: { expenseId: e.id, fileId: f.id, isPublic: false } });
      if (e.proof === "NONE") await tx.expense.update({ where: { id: e.id }, data: { proof: "DOCUMENT", noReceiptReason: null } });
      await tx.auditEvent.create({
        data: { actorId: null, action: "expense.receipt.attach", entityType: "Expense", entityId: e.id, after: { fileId: f.id, storageKey, source: "google-sheet", driveId: m.driveId, via: "script 2026-11-14" }, ip: null },
      });
    });
    written.pop();
    ok++;
  }
} catch (err) {
  for (const f of written) await rm(f, { force: true });
  throw err;
} finally {
  await db.$disconnect();
}
console.log(`\n${apply ? "attached" : "would attach"}: ${ok}, skipped: ${skipped}, problems: ${problems}`);
if (problems) process.exitCode = 1;
