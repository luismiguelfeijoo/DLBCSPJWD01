import type { FastifyPluginCallback } from 'fastify';
import { isObjectIdOrHexString } from 'mongoose';
import { Transaction } from '../models/transaction.ts';
import { User } from '../models/user.ts';

const userRoutes: FastifyPluginCallback = (fastify, _) => {
  fastify.get('/', async (request, reply) => {
    const users = await User.find();
    reply.code(200).send(users);
  });

  // This route is using the typing on the function definition
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

  fastify.get<{ Params: { id: string } }>('/:id/currencies', async (request, reply) => {
    const { id } = request.params;
    if (!isObjectIdOrHexString(id)) {
      fastify.log.warn('Provided id is not valid');
      return reply.code(400).send();
    }
    const user = await User.findById(id);
    if (!user) {
      return reply.code(404).send();
    }
    const currencyCodes = await Transaction.distinct('currency', {
      userId: user._id,
    });
    return reply.code(200).send(currencyCodes);
  });
};

export default userRoutes;
