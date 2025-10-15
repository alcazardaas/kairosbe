import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { MyProjectsController } from './my-projects.controller';
import { ProjectsService } from './projects.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [ProjectsController, MyProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
