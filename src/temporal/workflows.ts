import { proxyActivities } from '@temporalio/workflow';
import type { ActivityTypes } from './activities';

const activities = proxyActivities<ActivityTypes>({
  startToCloseTimeout: '1 minute',
  retry: {
    maximumAttempts: 3,
  },
});

export async function sendEmailWorkflow(emails: string[]): Promise<void> {
  await Promise.all(
    emails.map((email) =>
      activities.sendEmail(email).catch((error) => {
        console.error(`Failed to send email to ${email}:`, error);
      }),
    ),
  );
}

export async function readInboxWorkflow(): Promise<any> {
  await activities.readInbox().catch((error) => {
    console.error(`Failed to send email to ${error.message}:`);
  });
}