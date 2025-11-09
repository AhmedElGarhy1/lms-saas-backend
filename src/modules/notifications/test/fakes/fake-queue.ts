import { Job, JobsOptions } from 'bullmq';
import { NotificationJobData } from '../../types/notification-job-data.interface';

/**
 * Fake BullMQ Queue implementation with in-memory state
 * Used for testing to inspect queue state and assert job enqueueing
 */
export class FakeQueue {
  private jobs: Map<string, Job<NotificationJobData>> = new Map();
  private jobCounter = 0;

  async add(
    name: string,
    data: NotificationJobData,
    opts?: JobsOptions,
  ): Promise<Job<NotificationJobData>> {
    const jobId = `job-${++this.jobCounter}`;
    const job = {
      id: jobId,
      name,
      data,
      opts: opts || {},
      attemptsMade: 0,
    } as Job<NotificationJobData>;

    this.jobs.set(jobId, job);
    return job;
  }

  async addBulk(
    jobs: Array<{
      name: string;
      data: NotificationJobData;
      opts?: JobsOptions;
    }>,
  ): Promise<Job<NotificationJobData>[]> {
    return Promise.all(
      jobs.map((job) => this.add(job.name, job.data, job.opts)),
    );
  }

  getJob(id: string): Job<NotificationJobData> | undefined {
    return this.jobs.get(id);
  }

  getJobs(): Job<NotificationJobData>[] {
    return Array.from(this.jobs.values());
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  getJobsByChannel(channel: string): Job<NotificationJobData>[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.data.channel === channel,
    );
  }

  getJobsByType(type: string): Job<NotificationJobData>[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.data.type === type,
    );
  }

  clear(): void {
    this.jobs.clear();
    this.jobCounter = 0;
  }
}



