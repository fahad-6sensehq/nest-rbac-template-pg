import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    try {
        const app = await NestFactory.create(AppModule, { cors: true, logger: ['log', 'error', 'warn'] });

        const configService = app.get(ConfigService);

        const serverType = configService.getOrThrow('SERVER_TYPE');
        const port = parseInt(configService.getOrThrow('PORT', '9000'), 10);

        const cookieParser = require('cookie-parser').default || require('cookie-parser');
        const compression = require('compression').default || require('compression');

        app.useGlobalPipes(new ValidationPipe());
        app.use(cookieParser());
        app.use(compression());
        app.enableCors();

        const config = new DocumentBuilder().setTitle('RBAC').setVersion('1.0').build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('xyz', app, document);

        await app.listen(port);

        console.log(`
    ================================
    🚀 Application Configuration 🚀
    ================================
          PORT         : ${port}
          Server Type  : ${serverType}
    ================================
    `);
    } catch (error) {
        console.error(`❌ Application startup aborted due to ${error?.message}`);
        process.exit(1);
    }
}

bootstrap();
