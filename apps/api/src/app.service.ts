import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome(): { message: string } {
    return { message: "DoorChat API is running!" };
  }
}
