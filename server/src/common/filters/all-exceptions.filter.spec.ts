import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
    };
  });

  function createHost(exception: unknown) {
    return {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as any;
  }

  it('handles HttpException with string message', () => {
    const exc = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Bad Request',
      message: 'Custom error',
      statusCode: 400,
    });
  });

  it('handles HttpException with object response', () => {
    const exc = new BadRequestException([
      'email must be a valid email',
      'password too short',
    ]);
    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Bad Request',
      message: 'email must be a valid email; password too short',
      statusCode: 400,
    });
  });

  it('handles Mongoose ValidationError', () => {
    const exc = new MongooseError.ValidationError();
    exc.errors = {
      email: { message: 'Email is required' } as any,
      name: { message: 'Name is too short' } as any,
    };

    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Validation Error',
      message: 'Email is required, Name is too short',
      statusCode: 400,
    });
  });

  it('handles Mongoose CastError', () => {
    const exc = new MongooseError.CastError('ObjectId', 'bad-id', 'userId');

    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid ID',
      message: 'Invalid value for userId',
      statusCode: 400,
    });
  });

  it('handles MongoError duplicate key (code 11000)', () => {
    const exc = new Error('Duplicate key') as any;
    exc.code = 11000;

    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Duplicate Key',
      message: 'A resource with that value already exists',
      statusCode: 409,
    });
  });

  it('handles unknown errors with 500', () => {
    const exc = new Error('Something broke');

    filter.catch(exc, createHost(exc));

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });
});
