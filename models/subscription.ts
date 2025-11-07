import { prisma } from '@/lib/prisma';
import { Subscription } from '@prisma/client';

export const createStripeSubscription = async ({
  customerId,
  id,
  active,
  startDate,
  endDate,
  priceId,
  maxItemsUnderManagement,
}: {
  customerId: string;
  id: string;
  active: boolean;
  startDate: Date;
  endDate: Date;
  priceId: string;
  maxItemsUnderManagement?: number | null;
}) => {
  return await prisma.subscription.create({
    data: {
      customerId,
      id,
      active,
      startDate,
      endDate,
      priceId,
      maxItemsUnderManagement,
    },
  });
};

export const deleteStripeSubscription = async (id: string) => {
  return await prisma.subscription.deleteMany({
    where: {
      id,
    },
  });
};

export const updateStripeSubscription = async (id: string, data: any) => {
  return await prisma.subscription.update({
    where: {
      id,
    },
    data,
  });
};

export const getByCustomerId = async (customerId: string) => {
  return await prisma.subscription.findMany({
    where: {
      customerId,
    },
  });
};

export const getBySubscriptionId = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  return await prisma.subscription.findUnique({
    where: {
      id: subscriptionId,
    },
  });
};
