import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/common/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.$queryRaw<any[]>`
      SELECT id, email, name, role, "tenantId", "passwordHash", "isActive"
      FROM "User"
      WHERE email = ${dto.email}
      LIMIT 1
    `;

    if (!user || user.length === 0) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const foundUser = user[0];

    if (!foundUser.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const passwordMatch = await bcrypt.compare(dto.password, foundUser.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: foundUser.id,
      userId: foundUser.id,
      email: foundUser.email,
      tenantId: foundUser.tenantId,
      role: foundUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        tenantId: foundUser.tenantId,
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$queryRaw<any[]>`
      INSERT INTO "User" (email, "passwordHash", name, role, "tenantId", "isActive", "createdAt", "updatedAt")
      VALUES (
        ${dto.email},
        ${passwordHash},
        ${dto.name},
        ${dto.role ?? 'OPERATOR'}::"UserRole",
        ${dto.tenantId},
        true,
        NOW(),
        NOW()
      )
      RETURNING id, email, name, role, "tenantId"
    `;

    const newUser = user[0];

    const payload = {
      sub: newUser.id,
      userId: newUser.id,
      email: newUser.email,
      tenantId: newUser.tenantId,
      role: newUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tenantId: newUser.tenantId,
      },
    };
  }
}
