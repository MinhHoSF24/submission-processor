import { SubmissionSchema } from "../models/submission.schema.js";
import type { S3Repository } from "../repositories/S3Repository.js";
import { logger } from "../utils/logger.js";

const submissionLogger = logger.child({ service: "SubmissionService" });

export class SubmissionService{
  constructor(private readonly s3Repository: S3Repository){}

  async processSubmission(rawMessageBody: string): Promise<void>{
    // 1. Nhận message từ SQS
    submissionLogger.info(`Processing submission from SQS message`);

    // 2. Parse JSON
    const parsedData = JSON.parse(rawMessageBody);
    submissionLogger.debug(`Parsed data: ${JSON.stringify(parsedData)}`);

    // 3. Validate theo SubmissionSchema
    const validatedData = SubmissionSchema.parse(parsedData);

    submissionLogger.debug(`Validated data: ${JSON.stringify(validatedData)}`);

    // 4. Lưu payload lên S3
    submissionLogger.info(`Saving submission for user ${validatedData.userId}`);

    const s3Key = await this.s3Repository.saveRawPayload(validatedData);

    if(!s3Key) {
      throw new Error("Failed to save submission to S3");
    }



    // 5. Hoàn tất
    submissionLogger.info(`Submission saved to S3: ${s3Key}`);
  }
}