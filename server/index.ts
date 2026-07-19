import Fastify from 'fastify';
import mongoosePlugin from './plugins/mongoose-plugin/index.ts';
import { User } from './models/user.ts';

process.loadEnvFile();

const fastify = Fastify({
  logger: {
    transport: {
      target: '@fastify/one-line-logger'
    }
  }
});

fastify.register(mongoosePlugin, { url: process.env.MONGODB_URI });

fastify.get('/users', async () => {
  const users = await User.find();
  return users;
});

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
