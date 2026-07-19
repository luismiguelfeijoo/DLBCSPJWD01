import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import mongoose from 'mongoose';

declare module 'fastify' {
  interface FastifyInstance {
    mongoose: typeof mongoose;
  }
}

const mongoosePlugin: FastifyPluginAsync<{ url: string | undefined }> = async (
  fastify,
  opts
) => {
  if (!opts.url) {
    throw new Error('Unable to connect to DB');
  }
  await mongoose.connect(opts.url);
  fastify.decorate('mongoose', mongoose);
};

export default fp(mongoosePlugin);
