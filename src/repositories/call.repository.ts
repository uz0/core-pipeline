import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Call } from '../entities/call.entity';

@Injectable()
export class CallRepository extends Repository<Call> {
  constructor(private dataSource: DataSource) {
    super(Call, dataSource.createEntityManager());
  }

  async findAllCalls(): Promise<Call[]> {
    return this.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findCallById(id: string): Promise<Call | null> {
    return this.findOne({
      where: { id },
    });
  }

  async createCall(callData: Partial<Call>): Promise<Call> {
    const call = this.create(callData);
    return this.save(call);
  }

  async updateCallStatus(id: string, status: string): Promise<Call | null> {
    const call = await this.findCallById(id);
    if (!call) {
      return null;
    }
    call.status = status;
    return this.save(call);
  }

  async findCallsByStatus(status: string): Promise<Call[]> {
    return this.find({
      where: { status },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findRecentCalls(limit = 10): Promise<Call[]> {
    return this.find({
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }
}
