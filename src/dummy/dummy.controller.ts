import { Controller, Get } from '@nestjs/common';
import { DummyService } from './dummy.service';

@Controller('api/dummy')
export class DummyController {
    constructor(private readonly dummy: DummyService) {}

    @Get()
    fallback() {
        return this.dummy.getFallback();
    }
}
