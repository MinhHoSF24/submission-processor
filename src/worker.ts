import "dotenv/config";

import type { Message } from "@aws-sdk/client-sqs";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Consumer } from "sqs-consumer";
import { S3Repository } from "./repositories/S3Repository.js";
import { SubmissionService } from "./services/SubmissionService.js";
import { logger } from "./utils/logger.js";

/**
 * Ưu tiên `SQS_QUEUE_URL` (local / ECS env).
 * Nếu không có, đọc URL từ Parameter Store qua `SQS_QUEUE_URL_PARAMETER`.
 */
async function resolveSqsQueueUrl(): Promise<string> {
  const direct = process.env.SQS_QUEUE_URL?.trim();
  if (direct) {
    return direct;
  }

  const parameterName = process.env.SQS_QUEUE_URL_PARAMETER?.trim();
  if (!parameterName) {
    throw new Error(
      "Thiếu SQS_QUEUE_URL hoặc SQS_QUEUE_URL_PARAMETER trong biến môi trường"
    );
  }

  const region = process.env.AWS_REGION || "ap-southeast-1";
  const ssm = new SSMClient({ region });
  const out = await ssm.send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    })
  );
  const url = out.Parameter?.Value?.trim();
  if (!url) {
    throw new Error(`SSM parameter "${parameterName}" không có giá trị`);
  }
  return url;
}

async function main(): Promise<void> {
  const queueUrl = await resolveSqsQueueUrl();

  const s3Repository = new S3Repository();
  const submissionService = new SubmissionService(s3Repository);

  const app = Consumer.create({
    queueUrl,
    // Mặc định shouldDeleteMessages: true. Chỉ khi handleMessage trả về đúng Message (cùng MessageId)
    // thì consumer mới gọi DeleteMessage — return undefined sẽ KHÔNG xóa khỏi queue.
    shouldDeleteMessages: true,
    handleMessage: async (message: Message): Promise<Message> => {
      const correlationId = message.MessageId ?? "unknown";
      const msgLogger = logger.child({ correlationId });

      try {
        const body = message.Body;
        if (body == null || body === "") {
          throw new Error("SQS message body is empty");
        }
        await submissionService.processSubmission(body);
        return message;
      } catch (error) {
        msgLogger.error("Lỗi xử lý message", {
          error,
          messageId: message.MessageId ?? "unknown",
        });
        throw error;
      }
    },
  });

  app.on("error", (err) => logger.error(err.message));
  app.start();
  logger.info("Submission Worker is running...");
}

main().catch((err: unknown) => {
  logger.error("Worker không khởi động được", { err });
  process.exit(1);
});
