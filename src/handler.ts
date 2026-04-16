import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from "aws-lambda";
import { S3Repository } from "./repositories/S3Repository.js";
import { SubmissionService } from "./services/SubmissionService.js";
import { logger } from "./utils/logger.js";

const s3Repository = new S3Repository();
const submissionService = new SubmissionService(s3Repository);

/**
 * Lambda handler that receives an SQS event (batch).
 * Uses partial batch response: only failed records are reported; successful ones are deleted from the queue.
 */
export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    const msgLogger = logger.child({ correlationId: record.messageId });
    try {
      if (!record.body) {
        throw new Error("SQS record body is empty");
      }
      await submissionService.processSubmission(record.body);
      msgLogger.info("Record processed successfully");
    } catch (error) {
      msgLogger.error("Failed to process record", { error, messageId: record.messageId });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
