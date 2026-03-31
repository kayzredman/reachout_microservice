"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    var _a;
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
    await app.listen((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3002);
}
bootstrap();
//# sourceMappingURL=main.js.map