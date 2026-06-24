import { ResponseTransformInterceptor } from './response-transform.interceptor';
import { ApiResponseDto } from '../dto/api-response.dto';
import { of } from 'rxjs';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseTransformInterceptor();
  });

  function createContext() {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as any;
  }

  it('wraps plain objects in ApiResponseDto', (done) => {
    const callHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(createContext(), callHandler).subscribe({
      next: (result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ id: 1, name: 'test' });
        done();
      },
    });
  });

  it('wraps arrays in ApiResponseDto', (done) => {
    const callHandler = {
      handle: () => of([1, 2, 3]),
    };

    interceptor.intercept(createContext(), callHandler).subscribe({
      next: (result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.success).toBe(true);
        expect(result.data).toEqual([1, 2, 3]);
        done();
      },
    });
  });

  it('wraps strings in ApiResponseDto', (done) => {
    const callHandler = {
      handle: () => of('hello'),
    };

    interceptor.intercept(createContext(), callHandler).subscribe({
      next: (result) => {
        expect(result).toBeInstanceOf(ApiResponseDto);
        expect(result.success).toBe(true);
        expect(result.data).toBe('hello');
        done();
      },
    });
  });

  it('passes through existing ApiResponseDto', (done) => {
    const existing = new ApiResponseDto({ msg: 'already wrapped' });
    const callHandler = {
      handle: () => of(existing),
    };

    interceptor.intercept(createContext(), callHandler).subscribe({
      next: (result) => {
        expect(result).toBe(existing);
        done();
      },
    });
  });
});
