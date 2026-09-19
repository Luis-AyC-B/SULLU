/* eslint-disable */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ExcludePasswordInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.recursivelyRemovePassword(data)),
    );
  }

  private recursivelyRemovePassword(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.recursivelyRemovePassword(item));
    }

    const newObj = { ...obj };
    if ('password' in newObj) {
      delete newObj.password;
    }
    if ('password_hash' in newObj) {
      delete newObj.password_hash;
    }

    for (const key of Object.keys(newObj)) {
      if (typeof newObj[key] === 'object') {
        newObj[key] = this.recursivelyRemovePassword(newObj[key]);
      }
    }

    return newObj;
  }
}
