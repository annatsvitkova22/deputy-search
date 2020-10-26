import { Controller, Post, Body } from '@nestjs/common';

import { AppService } from './app.service';
import { SearchModel, ResultSearch } from './app.models';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async getInformation(@Body() data: SearchModel): Promise<ResultSearch> {
    return await this.appService.searchAppeals(data.searchText);
  }
}
