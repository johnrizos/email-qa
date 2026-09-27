import { Module } from "@nestjs/common";
import { AnalyzeController } from "./analyze/analyze.controller.js";
import { AnalyzeService } from "./analyze/analyze.service.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [AnalyzeController, HealthController],
  providers: [AnalyzeService],
})
export class AppModule {}
