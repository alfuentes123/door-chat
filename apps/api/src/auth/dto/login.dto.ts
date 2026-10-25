import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(1, 30)
  username: string;
 
  @IsString()
  @Length(1, 100)
  password: string;
}
