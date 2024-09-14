import {
  Controller,
} from '@nestjs/common';
import { BaseLaudspeakerService } from '@/common/services/base.laudspeaker.service';

@Controller('sms')
export class SmsController extends BaseLaudspeakerService {
  constructor(
  ) {
    super();
  }
}
