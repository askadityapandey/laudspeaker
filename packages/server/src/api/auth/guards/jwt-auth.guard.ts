import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	handleRequest(err, user, info) {
	  // You can throw an exception based on either "info" or "err" arguments
	  console.log(`JwtAuthGuard ERR: ${JSON.stringify(err)}, USER: ${JSON.stringify(user)}, INFO: ${JSON.stringify(info)}`);
	  if (err || !user) {
	    throw err || new UnauthorizedException();
	  }
	  return user;
	}
}
