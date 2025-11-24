import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(username: string, password: string) {
    const payload = { username, sub: username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}