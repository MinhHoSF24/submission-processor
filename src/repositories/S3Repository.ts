import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Submission } from "../models/submission.schema.js";

export class S3Repository {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    // Khởi tạo S3 Client
    // 💡 Best Practice: Không hardcode Access Key/Secret Key ở đây.
    // Khi chạy trên AWS (EC2, ECS, Lambda), nó tự động lấy quyền từ IAM Role.
    // Khi chạy Local, nó tự đọc từ ~/.aws/credentials hoặc biến môi trường.
    this.client = new S3Client({
      region: process.env.AWS_REGION || "ap-southeast-1"
    });

    // Ném lỗi ngay lúc khởi động nếu quên cài biến môi trường
    if (!process.env.S3_BUCKET_NAME) {
      throw new Error("Missing S3_BUCKET_NAME environment variable");
    }
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  /**
   * Lưu payload thô dưới định dạng JSON với key: submissions/yyyy/mm/dd/uuid.json
   */
  async saveRawPayload(payload: Submission): Promise<string> {
    // 1. Sinh đường dẫn yyyy/mm/dd an toàn theo UTC
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    const objectKey = `submissions/${year}/${month}/${day}/${payload.userId}.json`;

    // 2. Định nghĩa Command
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: JSON.stringify(payload), // Chuyển Object thành chuỗi JSON
      ContentType: "application/json", // Giúp xem file dễ hơn trên giao diện AWS
    });

    // 3. Thực thi
    try {
      await this.client.send(command);
      console.log(`[S3] Upload thành công: s3://${this.bucketName}/${objectKey}`);
      return objectKey;
    } catch (error) {
      console.error(`[S3] Lỗi upload file ${objectKey}`, error);
      // Ném lỗi ra để tầng Use Case/Worker phía trên bắt và đẩy message vào DLQ
      throw error;
    }
  }
}