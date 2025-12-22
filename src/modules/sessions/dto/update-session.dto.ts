import { OmitType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

export class UpdateSessionDto extends OmitType(CreateSessionDto, [
  'groupId',
] as const) {}
