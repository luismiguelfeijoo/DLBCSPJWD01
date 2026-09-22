import type { FastifyPluginCallback } from 'fastify';
import { User } from '../models/user.ts';
import { isObjectIdOrHexString } from 'mongoose';

const userRoutes: FastifyPluginCallback = (fastify, _) => {
  fastify.get('/', async (request, reply) => {
    const users = await User.find();
    reply.code(200).send(users);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isObjectIdOrHexString(id)) {
      fastify.log.warn('Provided id is not valid');
      return reply.code(400).send();
    }
    const user = await User.findById(id);
    if (!user) {
      return reply.code(404).send();
    }
    return reply.code(200).send(user);
  });

  fastify.patch<{ Params: { id: string }; Body: { baseCurrency: string } }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { baseCurrency } = request.body;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send();
      }
      const user = await User.findById(id);
      if (!user) {
        return reply.code(404).send();
      }
      user.baseCurrency = baseCurrency;
      await user.save();
      return reply.code(200).send(user);
    },
  );
};

export default userRoutes;
