export class ApiResponseDto<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;

  constructor(data: T, meta?: Record<string, unknown>) {
    this.success = true;
    this.data = data;
    this.meta = meta;
  }
}
