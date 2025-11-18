import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import env from '@/lib/env';
import { UpdatePassword } from '@/components/account';
import ManageSessions from '@/components/account/ManageSessions';
import PageHeader from '@/components/navigation/PageHeader';

type SecurityProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Security = ({ sessionStrategy }: SecurityProps) => {
  return (
    <div className="p-6">
      <PageHeader
        title="Security"
        subtitle="Manage your password and active sessions"
        sticky
      />
      <div className="flex gap-10 flex-col">
        <UpdatePassword />
        {sessionStrategy === 'database' && <ManageSessions />}
      </div>
    </div>
  );
};

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  const { sessionStrategy } = env.nextAuth;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      sessionStrategy,
    },
  };
};

export default Security;
