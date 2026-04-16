import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Submission } from "../models/submission.schema.js";

export class S3Repository {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    // On AWS (EC2, ECS, Lambda), credentials are resolved automatically via IAM Role.
    // Locally, they are read from ~/.aws/credentials or environment variables.
    this.client = new S3Client({
      region: process.env.AWS_REGION || "ap-southeast-1"
    });

    if (!process.env.S3_BUCKET_NAME) {
      throw new Error("Missing S3_BUCKET_NAME environment variable");
    }
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  /**
   * Save raw payload as JSON with key: submissions/yyyy/mm/dd/uuid.json
   */
  async saveRawPayload(payload: Submission): Promise<string> {
    // 1. Build a UTC-safe yyyy/mm/dd path
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    const objectKey = `submissions/${year}/${month}/${day}/${payload.userId}.json`;

    // 2. Build the PutObject command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
    });

    // 3. Execute
    try {
      await this.client.send(command);
      console.log(`[S3] Upload succeeded: s3://${this.bucketName}/${objectKey}`);
      return objectKey;
    } catch (error) {
      console.error(`[S3] Failed to upload ${objectKey}`, error);
      throw error;
    }
  }
}
