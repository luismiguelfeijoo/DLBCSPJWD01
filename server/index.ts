import Fastify from 'fastify';
import mongoosePlugin from './plugins/mongoose-plugin/index.ts';
import cors from '@fastify/cors';
import userRoutes from './routes/users.ts';

process.loadEnvFile();

const fastify = Fastify({
  logger: {
    transport: {
      target: '@fastify/one-line-logger'
    }
  }
});

fastify.register(cors, {
  // Only allow your Angular frontend to access the resources
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.register(mongoosePlugin, { url: process.env.MONGODB_URI });

fastify.register(userRoutes, { prefix: '/users' });

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
