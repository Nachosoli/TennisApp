import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If a property name is provided (e.g., 'id'), return that property
    if (data && user) {
      return user[data];
    }
    
    // Otherwise return the full user object
    return user;
  },
);

