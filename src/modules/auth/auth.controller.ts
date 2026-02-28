import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }
}
