import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { checkErrorType } from './helpers/checkErrorType.helper';
import { GlobalResponseError } from './helpers/errorResponse.formatter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost, // private readonly logger: LoggerService,
  ) {}

  catch(exception: Error, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.

    // console.log('TESTTESTTEST');
    const { httpAdapter } = this.httpAdapterHost;
    // const ctx = host.switchToHttp();

    // const path = httpAdapter.getRequestUrl(ctx.getRequest());
    // const method = httpAdapter.getRequestMethod(ctx.getRequest());

    // const { status, message, stack } = checkErrorType(exception);
    // const errRespBody = GlobalResponseError(
    //   status,
    //   message,
    //   path,
    //   method,
    //   stack,
    // );

    // const response = ctx.getResponse();
    // response.locals.errResp = errRespBody;
    // httpAdapter.reply(response, errRespBody, status);
  }
}
