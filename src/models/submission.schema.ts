import { z } from "zod";

export const SubmissionSchema = z.object({
  userId: z.uuid(),
  dataPayload: z.any(),
  submittedAt: z.iso.datetime(),
});

export type Submission = z.infer<typeof SubmissionSchema>;