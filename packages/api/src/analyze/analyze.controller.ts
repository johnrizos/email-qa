import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  ParseBoolPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AnalyzeService, MAX_HTML_BYTES } from "./analyze.service.js";

interface AnalyzeBody {
  html?: unknown;
  checkLinks?: unknown;
}

@Controller()
export class AnalyzeController {
  constructor(@Inject(AnalyzeService) private readonly service: AnalyzeService) {}

  @Get("rules")
  rules() {
    return this.service.listRules();
  }

  @Post("analyze")
  @HttpCode(200)
  analyze(@Body() body: AnalyzeBody | undefined) {
    if (typeof body?.html !== "string" || body.html.trim() === "") {
      throw new BadRequestException('Send the template as a non-empty "html" string.');
    }
    return this.service.analyze(body.html, { checkLinks: body.checkLinks === true });
  }

  @Post("analyze/upload")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_HTML_BYTES } }))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query("checkLinks", new ParseBoolPipe({ optional: true })) checkLinks?: boolean,
  ) {
    if (!file) throw new BadRequestException('Upload the template in a "file" field.');
    if (!/\.html?$/i.test(file.originalname)) {
      throw new BadRequestException("Only .html and .htm files are accepted.");
    }
    return this.service.analyze(file.buffer.toString("utf8"), { checkLinks: checkLinks ?? false });
  }
}
