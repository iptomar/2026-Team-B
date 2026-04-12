import { Controller, Get, Route } from "tsoa";

@Route("ping")
export class PingController extends Controller {
  @Get("/")
  public async getMessage(): Promise<{ message: string }> {
    return {
      message: "pong"
    };
  }
}
