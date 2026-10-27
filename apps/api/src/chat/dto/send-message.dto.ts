import { IsString, IsUUID, Length } from "class-validator";

export class SendMessageDto {
  @IsUUID()
  recipientId: string;
 
  @IsUUID()
  clientMessageId: string;
 
  @IsString()
  @Length(1, 2000)
  content: string;
}
