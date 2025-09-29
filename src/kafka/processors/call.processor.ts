import { Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../entities/call.entity';

@Injectable()
@Processor('call-queue')
export class CallProcessor {
  constructor(private readonly callRepository: CallRepository) {}

  @Process('process-call')
  async handleCallProcessing(job: Job<any>) {
    console.log(`Processing call job ${job.id}`);
    const { data } = job;

    try {
      const call = await this.callRepository.createCall({
        callerId: data.callerId,
        recipientId: data.recipientId,
        status: 'processing',
        metadata: data.metadata || {},
      });

      await this.simulateCallProcessing(call);

      await this.callRepository.updateCallStatus(call.id, 'completed');

      console.log(`Call ${call.id} processed successfully`);
      return { success: true, callId: call.id };
    } catch (error) {
      console.error(`Failed to process call job ${job.id}:`, error);
      throw error;
    }
  }

  private async simulateCallProcessing(call: Call): Promise<void> {
    const processingTime = Math.random() * 3000 + 1000;
    await new Promise((resolve) => setTimeout(resolve, processingTime));

    const duration = Math.floor(Math.random() * 300) + 30;
    await this.callRepository.update(call.id, { duration });
  }
}
