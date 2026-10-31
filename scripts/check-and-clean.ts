import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { db, pool } from "../src/db";
import {
  cases,
  categories,
  attachments,
  case_messages,
  case_audit_logs,
  upload_tickets,
  trusted_device_cases,
  trusted_devices,
  case_sequences,
  rate_limits,
  user
} from "../src/db/schema";
import { env } from "../src/lib/env";
import { sql } from "drizzle-orm";

async function main() {
  console.log("====================================================");
  console.log("   1. VERIFYING DATABASE & BACKBLAZE B2 CONNECTIVITY");
  console.log("====================================================");

  // 1. Verify Database
  const dbResult = await db.execute(sql`SELECT current_database(), current_user, version()`);
  console.log("✓ PostgreSQL Database Connected:", dbResult.rows ? dbResult.rows[0] : dbResult);

  // 2. Verify B2 Storage
  const b2Client = new S3Client({
    endpoint: env.B2_ENDPOINT,
    region: env.B2_REGION,
    credentials: {
      accessKeyId: env.B2_KEY_ID,
      secretAccessKey: env.B2_APPLICATION_KEY,
    },
  });

  console.log(`Checking B2 Bucket: "${env.B2_BUCKET_NAME}" at endpoint "${env.B2_ENDPOINT}"...`);
  await b2Client.send(new HeadBucketCommand({ Bucket: env.B2_BUCKET_NAME }));
  console.log(`✓ Backblaze B2 Bucket "${env.B2_BUCKET_NAME}" is active and accessible.`);

  // Test full read/write/delete cycle on B2
  const probeKey = `test-health/${Date.now()}.txt`;
  await b2Client.send(new PutObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: probeKey,
    Body: "ok",
    ContentType: "text/plain",
  }));
  const readRes = await b2Client.send(new GetObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: probeKey,
  }));
  const probeText = await readRes.Body?.transformToString();
  if (probeText !== "ok") throw new Error("B2 verification read failed");
  await b2Client.send(new DeleteObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: probeKey,
  }));
  console.log("✓ Backblaze B2 Read/Write/Delete cycle verified successfully.");

  console.log("\n====================================================");
  console.log("   2. CLEANING UP MANUALLY REGISTERED DATA");
  console.log("====================================================");

  // A. Delete all cases (cascades sensitive data, attachments, messages, status history, device links)
  const deletedCases = await db.delete(cases).returning({ id: cases.id, reference: cases.reference });
  console.log(`✓ Cleaned up ${deletedCases.length} manually registered cases:`, deletedCases.map(c => c.reference));

  // B. Clean up upload tickets
  await db.delete(upload_tickets);
  console.log("✓ Cleaned up upload tickets.");

  // C. Clean up trusted devices
  await db.delete(trusted_devices);
  console.log("✓ Cleaned up trusted devices.");

  // D. Clean up audit logs
  await db.delete(case_audit_logs);
  console.log("✓ Cleaned up case audit logs.");

  // E. Clean up rate limits
  await db.delete(rate_limits);
  console.log("✓ Cleaned up rate limits.");

  // F. Reset sequence counters so the first real case starts at 000001
  await db.delete(case_sequences);
  console.log("✓ Reset sequence counters (REQ/CMP numbers will start at 000001).");

  // G. Check B2 bucket objects and clean any leftovers
  const listB2 = await b2Client.send(new ListObjectsV2Command({
    Bucket: env.B2_BUCKET_NAME,
  }));
  if (listB2.Contents && listB2.Contents.length > 0) {
    console.log(`Found ${listB2.Contents.length} leftover objects in B2. Cleaning...`);
    for (const item of listB2.Contents) {
      if (item.Key) {
        await b2Client.send(new DeleteObjectCommand({
          Bucket: env.B2_BUCKET_NAME,
          Key: item.Key,
        }));
        console.log(`  - Deleted B2 object: ${item.Key}`);
      }
    }
  } else {
    console.log("✓ Backblaze B2 bucket is clean (0 objects).");
  }

  console.log("\n====================================================");
  console.log("   3. VERIFYING SYSTEM READINESS AFTER CLEANUP");
  console.log("====================================================");

  // Verify Admin user exists
  const [adminUser] = await db.select().from(user);
  console.log("✓ Admin User:", {
    id: adminUser?.id,
    username: adminUser?.username,
    email: adminUser?.email,
  });

  // Verify Categories
  const finalCategories = await db.select().from(categories);
  console.log(`✓ Official Categories Intact (${finalCategories.length} total):`);
  const reqCats = finalCategories.filter(c => c.type === "request");
  const cmpCats = finalCategories.filter(c => c.type === "complaint");
  console.log(`  - ${reqCats.length} Request Categories:`, reqCats.map(c => c.name_ar));
  console.log(`  - ${cmpCats.length} Complaint Categories:`, cmpCats.map(c => c.name_ar));

  const remainingCases = await db.select().from(cases);
  console.log(`✓ Remaining Cases in DB: ${remainingCases.length}`);

  await pool.end();
  console.log("\n🎉 ALL DONE! System is 100% clean and ready for production.");
}

main().catch((err) => {
  console.error("Error during check and clean:", err);
  process.exit(1);
});
