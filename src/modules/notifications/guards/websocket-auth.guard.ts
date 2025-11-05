import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { JwtPayload } from '@/modules/auth/strategies/jwt.strategy';
import { UserService } from '@/modules/user/services/user.service';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('guard canActivate');
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);
    console.log('token', token);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: jwtSecret,
      });

      if (payload.type !== 'access') {
        throw new WsException('Unauthorized: Invalid token type');
      }

      // Verify user exists and is active
      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new WsException('Unauthorized: User not found');
      }

      if (!user.isActive) {
        throw new WsException('Unauthorized: User account is inactive');
      }

      // Attach user info to socket
      client.data.userId = payload.sub;
      client.data.user = user;
      console.log('client.data', client.data);
      console.log('payload', payload);
      console.log('user', user);
      console.log('client', client);
      console.log('client.data', client.data);
      console.log('client.data.userId', client.data.userId);
      console.log('client.data.user', client.data.user);
      console.log('client.data.user.id', client.data.user.id);
      console.log('client.data.user.email', client.data.user.email);
      console.log('client.data.user.name', client.data.user.name);
      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Unauthorized: Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from query parameter
    const token = client.handshake.query?.token as string;
    if (token) {
      return token;
    }

    // Try to get token from authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      return authHeader.substring(7);
    }

    return null;
  }
}
