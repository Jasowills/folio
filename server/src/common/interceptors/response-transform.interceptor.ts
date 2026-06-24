import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T> | StreamableFile>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof ApiResponseDto) return data;
        if (data instanceof StreamableFile) return data;
        return new ApiResponseDto(data);
      }),
    );
  }
}
