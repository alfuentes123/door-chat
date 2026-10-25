import { IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/)
  username: string;
 
  @IsString()
  @Length(1, 50)
  displayName: string;
 
  @IsString()
  @Length(8, 100)
  password: string;
}
