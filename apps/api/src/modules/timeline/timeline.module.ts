import { Module } from "@nestjs/common";
import { CompositionService } from "./composition.service";
import { TimelineBuilderService } from "./timeline-builder.service";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { TimelineController } from "./timeline.controller";
import { TimelineItemsController } from "./timeline-items.controller";
import { TimelineService } from "./timeline.service";
import { TimelineTimingService } from "./timeline-timing.service";

@Module({
  controllers: [TimelineController, TimelineItemsController],
  providers: [
    TimelineService,
    TimelineBuilderService,
    TimelineTimingService,
    TimelineContinuityService,
    CompositionService,
  ],
  exports: [
    TimelineService,
    TimelineBuilderService,
    TimelineTimingService,
    TimelineContinuityService,
    CompositionService,
  ],
})
export class TimelineModule {}
